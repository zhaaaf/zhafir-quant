"""
Autonomous Portfolio Pipeline — runs at 08:45 and 15:45 WIB.

Pipeline (fully automatic, no manual watchlist needed):
  1. Screen universe  → composite scoring (F-Score, Graham, Momentum, Technical)
  2. Pick top-N       → by composite score
  3. Optimize         → chosen model (Markowitz, CVaR, RMT, Entropy)
  4. Push ntfy        → allocation + signals + portfolio metrics
"""
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
import asyncio, pytz, traceback
from datetime import datetime

import store, notifier
from data.fetcher import fetch_batch_info_parallel, fetch_price_history, compute_stats
from data.universe import UNIVERSES
from models.stock_scoring import (
    piotroski_f_score, graham_number, altman_z_score,
    momentum_score, rsi, bollinger_position, composite_score, score_label,
)
from models.signals import generate_signal
from models.markowitz import maximize_sharpe, compute_efficient_frontier
from models.cvar import minimize_cvar
from models.rmt import clean_covariance_matrix
from models.entropy import maximize_entropy_portfolio
from models.quantum import quantum_portfolio_optimize
import numpy as np

WIB = pytz.timezone("Asia/Jakarta")
scheduler = AsyncIOScheduler(timezone=WIB)

SIGNAL_EMOJI = {"BUY": "🟢", "SELL": "🔴", "HOLD": "🟡", "WATCH": "🔵", "ERROR": "⚪"}


# ── Core pipeline (sync — runs in thread) ───────────────────────────────────

def _score_tickers(tickers: list[str], period: str, schema: str,
                   prices_df) -> list[dict]:
    """Score each ticker using all mathematical models. Uses batch price data."""
    scored = []
    for ticker in tickers:
        try:
            if ticker not in prices_df.columns:
                continue
            series = prices_df[ticker].dropna()
            if len(series) < 20:
                continue

            # Pull cached info (already fetched in batch)
            from data.fetcher import _cache_get
            info = _cache_get(ticker) or {}

            f   = piotroski_f_score(info)
            gn  = graham_number(info)
            az  = altman_z_score(info)
            mom = momentum_score(series, period)
            rsi_v = rsi(series)
            bb  = bollinger_position(series)
            comp = composite_score(info, f, gn, az, mom, rsi_v, bb)
            sig  = generate_signal(series, schema)

            scored.append({
                "symbol":          ticker,
                "name":            info.get("name", ticker),
                "composite_score": comp,
                "score_label":     score_label(comp),
                "signal":          sig["signal"],
                "rsi":             rsi_v,
                "f_score":         f["score"],
                "f_max":           f["max"],
                "mos":             gn.get("margin_of_safety"),
                "momentum_3m":     mom.get("momentum_3m"),
                "current_price":   info.get("current_price"),
                "currency":        info.get("currency", ""),
            })
        except Exception:
            pass

    scored.sort(key=lambda x: x.get("composite_score", 0), reverse=True)
    return scored


def _optimize(tickers: list[str], model: str, period: str) -> dict | None:
    """Run portfolio optimization on selected tickers."""
    try:
        prices = fetch_price_history(tickers, period=period)
        prices = prices.dropna(axis=1, thresh=int(len(prices) * 0.8))
        if prices.shape[1] < 2:
            return None
        stats  = compute_stats(prices)
        mu     = stats["mean_returns"].values
        cov    = stats["cov_matrix"].values
        rets   = stats["returns"].values
        valid  = prices.columns.tolist()

        if model == "markowitz":
            result = maximize_sharpe(mu, cov)
        elif model == "rmt":
            clean_cov, _ = clean_covariance_matrix(rets)
            result = maximize_sharpe(mu, clean_cov)
        elif model == "cvar":
            result = minimize_cvar(rets, mu, float(np.mean(mu)))
        elif model == "entropy":
            result = maximize_entropy_portfolio(mu, cov)
        elif model == "quantum":
            result = quantum_portfolio_optimize(mu, cov)
        else:
            result = maximize_sharpe(mu, cov)

        result["tickers"]     = valid
        result["weights_map"] = {t: round(float(w), 4)
                                 for t, w in zip(valid, result.get("weights", []))}
        return result
    except Exception:
        return None


def _fmt_price(s: dict) -> str:
    p   = s.get("current_price")
    cur = "Rp" if s.get("currency") == "IDR" else "$"
    return f"{cur}{p:,.0f}" if p else "—"


