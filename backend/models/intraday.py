"""
Intraday Day Trading Scenario

For day trading (buy at open, sell at close same day):
- Use open-to-close returns, NOT close-to-close
- Optimize on daily O→C return distribution (last 60 trading days)
- Expected return = average daily gain from buying at open
- Relevant Sharpe = daily Sharpe × √252 (annualized)

Why different from standard optimization:
- Close-to-close includes overnight gap risk (irrelevant for day trader)
- Open-to-close captures pure intraday momentum
- Day trader enters at 09:00 and exits by 15:45 → only intraday P&L matters
"""
import numpy as np
import pandas as pd
import yfinance as yf
from typing import List
from scipy.optimize import minimize


def fetch_intraday_ohlc(tickers: List[str], days: int = 60) -> pd.DataFrame:
    """
    Fetch daily OHLC data for computing open-to-close returns.
    Uses yf.download with daily interval (most reliable).
    """
    period = f"{min(days + 10, 90)}d"
    data = yf.download(tickers, period=period, auto_adjust=True,
                       progress=False, interval="1d")

    if len(tickers) == 1:
        return data
    return data


def compute_oc_returns(ohlc_data: pd.DataFrame, tickers: List[str]) -> pd.DataFrame:
    """
    Compute open-to-close returns: R_t = (Close_t - Open_t) / Open_t
    This is the actual P&L for a day trader.
    """
    if len(tickers) == 1:
        opens  = ohlc_data["Open"].squeeze()
        closes = ohlc_data["Close"].squeeze()
        oc = ((closes - opens) / opens).dropna()
        return pd.DataFrame({tickers[0]: oc})

    opens  = ohlc_data["Open"]
    closes = ohlc_data["Close"]
    oc = ((closes - opens) / opens).dropna()
    return oc


def intraday_stats(oc_returns: pd.DataFrame) -> dict:
    """Compute intraday statistics per ticker."""
    stats = {}
    for ticker in oc_returns.columns:
        r = oc_returns[ticker].dropna()
        if len(r) < 5:
            continue
        stats[ticker] = {
            "mean_daily":    float(r.mean()),
            "std_daily":     float(r.std()),
            "win_rate":      float((r > 0).mean()),
            "avg_win":       float(r[r > 0].mean()) if (r > 0).any() else 0,
            "avg_loss":      float(r[r < 0].mean()) if (r < 0).any() else 0,
            "max_drawdown":  float(r.min()),
            "best_day":      float(r.max()),
            "sharpe_daily":  float(r.mean() / r.std()) if r.std() > 0 else 0,
            "sharpe_annual": float(r.mean() / r.std() * np.sqrt(252)) if r.std() > 0 else 0,
            "positive_days": int((r > 0).sum()),
            "total_days":    int(len(r)),
            "recent_trend":  _recent_trend(r),
        }
    return stats


def _recent_trend(r: pd.Series, window: int = 5) -> str:
    if len(r) < window:
        return "N/A"
    recent = r.tail(window)
    wins   = (recent > 0).sum()
    if wins >= 4:  return "Momentum Naik"
    if wins <= 1:  return "Momentum Turun"
    return "Sideways"


def optimize_intraday(oc_returns: pd.DataFrame,
                      rf_daily: float = 0.0) -> dict:
    """
    Maximize intraday Sharpe using open-to-close returns.
    rf_daily = annual RF / 252 (daily equivalent).
    """
    ret_arr = oc_returns.values
    mu      = np.mean(ret_arr, axis=0)
    cov     = np.cov(ret_arr.T)
    n       = len(mu)

    if n == 1:
        return {
            "weights": [1.0],
            "success": True,
            "expected_daily_return": float(mu[0]),
            "daily_volatility":      float(np.sqrt(cov)),
            "daily_sharpe":          float((mu[0] - rf_daily) / np.sqrt(cov)) if np.sqrt(cov) > 0 else 0,
        }

    def neg_sharpe(w):
        p_ret = w @ mu
        p_vol = np.sqrt(w @ cov @ w)
        return -(p_ret - rf_daily) / p_vol if p_vol > 1e-10 else 0

    best, best_val = None, -np.inf
    for x0 in [np.ones(n)/n, np.eye(n)[np.argmax(mu)]]:
        res = minimize(neg_sharpe, x0, method="SLSQP",
                       bounds=[(0, 1)] * n,
                       constraints=[{"type": "eq", "fun": lambda w: np.sum(w) - 1}],
                       options={"ftol": 1e-10, "maxiter": 500})
        if res.success and -res.fun > best_val:
            best, best_val = res, -res.fun

    if best is None:
        return {"weights": list(np.ones(n)/n), "success": False}

    w        = best.x
    p_ret    = float(w @ mu)
    p_vol    = float(np.sqrt(w @ cov @ w))
    p_sharpe = float((p_ret - rf_daily) / p_vol) if p_vol > 0 else 0

    return {
        "weights":               w.tolist(),
        "success":               True,
        "expected_daily_return": p_ret,
        "daily_volatility":      p_vol,
        "daily_sharpe":          p_sharpe,
        "annual_sharpe_equiv":   p_sharpe * np.sqrt(252),
        "expected_daily_pct":    round(p_ret * 100, 3),
        "daily_vol_pct":         round(p_vol * 100, 3),
    }


