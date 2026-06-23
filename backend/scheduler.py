"""
APScheduler — daily signals at 08:45 and 15:45 WIB (Asia/Jakarta).
Sends push notifications via ntfy.sh.
"""
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
import pytz

import store
import notifier
from data.fetcher import fetch_price_history
from models.signals import generate_signal
from datetime import datetime

WIB = pytz.timezone("Asia/Jakarta")

scheduler = AsyncIOScheduler(timezone=WIB)


async def _run_signals(session: str) -> None:
    cfg = store.get()
    topic   = cfg.get("ntfy_topic", "")
    tickers = cfg.get("watchlist", [])
    schema  = cfg.get("schema", "swing")

    if not cfg.get("notifications_enabled") or not topic or not tickers:
        return

    now_wib = datetime.now(WIB).strftime("%d %b %Y %H:%M WIB")
    lines = [f"{'🌅 Opening' if session == 'morning' else '🌆 Closing'} Signal  |  {now_wib}", ""]

    for ticker in tickers[:10]:  # max 10 tickers per notification
        try:
            prices = fetch_price_history([ticker], period="3mo")
            if prices.empty:
                continue
            series = prices.iloc[:, 0].dropna()
            sig = generate_signal(series, schema)
            lines.append(notifier.format_signal_report(ticker, sig, schema))
            lines.append("")
        except Exception as e:
            lines.append(f"⚠️ {ticker}: error ({e})")

    title = f"{'📊 IDX Morning' if session == 'morning' else '📉 IDX Closing'} | Zhafir Quant"
    msg   = "\n".join(lines).strip()
    tags  = ["chart_with_upwards_trend"] if session == "morning" else ["bell"]

    notifier.send(topic, title, msg, priority="default", tags=tags)


async def morning_job() -> None:
    await _run_signals("morning")


async def closing_job() -> None:
    await _run_signals("closing")


def start_scheduler() -> None:
    # 08:45 WIB
    scheduler.add_job(morning_job, CronTrigger(hour=8, minute=45, timezone=WIB))
    # 15:45 WIB
    scheduler.add_job(closing_job, CronTrigger(hour=15, minute=45, timezone=WIB))
    scheduler.start()


def stop_scheduler() -> None:
    if scheduler.running:
        scheduler.shutdown()
