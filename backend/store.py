"""Lightweight JSON persistence for auto-pipeline settings."""
import json, os, threading

_PATH = os.path.join(os.path.dirname(__file__), "store.json")
_LOCK = threading.Lock()

_DEFAULT = {
    "ntfy_topic":             "",
    "notifications_enabled":  False,
    # Auto-pipeline settings (no manual watchlist needed)
    "universe":    "IDX LQ45",
    "top_n":       8,
    "schema":      "swing",
    "model":       "markowitz",
    "period":      "1y",
    # Legacy manual watchlist (optional override)
    "watchlist":   [],
    "use_watchlist": False,
}


def get() -> dict:
    with _LOCK:
        if os.path.exists(_PATH):
            try:
                with open(_PATH) as f:
                    return {**_DEFAULT, **json.load(f)}
            except Exception:
                pass
    return dict(_DEFAULT)


def update(patch: dict) -> dict:
    with _LOCK:
        data = get()
        data.update(patch)
        with open(_PATH, "w") as f:
            json.dump(data, f, indent=2)
    return data
