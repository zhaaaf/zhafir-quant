"""
Multi-Model Comparison & Schema-Aware Ranking

Runs all 5 models in parallel on the same data.
Ranks by schema-specific objective function:

  Day Trade → highest intraday Sharpe (O→C) + lowest tail risk (CVaR)
  Swing     → highest annualized Sharpe + penalize excess volatility (>25%)
  Long      → highest Sharpe + diversification bonus (effective N)

Why not just pick the highest Sharpe for all schemas?
  Day trader cares about DAILY return, not annualized.
  Long investor cares about diversification, not just return.
  Each schema has a different definition of "best".
"""
import numpy as np
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Callable


def _safe_run(fn: Callable, *args, **kwargs) -> dict:
    try:
        return fn(*args, **kwargs)
    except Exception as e:
        return {"success": False, "error": str(e)}


def schema_score(result: dict, model: str, schema: str) -> float:
    """
    Compute a single comparable score for ranking.
    Higher = better for this schema.
    """
    if not result.get("success", True) or result.get("error"):
        return -999.0

    sharpe = float(result.get("sharpe_ratio") or 0)
    ret    = float(result.get("expected_return") or 0)
    vol    = float(result.get("volatility") or 0)

    if schema == "day":
        # Minimize tail loss, maximize risk-adjusted return
        # CVaR model gets a bonus since it's purpose-built for this
        cvar     = float(result.get("cvar") or vol * 2.0)
        model_bonus = 0.1 if model == "cvar" else 0.0
        return sharpe - 0.5 * cvar + model_bonus

    elif schema == "swing":
        # Sharpe is primary; penalise vol > 25%/yr (too risky for swing)
        vol_penalty = max(0, vol - 0.25) * 2.0
        # RMT gets small bonus (noise-filtered = more accurate for medium term)
        model_bonus = 0.05 if model == "rmt" else 0.0
        return sharpe - vol_penalty + model_bonus

    elif schema == "long":
        # Sharpe + diversification bonus (effective N scaled 0-1)
        eff_n = float(result.get("effective_n") or 1.0)
        n_tickers = len(result.get("weights") or [1])
        div_bonus = min(eff_n / max(n_tickers, 1), 1.0) * 0.3
        # Entropy model gets bonus (purpose-built for diversification)
        model_bonus = 0.1 if model == "entropy" else 0.0
        return sharpe + div_bonus + model_bonus

    return sharpe


def rank_results(results: dict[str, dict], schema: str) -> list[dict]:
    """Sort model results by schema objective, best first."""
    ranked = []
    for model, result in results.items():
        score = schema_score(result, model, schema)
        ranked.append({
            "model":            model,
            "schema_score":     round(score, 4),
            "sharpe_ratio":     result.get("sharpe_ratio"),
            "expected_return":  result.get("expected_return"),
            "volatility":       result.get("volatility"),
            "weights":          result.get("weights"),
            "weights_map":      result.get("weights_map"),
            "tickers":          result.get("tickers"),
            "success":          result.get("success", True) and not result.get("error"),
            "error":            result.get("error"),
            # Model-specific extras
            "cvar":             result.get("cvar"),
            "effective_n":      result.get("effective_n"),
            "entropy":          result.get("entropy"),
            "n_selected":       result.get("n_selected"),
            "qubo_energy":      result.get("qubo_energy"),
            "risk_aversion":    result.get("risk_aversion"),
            "rmt_stats":        result.get("rmt_stats"),
            "interpretation":   result.get("interpretation"),
            # Performance metrics (added post-audit fix)
            "sortino_ratio":    result.get("sortino_ratio"),
            "kelly":            result.get("kelly"),
            # Frontier (winner only — set in compare endpoint)
            "frontier":         result.get("frontier"),
        })
    ranked.sort(key=lambda x: x["schema_score"], reverse=True)
    # Add rank label
    for i, r in enumerate(ranked):
        r["rank"] = i + 1
        r["is_winner"] = i == 0
    return ranked


def significance_note(ranked: list[dict]) -> str:
    """
    Tell user if winner is significantly better or models are basically equal.
    """
    scores = [r["schema_score"] for r in ranked if r.get("success")]
    if len(scores) < 2:
        return ""
    gap = scores[0] - scores[1]
    if gap < 0.05:
        return "Selisih antar model sangat kecil (<0.05). Semua model setara untuk universe ini."
    if gap < 0.15:
        return f"Model terbaik ({ranked[0]['model'].upper()}) sedikit lebih baik. Perbedaan tidak signifikan."
    return f"Model {ranked[0]['model'].upper()} secara signifikan lebih baik untuk schema ini."
