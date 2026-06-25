from fastapi import APIRouter, Query
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Literal
import store, notifier
from scheduler import _build_notification

router = APIRouter()

ModelType   = Literal["markowitz", "cvar", "rmt", "quantum", "entropy"]
SchemaType  = Literal["day", "swing", "long"]
UniverseKey = Literal["IDX LQ45", "IDX Kompas100", "S&P 500 Top 50", "Nasdaq 100"]


class PipelineConfig(BaseModel):
    # Pydantic v2: allow 'schema' and 'model' as field names
    model_config = ConfigDict(populate_by_name=True)

    ntfy_topic:            str
    notifications_enabled: bool        = True
    universe:              UniverseKey = "IDX LQ45"
    top_n:                 int         = Field(default=8, ge=3, le=15)
    investor_schema:       SchemaType  = Field(default="swing", alias="schema")
    opt_model:             ModelType   = Field(default="markowitz", alias="model")
    period:                str         = "1y"
    use_watchlist:         bool        = False
    watchlist:             List[str]   = []


@router.get("/config")
def get_config():
    return store.get()


@router.post("/config")
def save_config(cfg: PipelineConfig):
    data = cfg.model_dump()
    # Normalize back to 'schema' and 'model' keys for store
    data["schema"] = data.pop("investor_schema", data.get("schema", "swing"))
    data["model"]  = data.pop("opt_model",       data.get("model",  "markowitz"))
    return store.update(data)


@router.post("/test")
def test_notification():
    cfg   = store.get()
    topic = cfg.get("ntfy_topic", "")
    if not topic:
        return {"success": False, "error": "Isi ntfy topic dulu di konfigurasi"}
    ok = notifier.send(
        topic,
        "Zhafir Quant - Connection OK",
        "Notifikasi berhasil!\nPipeline: Screen -> Score -> Optimize -> Push\nJadwal: 08:45 & 15:45 WIB",
        tags=["white_check_mark"],
    )
    return {"success": ok}


@router.post("/run-now")
def run_now(session: Literal["morning", "closing"] = Query(default="morning")):
    """Full auto pipeline on demand: Screen -> Score -> Optimize -> Push ntfy."""
    cfg = store.get()
    if not cfg.get("ntfy_topic"):
        return {"success": False, "error": "Isi ntfy topic dulu di konfigurasi"}
    try:
        title, body = _build_notification(session, cfg)
        ok = notifier.send(
            cfg["ntfy_topic"], title, body,
            tags=["chart_with_upwards_trend" if session == "morning" else "bell"],
        )
        return {
            "success":  ok,
            "title":    title,
            "body":     body,
            "universe": cfg.get("universe"),
            "top_n":    cfg.get("top_n"),
            "model":    cfg.get("model"),
        }
    except Exception as e:
        return {"success": False, "error": str(e)}
