"""
Kelly Criterion Position Sizing

Reference:
  Kelly, J.L. (1956). A New Interpretation of Information Rate.
  Bell System Technical Journal, 35(4), 917-926.

  f* = (b·p - q) / b
  Where:
    f* = optimal fraction of capital to allocate
    b  = avg_gain / avg_loss  (gain/loss ratio)
    p  = win probability (historical win rate)
    q  = 1 - p  (loss probability)

  Half-Kelly (recommended for personal trading, TDS Bab 2):
    f_half = f* / 2  — more conservative, reduces ruin risk

  Per-asset Kelly (from Markowitz weights):
    Combine Kelly sizing with portfolio weights to get
    the optimal capital fraction per asset.
"""
import numpy as np
from typing import Optional


def kelly_fraction(win_rate: float, avg_gain: float, avg_loss: float,
                   scale: float = 0.5) -> float:
    """
    Compute (scaled) Kelly fraction.
    scale = 1.0 → full Kelly (aggressive)
    scale = 0.5 → half Kelly (TDS default, conservative)
    """
    if avg_loss <= 0 or win_rate <= 0:
        return 0.0
    b = avg_gain / avg_loss        # gain-to-loss ratio
    q = 1 - win_rate
    f_star = (b * win_rate - q) / b
    return float(max(0.0, f_star * scale))


def kelly_from_returns(returns: np.ndarray, scale: float = 0.5) -> dict:
    """
    Estimate Kelly fraction from a historical return series.
    Returns full diagnostics useful for display.
    """
    if len(returns) == 0:
        return {"kelly": 0.0, "half_kelly": 0.0}

    pos = returns[returns > 0]
    neg = returns[returns < 0]

    p       = float(len(pos) / len(returns))
    q       = 1 - p
    avg_g   = float(pos.mean())  if len(pos) else 0.0
    avg_l   = float(abs(neg.mean())) if len(neg) else 1e-8
    b       = avg_g / avg_l if avg_l > 0 else 0.0
    f_star  = (b * p - q) / b   if b > 0 else 0.0
    f_star  = max(0.0, f_star)
    f_half  = f_star * scale

    return {
        "kelly_full":     round(f_star * 100, 2),   # % of capital
        "kelly_half":     round(f_half * 100, 2),
        "win_rate":       round(p       * 100, 1),
        "avg_gain_pct":   round(avg_g   * 100, 3),
        "avg_loss_pct":   round(avg_l   * 100, 3),
        "gain_loss_ratio": round(b,             3),
        "interpretation": _kelly_label(f_half),
        "note": (
            f"Full Kelly = {f_star*100:.1f}% · "
            f"Half Kelly = {f_half*100:.1f}% (recommended). "
            "Never bet > 25% on one asset."
        ),
    }


def portfolio_kelly(weights: dict[str, float],
                    portfolio_returns: np.ndarray,
                    capital: float = 10_000,
                    scale: float = 0.5) -> dict:
    """
    Combine Kelly sizing with portfolio weights.
    Returns recommended capital allocation per asset.
    """
    k = kelly_from_returns(portfolio_returns, scale)
    k_fraction = k["kelly_half"] / 100  # as decimal

    allocation = {
        ticker: {
            "weight":         round(w * 100, 2),
            "kelly_capital":  round(w * k_fraction * capital, 2),
            "kelly_pct_total": round(w * k_fraction * 100, 2),
        }
        for ticker, w in weights.items()
    }
    return {**k, "capital_allocation": allocation, "total_kelly_deployed": round(k_fraction * 100, 2)}


def _kelly_label(f_half: float) -> str:
    pct = f_half * 100
    if pct > 25:  return "Sangat Agresif — kurangi ke max 25%"
    if pct > 15:  return "Agresif — cocok untuk high-conviction trade"
    if pct > 8:   return "Moderat — tipikal swing trader"
    if pct > 3:   return "Konservatif — aman untuk pemula"
    if pct > 0:   return "Sangat Konservatif — sinyal lemah"
    return "Tidak disarankan — edge negatif"
