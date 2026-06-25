"""
APScheduler — daily signals at 08:45 and 15:45 WIB (Asia/Jakarta).
Sends push notifications via ntfy.sh.

FIX: sync yfinance calls (fetch_price_history, generate_signal) are wrapped in
asyncio.to_thread() so they don't block the FastAPI event loop.
"""
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
import asyncio
import pytz
from datetime import datetime

import store
import notifier
from data.fetcher import fetch_price_history
from models.signals import generate_signal

WIB       = pytz.timezone("Asia/Jakarta")
scheduler = AsyncIOScheduler(timezone=WIB)


def _build_report(tickers: list[str], schema: str) -> str:
    """Sync function: fetch prices & compute signals for all tickers."""
    lines: list[str] = []
    for ticker in tickers[:10]:
        try:
            prices = fetch_price_history([ticker], period="3mo")
            if prices.empty:
                continue
            series = prices.iloc[:, 0].dropna()
            sig    = generate_signal(series, schema)
            lines.append(notifier.format_signal_report(ticker, sig, schema))
            lines.append("")
        except Exception as e:
            lines.append(f"⚠️ {ticker}: {e}")
    return "\n".join(lines).strip()


async def _run_signals(session: str) -> None:
    cfg     = store.get()
    topic   = cfg.get("ntfy_topic", "")
    tickers = cfg.get("watchlist", [])
    schema  = cfg.get("schema", "swing")

    if not cfg.get("notifications_enabled") or not topic or not tickers:
        return

    now_wib = datetime.now(WIB).strftime("%d %b %Y %H:%M WIB")
    header  = f"{'🌅 Opening' if session == 'morning' else '🌆 Closing'} Signal  |  {now_wib}\n"

    # FIX: run blocking I/O in a thread pool, not in the async event loop
    body = await asyncio.to_thread(_build_report, tickers, schema)

    title = f"{'📊 IDX Morning' if session == 'morning' else '📉 IDX Closing'} | Zhafir Quant"
    tags  = ["chart_with_upwards_trend"] if session == "morning" else ["bell"]
    await asyncio.to_thread(
        notifier.send, topic, title, header + body, "default", tags
    )


async def morning_job() -> None:
    await _run_signals("morning")


async def closing_job() -> None:
    await _run_signals("closing")


def start_scheduler() -> None:
    scheduler.add_job(morning_job, CronTrigger(hour=8,  minute=45, timezone=WIB))
    scheduler.add_job(closing_job, CronTrigger(hour=15, minute=45, timezone=WIB))
    scheduler.start()


def stop_scheduler() -> None:
    if scheduler.running:
        scheduler.shutdown()
