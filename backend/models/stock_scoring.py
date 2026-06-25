"""
Mathematical Stock Scoring & Technical Analysis Models

References:
  [F] Piotroski (2000). DOI: 10.2307/2672906
  [G] Graham & Dodd (1934). Security Analysis.
  [A] Altman (1968). DOI: 10.1111/j.1540-6261.1968.tb00843.x
  [J] Jegadeesh & Titman (1993). DOI: 10.1111/j.1540-6261.1993.tb04702.x
  [W] Wilder (1978). New Concepts in Technical Trading Systems. (RSI)
  [B] Bollinger (2002). Bollinger on Bollinger Bands.
  [M] Appel (1979). MACD method.
"""
import math
import numpy as np
import pandas as pd
from typing import Optional


# ═══════════════════════════════════════════════════════════
# FUNDAMENTAL MODELS
# ═══════════════════════════════════════════════════════════

def piotroski_f_score(info: dict) -> dict:
    """F-Score: 8 binary fundamental criteria [F]. TTM data."""
    score, details = 0, {}

    checks = [
        ("ROA > 0",             info.get("returnOnAssets"),      lambda v: v > 0),
        ("CFO > 0",             info.get("operatingCashflow") or info.get("freeCashflow"), lambda v: v > 0),
        ("Gross Margin > 0",    info.get("grossMargins"),        lambda v: v > 0),
        ("Revenue Growth > 0",  info.get("revenueGrowth") or info.get("earningsGrowth"), lambda v: v > 0),
        ("Low D/E (< 100)",     info.get("debtToEquity"),        lambda v: v < 100),
        ("Current Ratio > 1",   info.get("currentRatio"),        lambda v: v > 1),
        ("ROE > 0",             info.get("returnOnEquity"),      lambda v: v > 0),
        ("Profit Margin > 0",   info.get("profitMargins"),       lambda v: v > 0),
    ]

    for label, val, fn in checks:
        passed = bool(val is not None and fn(val))
        details[label] = passed
        if passed:
            score += 1

    strength = "Strong" if score >= 7 else "Neutral" if score >= 4 else "Weak"
    return {"score": score, "max": 8, "details": details, "strength": strength,
            "data_period": "TTM (Trailing 12 Months)"}


def graham_number(info: dict) -> dict:
    """Graham Number = √(22.5 × EPS × BVPS) [G]. TTM EPS."""
    eps   = info.get("trailingEps")
    bvps  = info.get("bookValue")
    price = info.get("currentPrice") or info.get("regularMarketPrice")

    if not eps or not bvps or eps <= 0 or bvps <= 0:
        return {"graham_number": None, "margin_of_safety": None,
                "signal": "N/A", "data_period": "TTM EPS + current BVPS"}

    gn  = math.sqrt(22.5 * eps * bvps)
    mos = (gn - price) / gn if price else None
    signal = "Undervalued" if mos and mos > 0.15 else \
             "Fair"        if mos and mos > -0.10 else "Overvalued"

    return {"graham_number": round(gn, 2),
            "margin_of_safety": round(mos * 100, 1) if mos is not None else None,
            "signal": signal,
            "data_period": "TTM EPS + current BVPS"}


def altman_z_score(info: dict) -> dict:
    """
    Altman Z-Score [A]:
    Z = 1.2X₁ + 1.4X₂ + 3.3X₃ + 0.6X₄ + X₅
    Z > 2.99 = Safe, 1.81–2.99 = Grey, < 1.81 = Distress
    """
    total_assets = info.get("totalAssets")
    if not total_assets or total_assets <= 0:
        return {"z_score": None, "zone": "N/A", "data_period": "Annual / Quarterly"}

    working_capital    = (info.get("totalCurrentAssets") or 0) - (info.get("totalCurrentLiabilities") or 0)
    retained_earnings  = info.get("retainedEarnings") or 0
    ebit               = info.get("ebit") or (info.get("operatingIncome") or 0)
    mkt_cap            = info.get("marketCap") or 0
    total_liabilities  = info.get("totalDebt") or 0
    revenue            = info.get("totalRevenue") or 0

    X1 = working_capital   / total_assets
    X2 = retained_earnings / total_assets
    X3 = ebit              / total_assets
    X4 = mkt_cap / total_liabilities if total_liabilities > 0 else 0
    X5 = revenue           / total_assets

    z = 1.2*X1 + 1.4*X2 + 3.3*X3 + 0.6*X4 + X5
    zone = "Safe" if z > 2.99 else "Grey" if z > 1.81 else "Distress"

    return {"z_score": round(z, 2), "zone": zone,
            "components": {"X1": round(X1,3), "X2": round(X2,3),
                           "X3": round(X3,3), "X4": round(X4,3), "X5": round(X5,3)},
            "data_period": "Annual / Quarterly"}


