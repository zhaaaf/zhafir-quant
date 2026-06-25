"""
Mathematical Stock Scoring Models

References:
  [1] Piotroski, J.D. (2000). Value Investing: The Use of Historical Financial Statement
      Information to Separate Winners from Losers.
      Journal of Accounting Research, 38, 1-41.
      DOI: 10.2307/2672906

  [2] Graham, B. & Dodd, D. (1934). Security Analysis.
      Graham Number: sqrt(22.5 × EPS × BVPS)
      Intrinsic value model for defensive investors.

  [3] Jegadeesh, N. & Titman, S. (1993). Returns to Buying Winners and Selling Losers.
      Journal of Finance, 48(1), 65-91.
      DOI: 10.1111/j.1540-6261.1993.tb04702.x
"""
import math
import numpy as np
from typing import Optional


# ── Piotroski F-Score ─────────────────────────────────────────────────────────
def piotroski_f_score(info: dict) -> dict:
    """
    Simplified F-Score from available yfinance fields.
    Each criterion = 1 point. Max = 9 (we compute up to 8 from available data).
    Score ≥ 7 = strong, 4-6 = neutral, ≤ 3 = weak.
    """
    score = 0
    details = {}

    # Profitability signals
    roa = info.get("returnOnAssets")
    details["ROA > 0"] = bool(roa and roa > 0)
    if details["ROA > 0"]: score += 1

    op_cf = info.get("operatingCashflow") or info.get("freeCashflow")
    details["CFO > 0"] = bool(op_cf and op_cf > 0)
    if details["CFO > 0"]: score += 1

    gross_margin = info.get("grossMargins")
    details["Gross Margin > 0"] = bool(gross_margin and gross_margin > 0)
    if details["Gross Margin > 0"]: score += 1

    revenue_growth = info.get("revenueGrowth") or info.get("earningsGrowth")
    details["Revenue Growth > 0"] = bool(revenue_growth and revenue_growth > 0)
    if details["Revenue Growth > 0"]: score += 1

    # Leverage / liquidity signals
    dte = info.get("debtToEquity")
    details["Low Debt (D/E < 100)"] = bool(dte is not None and dte < 100)
    if details["Low Debt (D/E < 100)"]: score += 1

    current_ratio = info.get("currentRatio")
    details["Current Ratio > 1"] = bool(current_ratio and current_ratio > 1)
    if details["Current Ratio > 1"]: score += 1

    # Operating efficiency
    roe = info.get("returnOnEquity")
    details["ROE > 0"] = bool(roe and roe > 0)
    if details["ROE > 0"]: score += 1

    profit_margin = info.get("profitMargins")
    details["Profit Margin > 0"] = bool(profit_margin and profit_margin > 0)
    if details["Profit Margin > 0"]: score += 1

    strength = "Strong" if score >= 7 else "Neutral" if score >= 4 else "Weak"
    return {"score": score, "max": 8, "details": details, "strength": strength}


# ── Graham Number ─────────────────────────────────────────────────────────────
def graham_number(info: dict) -> dict:
    """
    Graham Number = sqrt(22.5 × EPS × BVPS)
    Margin of Safety = (GN - Price) / GN
    Positive margin → stock trades below intrinsic value.
    """
    eps  = info.get("trailingEps")
    bvps = info.get("bookValue")
    price = info.get("currentPrice") or info.get("regularMarketPrice")

    if not eps or not bvps or eps <= 0 or bvps <= 0:
        return {"graham_number": None, "margin_of_safety": None, "signal": "N/A"}

    gn = math.sqrt(22.5 * eps * bvps)
    mos = (gn - price) / gn if price else None

    signal = "Undervalued" if mos and mos > 0.15 else \
             "Fair"        if mos and mos > -0.10 else "Overvalued"

    return {
        "graham_number":    round(gn, 2),
        "margin_of_safety": round(mos * 100, 1) if mos is not None else None,
        "signal":           signal,
    }


# ── Momentum Score ────────────────────────────────────────────────────────────
def momentum_score(prices_series, skip_last_month: bool = True) -> dict:
    """
    Price momentum: 12-1 month return (Jegadeesh & Titman standard).
    Also compute 3M and 6M returns.
    """
    if prices_series is None or len(prices_series) < 21:
        return {"momentum_3m": None, "momentum_6m": None, "momentum_12m": None, "score": 0}

    p = prices_series
    n = len(p)

    def safe_ret(lookback_days: int, skip: int = 0) -> Optional[float]:
        start_idx = n - lookback_days - skip
        end_idx   = n - skip
        if start_idx < 0:
            return None
        return float((p.iloc[end_idx - 1] / p.iloc[start_idx] - 1) * 100)

    skip = 21 if skip_last_month else 0  # skip last ~1 month
    m3  = safe_ret(63,  0)    # 3M (no skip for short-term)
    m6  = safe_ret(126, skip)
    m12 = safe_ret(252, skip)

    # Score: each positive momentum period = 1 pt (max 3)
    mom_score = sum(1 for v in [m3, m6, m12] if v is not None and v > 0)

    return {
        "momentum_3m":  round(m3,  2) if m3  is not None else None,
        "momentum_6m":  round(m6,  2) if m6  is not None else None,
        "momentum_12m": round(m12, 2) if m12 is not None else None,
        "score":        mom_score,
    }


# ── Composite Quant Score (0–100) ─────────────────────────────────────────────
def composite_score(info: dict, f_score: dict, gn: dict, mom: dict) -> float:
    """
    Composite = 40% Quality (F-Score) + 35% Value + 25% Momentum
    Returns 0-100.
    """
    # Quality (0-100 from F-Score)
    quality = (f_score["score"] / f_score["max"]) * 100

    # Value (0-100): lower P/E and P/B = better
    pe = info.get("trailingPE")
    pb = info.get("priceToBook")
    mos = gn.get("margin_of_safety")

    value_components = []
    if pe and 0 < pe < 50:
        value_components.append(max(0, min(100, (50 - pe) / 50 * 100)))
    if pb and 0 < pb < 10:
        value_components.append(max(0, min(100, (10 - pb) / 10 * 100)))
    if mos is not None:
        value_components.append(max(0, min(100, mos + 50)))
    value = float(np.mean(value_components)) if value_components else 50.0

    # Momentum (0-100 from 3-pt score)
    momentum = (mom["score"] / 3) * 100

    composite = 0.40 * quality + 0.35 * value + 0.25 * momentum
    return round(composite, 1)


# ── Score label ───────────────────────────────────────────────────────────────
def score_label(score: float) -> str:
    if score >= 75: return "Strong Buy"
    if score >= 60: return "Buy"
    if score >= 45: return "Neutral"
    if score >= 30: return "Weak"
    return "Avoid"
