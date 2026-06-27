"""
Lightweight SQLite persistence for backtest results.
Used when TimescaleDB/PostgreSQL is not available (Railway/Vercel mode).
Falls back gracefully — all storage is optional.
"""
import sqlite3, json, os
from datetime import datetime
from typing import Optional

_DB_PATH = os.path.join(os.path.dirname(__file__), "quant_local.db")


def _get_conn():
    conn = sqlite3.connect(_DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    """Create tables if they don't exist."""
    with _get_conn() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS backtest_results (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                tickers         TEXT NOT NULL,
                weights         TEXT NOT NULL,
                period          TEXT,
                total_return    REAL,
                sharpe_ratio    REAL,
                sortino_ratio   REAL,
                max_drawdown    REAL,
                win_rate        REAL,
                kelly_half      REAL,
                final_capital   REAL,
                full_result     TEXT,
                created_at      TEXT DEFAULT (datetime('now'))
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS optimization_history (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                tickers         TEXT NOT NULL,
                schema_type     TEXT,
                winner_model    TEXT,
                sharpe_ratio    REAL,
                sortino_ratio   REAL,
                expected_return REAL,
                volatility      REAL,
                full_result     TEXT,
                created_at      TEXT DEFAULT (datetime('now'))
            )
        """)
        conn.commit()


def save_backtest(result: dict) -> Optional[int]:
    try:
        with _get_conn() as conn:
            cur = conn.execute("""
                INSERT INTO backtest_results
                    (tickers, weights, period, total_return, sharpe_ratio,
                     sortino_ratio, max_drawdown, win_rate, kelly_half,
                     final_capital, full_result)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                json.dumps(result.get("tickers", [])),
                json.dumps(result.get("weights", {})),
                result.get("period", ""),
                result.get("total_return"),
                result.get("sharpe_ratio"),
                result.get("sortino_ratio"),
                result.get("max_drawdown"),
                result.get("win_rate"),
                result.get("kelly", {}).get("kelly_half"),
                result.get("final_capital"),
                json.dumps({k: v for k, v in result.items()
                            if k not in ("equity_curve","daily_returns","dates")}),
            ))
            conn.commit()
            return cur.lastrowid
    except Exception:
        return None


def get_backtest_history(limit: int = 20) -> list:
    try:
        with _get_conn() as conn:
            rows = conn.execute(
                "SELECT * FROM backtest_results ORDER BY created_at DESC LIMIT ?",
                (limit,)
            ).fetchall()
            return [dict(r) for r in rows]
    except Exception:
        return []


def save_optimization(result: dict, schema: str = "") -> Optional[int]:
    try:
        with _get_conn() as conn:
            cur = conn.execute("""
                INSERT INTO optimization_history
                    (tickers, schema_type, winner_model, sharpe_ratio,
                     sortino_ratio, expected_return, volatility, full_result)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                json.dumps(result.get("tickers", [])),
                schema,
                result.get("model", ""),
                result.get("sharpe_ratio"),
                result.get("sortino_ratio"),
                result.get("expected_return"),
                result.get("volatility"),
                json.dumps({k: v for k, v in result.items()
                            if k not in ("frontier","weights")}),
            ))
            conn.commit()
            return cur.lastrowid
    except Exception:
        return None


# Auto-init on import
try:
    init_db()
except Exception:
    pass