# ═══════════════════════════════════════════════════════════
# MOMENTUM MODELS
# ═══════════════════════════════════════════════════════════

def momentum_score(prices: Optional[pd.Series], period: str = "1y") -> dict:
    """
    Jegadeesh-Titman momentum [J]:
    - 12M–1M: lookback 252 days, skip last 21 days
    - 6M, 3M variants
    Period param: "1mo","3mo","6mo","1y","2y","3y"
    """
    if prices is None or len(prices) < 21:
        return {"momentum_3m": None, "momentum_6m": None, "momentum_12m": None,
                "score": 0, "data_period": period}

    n = len(prices)
    def ret(lb, skip=0):
        si = n - lb - skip
        ei = n - skip
        return float((prices.iloc[ei-1] / prices.iloc[si] - 1) * 100) if si >= 0 else None

    m1  = ret(21,  0)
    m3  = ret(63,  0)
    m6  = ret(126, 21)   # skip last 1M per J-T
    m12 = ret(252, 21)

    pts = sum(1 for v in [m3, m6, m12] if v is not None and v > 0)
    return {
        "momentum_1m":  round(m1,  2) if m1  is not None else None,
        "momentum_3m":  round(m3,  2) if m3  is not None else None,
        "momentum_6m":  round(m6,  2) if m6  is not None else None,
        "momentum_12m": round(m12, 2) if m12 is not None else None,
        "score": pts,
        "data_period": period,
    }


def high_52w_ratio(prices: Optional[pd.Series]) -> Optional[float]:
    """Price / 52-Week High [George & Hwang 2004]. Near 1.0 = strong momentum."""
    if prices is None or len(prices) < 5:
        return None
    n    = min(252, len(prices))
    high = prices.iloc[-n:].max()
    return round(float(prices.iloc[-1] / high), 3) if high > 0 else None


# ═══════════════════════════════════════════════════════════
# TECHNICAL ANALYSIS MODELS
# ═══════════════════════════════════════════════════════════

def rsi(prices: pd.Series, period: int = 14) -> Optional[float]:
    """RSI [Wilder 1978]. period=14 days default."""
    if len(prices) < period + 1:
        return None
    delta  = prices.diff()
    gain   = delta.clip(lower=0).rolling(period).mean()
    loss   = (-delta.clip(upper=0)).rolling(period).mean()
    rs     = gain / loss.replace(0, np.nan)
    rsi_s  = 100 - 100 / (1 + rs)
    val    = rsi_s.iloc[-1]
    return round(float(val), 1) if not np.isnan(val) else None


def macd_signal(prices: pd.Series, fast=12, slow=26, signal=9) -> dict:
    """MACD [Appel 1979]. Returns histogram and crossover signal."""
    if len(prices) < slow + signal:
        return {"macd": None, "signal_line": None, "histogram": None, "crossover": "N/A"}
    ema_fast = prices.ewm(span=fast, adjust=False).mean()
    ema_slow = prices.ewm(span=slow, adjust=False).mean()
    macd_line = ema_fast - ema_slow
    sig_line  = macd_line.ewm(span=signal, adjust=False).mean()
    hist      = macd_line - sig_line

    cross = "Bullish" if (macd_line.iloc[-1] > sig_line.iloc[-1] and
                          macd_line.iloc[-2] <= sig_line.iloc[-2]) else \
            "Bearish" if (macd_line.iloc[-1] < sig_line.iloc[-1] and
                          macd_line.iloc[-2] >= sig_line.iloc[-2]) else "Neutral"
    return {
        "macd":       round(float(macd_line.iloc[-1]), 4),
        "signal_line": round(float(sig_line.iloc[-1]), 4),
        "histogram":  round(float(hist.iloc[-1]), 4),
        "crossover":  cross,
    }


def bollinger_position(prices: pd.Series, period: int = 20, std_dev: float = 2.0) -> dict:
    """Bollinger Band position [Bollinger 2002]."""
    if len(prices) < period:
        return {"bb_position": None, "bb_pct": None, "signal": "N/A"}
    ma    = prices.rolling(period).mean()
    sigma = prices.rolling(period).std()
    upper = ma + std_dev * sigma
    lower = ma - std_dev * sigma
    price = prices.iloc[-1]
    width = float(upper.iloc[-1] - lower.iloc[-1])
    pct   = float((price - lower.iloc[-1]) / width) if width > 0 else 0.5
    signal = "Oversold"  if pct < 0.2 else \
             "Overbought" if pct > 0.8 else "Neutral"
    return {
        "bb_upper":   round(float(upper.iloc[-1]), 4),
        "bb_lower":   round(float(lower.iloc[-1]), 4),
        "bb_mid":     round(float(ma.iloc[-1]), 4),
        "bb_pct":     round(pct, 3),
        "signal":     signal,
    }


