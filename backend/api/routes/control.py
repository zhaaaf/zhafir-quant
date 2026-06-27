"""
Control Endpoints — TDS Bab 3: Global Kill-Switch & System Control

Kill-Switch (TDS Bab 3):
  Tombol darurat satu klik untuk menghentikan seluruh aktivitas platform:
  - Menonaktifkan notifikasi otomatis
  - Membersihkan watchlist aktif
  - Mencatat event ke kill_switch log

Reference:
  Åström & Murray (2008). Feedback Systems.
  Sweller (1988). Cognitive Load Theory — UI simplicity under stress.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Literal, Optional
from datetime import datetime
import json, os, pytz

import store

router = APIRouter()
WIB = pytz.timezone("Asia/Jakarta")

# Simple in-memory log (persisted to JSON)
_LOG_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "kill_switch_log.json")


def _append_log(entry: dict) -> None:
    try:
        log = []
        if os.path.exists(_LOG_PATH):
            with open(_LOG_PATH) as f:
                log = json.load(f)
        log.insert(0, entry)
        log = log[:100]    # keep last 100 events
        with open(_LOG_PATH, "w") as f:
            json.dump(log, f, indent=2, default=str)
    except Exception:
        pass


class KillSwitchRequest(BaseModel):
    scope:  Literal["ALL", "NOTIFICATIONS", "WATCHLIST"] = "ALL"
    reason: Optional[str] = None


@router.post("/kill-switch")
def kill_switch(req: KillSwitchRequest):
    """
    TDS Bab 3 — Global Kill-Switch.
    scope=ALL         : disable notifications + clear watchlist
    scope=NOTIFICATIONS: disable notifications only
    scope=WATCHLIST   : clear watchlist only
    """
    now     = datetime.now(WIB).isoformat()
    cfg     = store.get()
    actions = []

    if req.scope in ("ALL", "NOTIFICATIONS"):
        store.update({"notifications_enabled": False})
        actions.append("notifications_disabled")

    if req.scope in ("ALL", "WATCHLIST"):
        store.update({"watchlist": []})
        actions.append("watchlist_cleared")

    event = {
        "timestamp": now,
        "scope":     req.scope,
        "reason":    req.reason or "Manual trigger",
        "actions":   actions,
        "prior_config": {
            "notifications_enabled": cfg.get("notifications_enabled"),
            "watchlist_len":         len(cfg.get("watchlist", [])),
        },
    }
    _append_log(event)

    return {
        "status":    "KILLED",
        "scope":     req.scope,
        "actions":   actions,
        "timestamp": now,
        "message":   (
            "Platform dihentikan. Untuk mengaktifkan kembali: buka Schedule, "
            "aktifkan notifications_enabled, dan tambahkan watchlist."
        ),
    }


@router.post("/resume")
def resume():
    """Resume platform setelah Kill-Switch."""
    now = datetime.now(WIB).isoformat()
    store.update({"notifications_enabled": True})
    _append_log({"timestamp": now, "action": "RESUMED"})
    return {"status": "RESUMED", "timestamp": now}


@router.get("/kill-switch/log")
def get_log():
    """Get last 20 kill-switch events."""
    try:
        if os.path.exists(_LOG_PATH):
            with open(_LOG_PATH) as f:
                return {"events": json.load(f)[:20]}
    except Exception:
        pass
    return {"events": []}


@router.get("/health/detailed")
def detailed_health():
    """System health check (TDS Bab 7 observability)."""
    cfg = store.get()
    return {
        "status":           "ok",
        "notifications":    cfg.get("notifications_enabled", False),
        "ntfy_configured":  bool(cfg.get("ntfy_topic")),
        "telegram_configured": bool(cfg.get("telegram_chat_id")),
        "watchlist_size":   len(cfg.get("watchlist", [])),
        "universe":         cfg.get("universe", "IDX LQ45"),
        "schema":           cfg.get("schema", "swing"),
        "model":            cfg.get("model", "markowitz"),
    }
