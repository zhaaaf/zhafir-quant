from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional, Literal
import store, notifier
from scheduler import _build_notification

router = APIRouter()

ModelType   = Literal["markowitz", "cvar", "rmt", "quantum", "entropy"]
SchemaType  = Literal["day", "swing", "long"]
UniverseKey = Literal["IDX LQ45", "IDX Kompas100", "S&P 500 Top 50", "Nasdaq 100"]


class PipelineConfig(BaseModel):
    ntfy_topic:           str
    notifications_enabled: bool           = True
    # Auto-pipeline
    universe:     UniverseKey             = "IDX LQ45"
    top_n:        int                     = 8
    schema:       SchemaType              = "swing"
    model:        ModelType               = "markowitz"
    period:       str                     = "1y"
    # Manual override (optional)
    use_watchlist: bool                   = False
    watchlist:    List[str]               = []


@router.get("/config")
def get_config():
    return store.get()


@router.post("/config")
def save_config(cfg: PipelineConfig):
    return store.update(cfg.model_dump())


@router.post("/test")
def test_notification():
    cfg = store.get()
    topic = cfg.get("ntfy_topic", "")
    if not topic:
        return {"success": False, "error": "No ntfy topic configured"}
    ok = notifier.send(
        topic,
        "✅ Zhafir Quant — Connection OK",
        "Notifikasi berhasil!\nPipeline: Screen → Score → Optimize → Push\nJadwal: 08:45 & 15:45 WIB",
        tags=["white_check_mark"],
    )
    return {"success": ok}


@router.post("/run-now")
def run_now(session: Literal["morning", "closing"] = "morning"):
    """
    Trigger the full auto pipeline immediately:
    Screen → Score top-N → Optimize → Push ntfy
    """
    cfg = store.get()
    if not cfg.get("ntfy_topic"):
        return {"success": False, "error": "No ntfy topic configured"}

    try:
        title, body = _build_notification(session, cfg)
        ok = notifier.send(cfg["ntfy_topic"], title, body,
                           tags=["chart_with_upwards_trend" if session == "morning" else "bell"])
        # Return a preview of the notification body
        return {
            "success":   ok,
            "title":     title,
            "body":      body,
            "universe":  cfg.get("universe"),
            "top_n":     cfg.get("top_n"),
            "model":     cfg.get("model"),
        }
    except Exception as e:
        return {"success": False, "error": str(e)}