def ma_crossover(prices: pd.Series, short: int = 50, long: int = 200) -> dict:
    """Golden/Death Cross detection."""
    if len(prices) < long:
        return {"ma_short": None, "ma_long": None, "cross": "N/A"}
    ma_s = prices.rolling(short).mean()
    ma_l = prices.rolling(long).mean()
    cross = "Golden" if (ma_s.iloc[-1] > ma_l.iloc[-1] and
                         ma_s.iloc[-2] <= ma_l.iloc[-2]) else \
            "Death"  if (ma_s.iloc[-1] < ma_l.iloc[-1] and
                         ma_s.iloc[-2] >= ma_l.iloc[-2]) else \
            "Bullish" if ma_s.iloc[-1] > ma_l.iloc[-1] else "Bearish"
    return {
        "ma_short": round(float(ma_s.iloc[-1]), 4),
        "ma_long":  round(float(ma_l.iloc[-1]), 4),
        "cross":    cross,
    }


# ═══════════════════════════════════════════════════════════
# COMPOSITE SCORE
# ═══════════════════════════════════════════════════════════

def composite_score(info: dict, f: dict, gn: dict, az: dict, mom: dict,
                    rsi_val: Optional[float], bb: dict) -> float:
    """
    Composite Quant Score (0–100):
      35% Quality  (F-Score + Altman)
      30% Value    (Graham MoS + P/E + P/B)
      20% Momentum (J-T 3M/6M/12M)
      15% Technical (RSI mean-reversion + BB)
    """
    # Quality
    quality = (f["score"] / f["max"]) * 100
    az_bonus = {"Safe": 20, "Grey": 10, "Distress": 0}.get(az.get("zone", "N/A"), 10)
    quality = (quality + az_bonus) / 2

    # Value
    pe   = info.get("trailingPE")
    pb   = info.get("priceToBook")
    mos  = gn.get("margin_of_safety")
    vc   = []
    if pe  and 0 < pe  < 50: vc.append(max(0, (50 - pe)  / 50  * 100))
    if pb  and 0 < pb  < 10: vc.append(max(0, (10 - pb)  / 10  * 100))
    if mos is not None:       vc.append(max(0, min(100, mos + 50)))
    value = float(np.mean(vc)) if vc else 50.0

    # Momentum
    momentum = (mom["score"] / 3) * 100

    # Technical
    tech = 50.0
    if rsi_val is not None:
        # RSI 30–70 = neutral(50), <30 = buy signal (75), >70 = sell (25)
        tech = 75 if rsi_val < 30 else 25 if rsi_val > 70 else 50
    bb_signal = bb.get("signal", "Neutral")
    bb_score  = 75 if bb_signal == "Oversold" else 25 if bb_signal == "Overbought" else 50
    tech = (tech + bb_score) / 2

    comp = 0.35*quality + 0.30*value + 0.20*momentum + 0.15*tech
    return round(comp, 1)


def score_label(score: float) -> str:
    if score >= 75: return "Strong Buy"
    if score >= 60: return "Buy"
    if score >= 45: return "Neutral"
    if score >= 30: return "Weak"
    return "Avoid"


# ═══════════════════════════════════════════════════════════
# PERIOD CONFIG
# ═══════════════════════════════════════════════════════════

PERIOD_CONFIG = {
    "1mo":  {"label": "1 Bulan",   "tech_days": 30,  "momentum_ok": False, "note": "RSI, MACD, BB only"},
    "3mo":  {"label": "3 Bulan",   "tech_days": 63,  "momentum_ok": True,  "note": "Technical + 3M momentum"},
    "6mo":  {"label": "6 Bulan",   "tech_days": 126, "momentum_ok": True,  "note": "Tech + 3M/6M momentum"},
    "1y":   {"label": "1 Tahun",   "tech_days": 252, "momentum_ok": True,  "note": "Full model suite"},
    "2y":   {"label": "2 Tahun",   "tech_days": 504, "momentum_ok": True,  "note": "12M momentum + fundamental"},
    "3y":   {"label": "3 Tahun",   "tech_days": 756, "momentum_ok": True,  "note": "Factor model range"},
}
