"""
Technical signal generation for investor schema.
Computes momentum, RSI, and moving-average crossover signals.
"""
import numpy as np
import pandas as pd
from typing import Literal

SignalType = Literal["BUY", "HOLD", "SELL", "WATCH"]
SchemaType = Literal["day", "swing", "long"]


def compute_rsi(prices: pd.Series, period: int = 14) -> float:
    delta = prices.diff()
    gain = delta.clip(lower=0).rolling(period).mean()
    loss = (-delta.clip(upper=0)).rolling(period).mean()
    rs = gain / loss.replace(0, np.nan)
    rsi = 100 - 100 / (1 + rs)
    return float(rsi.iloc[-1]) if not rsi.empty else 50.0


def compute_ma_signal(prices: pd.Series, short: int = 20, long: int = 50) -> dict:
    ma_short = float(prices.rolling(short).mean().iloc[-1])
    ma_long  = float(prices.rolling(long).mean().iloc[-1])
    current  = float(prices.iloc[-1])
    prev_short = float(prices.rolling(short).mean().iloc[-2]) if len(prices) > short else ma_short
    golden_cross = prev_short < ma_long and ma_short > ma_long
    death_cross  = prev_short > ma_long and ma_short < ma_long
    above_ma20   = current > ma_short
    above_ma50   = current > ma_long
    return {
        "ma20": round(ma_short, 4),
        "ma50": round(ma_long, 4),
        "above_ma20": above_ma20,
        "above_ma50": above_ma50,
        "golden_cross": golden_cross,
        "death_cross": death_cross,
    }


def compute_momentum(prices: pd.Series, period: int = 10) -> float:
    if len(prices) < period + 1:
        return 0.0
    return float((prices.iloc[-1] / prices.iloc[-period] - 1) * 100)


def volume_trend(volumes: pd.Series, period: int = 10) -> str:
    if len(volumes) < period + 1:
        return "neutral"
    avg = volumes.iloc[-period:].mean()
    current = volumes.iloc[-1]
    if current > avg * 1.3:
        return "high"
    if current < avg * 0.7:
        return "low"
    return "normal"


