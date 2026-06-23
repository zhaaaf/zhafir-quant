"""Lightweight JSON persistence for watchlist and notification settings."""
import json
import os

_PATH = os.path.join(os.path.dirname(__file__), "store.json")

_DEFAULT = {
    "ntfy_topic": "",
    "watchlist": [],
    "schema": "swing",
    "notifications_enabled": False,
}


def _read() -> dict:
    if os.path.exists(_PATH):
        try:
            with open(_PATH) as f:
                return {**_DEFAULT, **json.load(f)}
        except Exception:
            pass
    return dict(_DEFAULT)


def _write(data: dict) -> None:
    with open(_PATH, "w") as f:
        json.dump(data, f, indent=2)


def get() -> dict:
    return _read()


def update(patch: dict) -> dict:
    data = _read()
    data.update(patch)
    _write(data)
    return data