def suggest_stop_loss(daily_vol: float) -> dict:
    """
    ATR-based stop loss and take profit for day trading.
    Conservative: stop at -1.5× daily vol, target at +2× daily vol.
    """
    stop  = -abs(daily_vol) * 1.5
    tp    = abs(daily_vol) * 2.0
    ratio = abs(tp / stop) if stop != 0 else 0
    return {
        "stop_loss_pct":    round(stop * 100, 2),
        "take_profit_pct":  round(tp * 100, 2),
        "risk_reward_ratio": round(ratio, 2),
        "note": f"Risk/Reward {ratio:.1f}:1 — {'Layak' if ratio >= 1.5 else 'Kurang ideal (cari R/R ≥ 1.5)'}",
    }


def interpret_intraday(result: dict, stats: dict) -> dict:
    """Generate day-trading-specific interpretation in Indonesian."""
    daily_ret = result.get("expected_daily_return", 0)
    daily_vol = result.get("daily_volatility", 0)
    sharpe_d  = result.get("daily_sharpe", 0)
    messages  = []
    warnings  = []
    suggestions = []

    # Daily return assessment
    if daily_ret > 0.015:
        grade = "A"
        messages.append(f"Rata-rata return intraday {daily_ret*100:.2f}%/hari — sangat baik untuk day trade.")
        messages.append("Secara historis, strategi ini konsisten menghasilkan keuntungan intraday.")
    elif daily_ret > 0.005:
        grade = "B"
        messages.append(f"Rata-rata return intraday {daily_ret*100:.2f}%/hari — cukup untuk day trade aktif.")
    elif daily_ret > 0:
        grade = "C"
        messages.append(f"Return intraday tipis ({daily_ret*100:.2f}%/hari). Perlu biaya trading rendah agar profit.")
        warnings.append("Dengan biaya trading 0.1-0.2% (beli+jual), margin keuntungan sangat tipis.")
    else:
        grade = "F"
        warnings.append(f"Return intraday negatif ({daily_ret*100:.2f}%/hari). Saham-saham ini secara rata-rata turun dari open ke close.")
        suggestions.append("Pertimbangkan untuk short (jual dulu beli kemudian) atau skip trading hari ini.")

    # Sharpe daily
    if sharpe_d > 0.3:
        messages.append(f"Daily Sharpe {sharpe_d:.2f} (Annual equiv: {sharpe_d*np.sqrt(252):.1f}) — sangat kompetitif.")
    elif sharpe_d > 0.1:
        messages.append(f"Daily Sharpe {sharpe_d:.2f} — acceptable untuk day trading.")
    elif sharpe_d <= 0:
        warnings.append("Sharpe negatif: risiko intraday lebih besar dari return. Kondisi tidak ideal.")

    # Win rate
    best_ticker = max(stats.items(), key=lambda x: x[1].get("win_rate", 0), default=(None, {}))
    if best_ticker[0]:
        wr = best_ticker[1].get("win_rate", 0)
        if wr > 0.6:
            messages.append(f"Win rate tertinggi: {best_ticker[0]} ({wr*100:.0f}% hari hijau).")

    # Volatility
    if daily_vol > 0.03:
        warnings.append(f"Volatilitas intraday {daily_vol*100:.1f}%/hari — sangat tinggi. "
                        "Ukuran posisi kecil dulu (max 5-10% modal per saham).")
    elif daily_vol > 0.015:
        messages.append(f"Volatilitas intraday {daily_vol*100:.1f}%/hari — normal untuk saham aktif.")
    else:
        messages.append(f"Volatilitas intraday rendah {daily_vol*100:.1f}%/hari — lebih aman tapi potensi profit lebih kecil.")

    # Action
    if grade in ("A", "B") and daily_ret > 0:
        action        = "BELI DI OPEN"
        action_detail = "Kondisi historis mendukung. Beli saat market buka (09:00 WIB), jual sebelum close (15:45 WIB)."
    elif grade == "C":
        action        = "HATI-HATI"
        action_detail = "Margin tipis. Pastikan komisi broker sangat rendah (<0.1%). Beli setengah posisi dulu."
    else:
        action        = "SKIP HARI INI"
        action_detail = "Data historis tidak mendukung day trade untuk saham-saham ini saat ini."

    return {
        "grade":        grade,
        "action":       action,
        "action_detail": action_detail,
        "messages":     messages,
        "warnings":     warnings,
        "suggestions":  suggestions,
    }