def _build_notification(session: str, cfg: dict) -> tuple[str, str]:
    """Full pipeline: screen → score → optimize → format."""
    universe_name = cfg.get("universe", "IDX LQ45")
    top_n         = int(cfg.get("top_n", 8))
    schema        = cfg.get("schema", "swing")
    model         = cfg.get("model", "markowitz")
    period        = cfg.get("period", "1y")
    use_watchlist = cfg.get("use_watchlist", False)
    watchlist     = cfg.get("watchlist", [])

    now_wib = datetime.now(WIB).strftime("%d %b %Y %H:%M WIB")

    # ── 1. Determine tickers ──
    if use_watchlist and watchlist:
        tickers = watchlist
        source_label = f"Watchlist ({len(tickers)} stocks)"
    else:
        tickers = UNIVERSES.get(universe_name, [])
        source_label = f"{universe_name}"

    if not tickers:
        return "⚠️ No tickers", "Configure universe or watchlist in Schedule settings."

    # ── 2. Fetch info (parallel, cached after first run) ──
    all_info = fetch_batch_info_parallel(tickers, max_workers=10)

    # ── 3. Batch price download (ONE yfinance call for all tickers) ──
    prices_df = fetch_price_history(tickers, period=period)

    # ── 4. Score all tickers ──
    scored = _score_tickers(tickers, period, schema, prices_df)
    top    = scored[:top_n]

    if not top:
        return "⚠️ Scoring failed", "No stocks could be scored. Check data availability."

    top_tickers = [s["symbol"] for s in top]

    # ── 5. Optimize ──
    opt = _optimize(top_tickers, model, period) if len(top_tickers) >= 2 else None

    # ── 6. Format notification ──
    is_morning = session == "morning"
    header     = f"{'🌅 Opening' if is_morning else '🌆 Closing'} | {now_wib}\n"
    header    += f"Universe: {source_label} · Top {len(top)} · {model.upper()}\n"
    header    += "─" * 32

    lines = [header, ""]

    # Portfolio allocation (if optimization succeeded)
    if opt and opt.get("weights_map"):
        lines.append("📊 Portfolio Allocation:")
        alloc_sorted = sorted(opt["weights_map"].items(), key=lambda x: -x[1])
        for sym, w in alloc_sorted:
            if w < 0.005:
                continue
            stock_data = next((s for s in top if s["symbol"] == sym), {})
            sig_emoji  = SIGNAL_EMOJI.get(stock_data.get("signal", ""), "⚪")
            rsi_str    = f"RSI {stock_data['rsi']:.0f}" if stock_data.get("rsi") else ""
            lines.append(f"  {sig_emoji} {sym:<10} {w*100:>5.1f}%  {rsi_str}")
        lines.append("")
        lines.append(f"  Return: {opt.get('expected_return', 0)*100:+.1f}% ann.")
        lines.append(f"  Vol:    {opt.get('volatility', 0)*100:.1f}%  |  Sharpe: {opt.get('sharpe_ratio', 0):.2f}")
        lines.append("")

    # Top picks by score
    lines.append(f"⚗ Top Picks ({schema} schema):")
    for i, s in enumerate(top[:5], 1):
        sig_emoji  = SIGNAL_EMOJI.get(s.get("signal", ""), "⚪")
        score_str  = f"{s['composite_score']:.0f}/100"
        mom_str    = f"{s['momentum_3m']:+.1f}% 3M" if s.get("momentum_3m") is not None else ""
        lines.append(f"  {i}. {sig_emoji} {s['symbol']:<10} [{score_str}] {s['score_label']} {mom_str}")

    body = "\n".join(lines)
    title = f"{'📈 Open' if is_morning else '📉 Close'} · {source_label} · {len(top)} stocks"

    return title, body


def _run_pipeline(session: str) -> None:
    cfg = store.get()
    if not cfg.get("notifications_enabled") or not cfg.get("ntfy_topic"):
        return
    try:
        title, body = _build_notification(session, cfg)
        notifier.send(cfg["ntfy_topic"], title, body,
                      tags=["chart_with_upwards_trend" if session == "morning" else "bell"])
    except Exception:
        notifier.send(cfg.get("ntfy_topic", ""), "⚠️ Pipeline Error",
                      traceback.format_exc()[-500:])


# ── Async wrappers ───────────────────────────────────────────────────────────

async def morning_job() -> None:
    await asyncio.to_thread(_run_pipeline, "morning")


async def closing_job() -> None:
    await asyncio.to_thread(_run_pipeline, "closing")


def start_scheduler() -> None:
    scheduler.add_job(morning_job, CronTrigger(hour=8,  minute=45, timezone=WIB))
    scheduler.add_job(closing_job, CronTrigger(hour=15, minute=45, timezone=WIB))
    scheduler.start()


def stop_scheduler() -> None:
    if scheduler.running:
        scheduler.shutdown()
