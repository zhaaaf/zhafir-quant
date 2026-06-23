from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Literal
import store
import notifier
from data.fetcher import fetch_price_history
from models.signals import generate_signal, SCHEMA_META

router = APIRouter()


class NotifyConfig(BaseModel):
    ntfy_topic: str
    watchlist: List[str]
    schema: Literal["day", "swing", "long"] = "swing"
    notifications_enabled: bool = True


@router.get("/config")
def get_config():
    return store.get()


@router.post("/config")
def save_config(cfg: NotifyConfig):
    return store.update(cfg.model_dump())


@router.post("/test")
def test_notification():
    cfg = store.get()
    topic = cfg.get("ntfy_topic", "")
    if not topic:
        return {"success": False, "error": "No ntfy topic configured"}
    ok = notifier.send(
        topic,
        "✅ Zhafir Quant — Test Notification",
        "Notifikasi berhasil! App siap kirim signal pukul 08:45 & 15:45 WIB.",
        tags=["white_check_mark"],
    )
    return {"success": ok}


@router.post("/run-now")
def run_signals_now():
    cfg = store.get()
    topic   = cfg.get("ntfy_topic", "")
    tickers = cfg.get("watchlist", [])
    schema  = cfg.get("schema", "swing")

    if not tickers:
        return {"success": False, "error": "Watchlist kosong"}

    results = []
    lines = ["📊 Manual Signal Report\n"]

    for ticker in tickers[:10]:
        try:
            prices = fetch_price_history([ticker], period="3mo")
            series = prices.iloc[:, 0].dropna()
            sig = generate_signal(series, schema)
            results.append({"ticker": ticker, **sig})
            lines.append(notifier.format_signal_report(ticker, sig, schema))
            lines.append("")
        except Exception as e:
            results.append({"ticker": ticker, "signal": "ERROR", "error": str(e)})

    if topic:
        notifier.send(topic, "📊 Manual Signal | Zhafir Quant", "\n".join(lines).strip())

    return {"success": True, "results": results, "schema_meta": SCHEMA_META[schema]}


@router.get("/signals")
def get_signals(schema: str = "swing"):
    cfg = store.get()
    tickers = cfg.get("watchlist", [])
    if not tickers:
        return {"signals": [], "schema": schema}

    signals = []
    for ticker in tickers:
        try:
            prices = fetch_price_history([ticker], period="3mo")
            series = prices.iloc[:, 0].dropna()
            sig = generate_signal(series, schema)
            signals.append({"ticker": ticker, **sig})
        except Exception as e:
            signals.append({"ticker": ticker, "signal": "ERROR", "error": str(e)})

    return {"signals": signals, "schema": schema, "schema_meta": SCHEMA_META.get(schema, {})}
