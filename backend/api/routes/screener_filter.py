from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional, Literal
from concurrent.futures import ThreadPoolExecutor, as_completed

import yfinance as yf
from data.fetcher import fetch_batch_info_parallel, fetch_price_history
from data.universe import UNIVERSES
from models.stock_scoring import (
    piotroski_f_score, graham_number, altman_z_score,
    momentum_score, rsi, macd_signal, bollinger_position, ma_crossover,
    high_52w_ratio, composite_score, score_label, PERIOD_CONFIG,
)

router = APIRouter()

Period = Literal["1mo", "3mo", "6mo", "1y", "2y", "3y"]


class FilterParams(BaseModel):
    universe: str = "IDX LQ45"
    period: Period = "1y"
    sector: Optional[str] = None
    max_pe: Optional[float] = None
    min_pe: Optional[float] = None
    max_pb: Optional[float] = None
    min_dividend_yield: Optional[float] = None
    min_market_cap: Optional[float] = None
    max_beta: Optional[float] = None
    min_beta: Optional[float] = None
    include_scores: bool = True


def _passes(info: dict, p: FilterParams) -> bool:
    if p.sector and info.get("sector") != p.sector:
        return False
    pe = info.get("pe_ratio")
    if p.max_pe and pe and pe > p.max_pe: return False
    if p.min_pe and pe and pe < p.min_pe: return False
    pb = info.get("pb_ratio")
    if p.max_pb and pb and pb > p.max_pb: return False
    div = info.get("dividend_yield")
    if p.min_dividend_yield and (div is None or div < p.min_dividend_yield): return False
    mcap = info.get("market_cap")
    if p.min_market_cap and (mcap is None or mcap < p.min_market_cap): return False
    beta = info.get("beta")
    if p.max_beta and beta and beta > p.max_beta: return False
    if p.min_beta and beta and beta < p.min_beta: return False
    return True


def _score_stock(ticker: str, info: dict, period: str) -> dict:
    # Full info for fundamental models
    try:
        full_info = yf.Ticker(ticker).info
    except Exception:
        full_info = {}

    # Price history for tech + momentum
    try:
        prices = fetch_price_history([ticker], period=period)
        series = prices.iloc[:, 0].dropna() if not prices.empty else None
    except Exception:
        series = None

    # ── Fundamental ──
    f  = piotroski_f_score(full_info)
    gn = graham_number(full_info)
    az = altman_z_score(full_info)

    # ── Momentum ──
    mom  = momentum_score(series, period)
    h52  = high_52w_ratio(series)

    # ── Technical ──
    rsi_v = rsi(series)          if series is not None else None
    macd  = macd_signal(series)  if series is not None else {}
    bb    = bollinger_position(series) if series is not None else {}
    mac   = ma_crossover(series) if series is not None else {}

    comp = composite_score(full_info, f, gn, az, mom, rsi_v, bb)

    return {
        **info,
        # Fundamental
        "f_score":          f["score"],
        "f_score_max":      f["max"],
        "f_strength":       f["strength"],
        "graham_number":    gn["graham_number"],
        "margin_of_safety": gn["margin_of_safety"],
        "graham_signal":    gn["signal"],
        "z_score":          az.get("z_score"),
        "z_zone":           az.get("zone"),
        # Momentum
        "momentum_1m":      mom.get("momentum_1m"),
        "momentum_3m":      mom.get("momentum_3m"),
        "momentum_6m":      mom.get("momentum_6m"),
        "momentum_12m":     mom.get("momentum_12m"),
        "momentum_pts":     mom.get("score"),
        "high_52w_ratio":   h52,
        # Technical
        "rsi":              rsi_v,
        "macd_cross":       macd.get("crossover"),
        "macd_hist":        macd.get("histogram"),
        "bb_pct":           bb.get("bb_pct"),
        "bb_signal":        bb.get("signal"),
        "ma_cross":         mac.get("cross"),
        # Composite
        "composite_score":  comp,
        "score_label":      score_label(comp),
        "period_used":      period,
    }


@router.get("/universes")
def list_universes():
    return {name: len(tickers) for name, tickers in UNIVERSES.items()}


@router.get("/periods")
def list_periods():
    return PERIOD_CONFIG


@router.post("/filter")
def filter_universe(params: FilterParams):
    tickers = UNIVERSES.get(params.universe, [])

    # Step 1: parallel basic info fetch (cached after first call)
    all_info = fetch_batch_info_parallel(tickers, max_workers=10)
    filtered = [info for info in all_info if _passes(info, params)]

    if not params.include_scores or not filtered:
        return {"results": filtered, "total": len(filtered),
                "universe": params.universe, "period": params.period}

    # Step 2: parallel score computation for filtered stocks
    scored: dict[str, dict] = {}
    with ThreadPoolExecutor(max_workers=6) as executor:
        futures = {
            executor.submit(_score_stock, info["symbol"], info, params.period): info["symbol"]
            for info in filtered
        }
        for future in as_completed(futures):
            sym = futures[future]
            try:
                scored[sym] = future.result()
            except Exception:
                idx = [i["symbol"] for i in filtered].index(sym)
                scored[sym] = filtered[idx]

    results = [scored[info["symbol"]] for info in filtered if info["symbol"] in scored]

    return {"results": results, "total": len(results),
            "universe": params.universe, "period": params.period,
            "period_label": PERIOD_CONFIG[params.period]["label"]}