def generate_signal(prices: pd.Series, schema: SchemaType,
                    volumes: pd.Series | None = None) -> dict:
    """Generate buy/hold/sell signal based on investor schema."""
    if len(prices) < 50:
        return {"signal": "HOLD", "reason": "Insufficient data", "confidence": 0.0}

    rsi = compute_rsi(prices)
    ma  = compute_ma_signal(prices)
    mom_5  = compute_momentum(prices, 5)
    mom_20 = compute_momentum(prices, 20)
    current_price = float(prices.iloc[-1])
    vol_trend = volume_trend(volumes, 10) if volumes is not None else "normal"

    daily_ret  = float((prices.iloc[-1] / prices.iloc[-2] - 1) * 100)
    week_ret   = float((prices.iloc[-1] / prices.iloc[-5] - 1) * 100) if len(prices) >= 5 else 0
    month_ret  = float((prices.iloc[-1] / prices.iloc[-21] - 1) * 100) if len(prices) >= 21 else 0

    signal: SignalType = "HOLD"
    reasons = []
    confidence = 0.5

    if schema == "day":
        # Intraday: RSI extremes + short momentum
        if rsi < 35 and ma["above_ma20"] and vol_trend == "high":
            signal = "BUY"
            reasons = [f"RSI oversold ({rsi:.1f})", "Above MA20", "High volume"]
            confidence = 0.75
        elif rsi > 70 or (not ma["above_ma20"] and mom_5 < -2):
            signal = "SELL"
            reasons = [f"RSI overbought ({rsi:.1f})" if rsi > 70 else "Below MA20 + negative momentum"]
            confidence = 0.70
        else:
            signal = "HOLD"
            reasons = [f"RSI neutral ({rsi:.1f})", f"Daily return: {daily_ret:+.2f}%"]
            confidence = 0.5

    elif schema == "swing":
        # 2-14 days: MA crossover + momentum
        if ma["golden_cross"] or (ma["above_ma20"] and ma["above_ma50"] and mom_20 > 5 and rsi < 65):
            signal = "BUY"
            reasons = ["Golden cross" if ma["golden_cross"] else "Above both MAs", f"Momentum: {mom_20:+.1f}%"]
            confidence = 0.72
        elif ma["death_cross"] or (not ma["above_ma20"] and mom_20 < -5):
            signal = "SELL"
            reasons = ["Death cross" if ma["death_cross"] else f"Below MA20, momentum: {mom_20:+.1f}%"]
            confidence = 0.68
        elif ma["above_ma20"] and 40 < rsi < 65:
            signal = "WATCH"
            reasons = [f"Trend intact. RSI: {rsi:.1f}", f"Week: {week_ret:+.1f}%"]
            confidence = 0.55
        else:
            signal = "HOLD"
            reasons = [f"No clear signal. RSI: {rsi:.1f}"]
            confidence = 0.45

    elif schema == "long":
        # 3+ months: trend + fundamentals proxy
        if ma["above_ma50"] and mom_20 > 0 and rsi < 70:
            signal = "BUY" if month_ret > 2 else "HOLD"
            reasons = ["Above MA50", f"Month: {month_ret:+.1f}%", f"RSI: {rsi:.1f}"]
            confidence = 0.65
        elif not ma["above_ma50"] and mom_20 < -10:
            signal = "SELL"
            reasons = [f"Below MA50, Month: {month_ret:+.1f}%"]
            confidence = 0.60
        else:
            signal = "HOLD"
            reasons = ["Long-term trend intact", f"Month: {month_ret:+.1f}%"]
            confidence = 0.55

    return {
        "signal": signal,
        "reasons": reasons,
        "confidence": round(confidence, 2),
        "rsi": round(rsi, 1),
        "ma20": ma["ma20"],
        "ma50": ma["ma50"],
        "above_ma20": ma["above_ma20"],
        "above_ma50": ma["above_ma50"],
        "momentum_5d": round(mom_5, 2),
        "momentum_20d": round(mom_20, 2),
        "daily_return": round(daily_ret, 2),
        "week_return": round(week_ret, 2),
        "month_return": round(month_ret, 2),
        "current_price": round(current_price, 4),
    }


SCHEMA_META = {
    "day": {
        "label": "Day Trading",
        "hold_period": "< 1 hari (intraday)",
        "sell_rule": "Cut loss 1-2% atau close sebelum market tutup",
        "recommended_model": "cvar",
        "risk_level": "Sangat Tinggi",
        "ideal_rsi_buy": "< 35",
        "ideal_rsi_sell": "> 70",
        "color": "#f7768e",
        "icon": "⚡",
        "schedule_notes": "Pantau signal pagi 08:45 WIB (buka IDX). Exit sebelum 15:45 WIB.",
    },
    "swing": {
        "label": "Swing Trading",
        "hold_period": "2–14 hari",
        "sell_rule": "Target profit 5-15% atau stop loss 5%. MA crossover sebagai exit.",
        "recommended_model": "rmt",
        "risk_level": "Menengah-Tinggi",
        "ideal_rsi_buy": "40–55 (menuju naik)",
        "ideal_rsi_sell": "> 65 atau death cross",
        "color": "#e0af68",
        "icon": "📈",
        "schedule_notes": "Cek signal pagi & sore. Hold maksimal 2 minggu.",
    },
    "long": {
        "label": "Long-term Investing",
        "hold_period": "3 bulan – 3 tahun",
        "sell_rule": "Rebalance saat portofolio menyimpang > 10% dari target. Fundamental berubah buruk.",
        "recommended_model": "entropy",
        "risk_level": "Rendah-Menengah",
        "ideal_rsi_buy": "< 55 (beli bertahap / DCA)",
        "ideal_rsi_sell": "Hanya saat fundamental buruk",
        "color": "#9ece6a",
        "icon": "🌱",
        "schedule_notes": "Cek mingguan. Rebalance bulanan via signal optimizer.",
    },
}
