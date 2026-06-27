"""
Vectorized Backtesting Engine

References:
  [S] Sharpe, W.F. (1966). Mutual Fund Performance.
      Journal of Business, 39(1), 119-138.

  [SO] Sortino, F. & Price, L. (1994). Performance Measurement in a Downside Risk Framework.
       Journal of Investing, 3(3), 59-64.
       Sortino Ratio penalises only downside volatility — upside variance is not risk.

  [C]  Calmar, T. (1991). The Calmar Ratio: A Smoother Tool.
       Futures Magazine. (Return / Max Drawdown)

  [TDS-Bab6] Event-Driven Backtesting specification:
       evaluate_portfolio_performance() implementation from TDS Platform Kuantitatif Bab 6.

  [TC] Transaction Cost Model (TDS Bab 1):
       Cost_total = γ·P_mid·Q + η·σ_daily·P_mid·Q·√(Q/V_daily)
       Simplified here as fixed commission per trade.
"""
import numpy as np
import pandas as pd
from typing import Optional


# ── Core performance metrics (TDS Bab 6) ─────────────────────────────────────

def annualized_sharpe(returns: np.ndarray, rf_daily: float = 0.0, N: int = 252) -> float:
    """SR = (√N · E[Rp − Rf]) / σp"""
    excess = returns - rf_daily
    mu, sigma = excess.mean(), excess.std()
    return float(mu / sigma * np.sqrt(N)) if sigma > 1e-10 else 0.0


def annualized_sortino(returns: np.ndarray, rf_daily: float = 0.0, N: int = 252) -> float:
    """
    SND = (√N · E[Rp − Rf]) / σd
    σd = √(mean(min(0, Rp − Rf)²))  ← only penalise downside
    """
    excess = returns - rf_daily
    mu = excess.mean()
    downside = excess[excess < 0]
    sigma_d = np.sqrt(np.mean(downside ** 2)) if len(downside) > 0 else 0.0
    return float(mu / sigma_d * np.sqrt(N)) if sigma_d > 1e-10 else 0.0


def max_drawdown(returns: np.ndarray) -> float:
    """Maximum peak-to-trough decline in equity."""
    cum = np.cumprod(1 + returns)
    peak = np.maximum.accumulate(cum)
    dd = (cum - peak) / peak
    return float(abs(dd.min()))


def calmar_ratio(returns: np.ndarray, rf_daily: float = 0.0, N: int = 252) -> float:
    """Calmar = Annualised Return / Max Drawdown."""
    ann_ret = (1 + returns.mean()) ** N - 1 - rf_daily * N
    mdd = max_drawdown(returns)
    return float(ann_ret / mdd) if mdd > 1e-10 else 0.0


def win_rate(returns: np.ndarray) -> float:
    return float((returns > 0).mean())


# ── Vectorized portfolio backtest ─────────────────────────────────────────────

def backtest_portfolio(
    prices_df:          pd.DataFrame,
    weights:            dict[str, float],
    initial_capital:    float  = 10_000,
    transaction_cost:   float  = 0.001,    # 0.1% per rebalance
    rebalance_freq:     str    = "monthly", # "daily" | "weekly" | "monthly"
    rf_annual:          float  = 0.0575,
) -> dict:
    """
    Vectorized backtest (TDS Bab 6 approach).

    Args:
        prices_df:        Adjusted close prices (rows=dates, cols=tickers)
        weights:          {ticker: weight} — must sum to ~1
        initial_capital:  Starting capital in base currency
        transaction_cost: γ (broker commission) per rebalance, as fraction
        rebalance_freq:   How often to rebalance
        rf_annual:        Annual risk-free rate

    Returns:
        equity_curve, portfolio returns, and all performance metrics.
    """
    tickers = [t for t in weights if t in prices_df.columns]
    if len(tickers) < 1:
        return {"error": "No valid tickers in price data"}

    w = np.array([weights[t] for t in tickers])
    w = w / w.sum()                            # normalise

    prices = prices_df[tickers].dropna()
    if len(prices) < 10:
        return {"error": "Insufficient price data"}

    daily_ret = prices.pct_change().dropna()

    # ── Rebalance schedule ────────────────────────────────────────────────────
    freq_map = {"daily": "B", "weekly": "W-FRI", "monthly": "BMS"}
    freq = freq_map.get(rebalance_freq, "BMS")
    rebal_dates = set(pd.date_range(daily_ret.index[0], daily_ret.index[-1], freq=freq).date)

    # ── Simulate portfolio ────────────────────────────────────────────────────
    portfolio_returns = []
    equity = initial_capital
    equity_curve = [equity]
    current_w = w.copy()
    rf_daily = rf_annual / 252

    for date, row in daily_ret.iterrows():
        ret_vec = row[tickers].values
        port_ret = float(current_w @ ret_vec)

        # Transaction cost on rebalance days
        if date.date() in rebal_dates:
            turnover = np.abs(current_w - w).sum()
            cost = transaction_cost * turnover
            port_ret -= cost
            current_w = w.copy()
        else:
            # Drift weights with daily returns
            current_w = current_w * (1 + ret_vec)
            total = current_w.sum()
            if total > 1e-8:
                current_w /= total

        portfolio_returns.append(port_ret)
        equity *= (1 + port_ret)
        equity_curve.append(equity)

    rets = np.array(portfolio_returns)
    dates = [str(d.date()) for d in daily_ret.index]

    # ── Metrics ───────────────────────────────────────────────────────────────
    ann_ret     = float((1 + rets.mean()) ** 252 - 1)
    ann_vol     = float(rets.std() * np.sqrt(252))
    sharpe      = annualized_sharpe(rets, rf_daily)
    sortino     = annualized_sortino(rets, rf_daily)
    mdd         = max_drawdown(rets)
    calmar      = calmar_ratio(rets, rf_daily)
    win_r       = win_rate(rets)
    total_ret   = float(equity / initial_capital - 1)
    n_trades    = len(rebal_dates)

    # Positive/negative streaks
    pos = (rets > 0).astype(int)
    neg = (rets < 0).astype(int)

    # ── Return distribution (for CVaR) ───────────────────────────────────────
    var95  = float(np.percentile(rets, 5))
    cvar95 = float(rets[rets <= var95].mean()) if (rets <= var95).any() else var95

    return {
        # Time series
        "dates":          dates,
        "equity_curve":   [round(e, 2) for e in equity_curve],
        "daily_returns":  [round(r * 100, 4) for r in rets.tolist()],
        # Scalars
        "total_return":       round(total_ret  * 100, 2),
        "annualized_return":  round(ann_ret    * 100, 2),
        "annualized_vol":     round(ann_vol    * 100, 2),
        "sharpe_ratio":       round(sharpe, 3),
        "sortino_ratio":      round(sortino, 3),
        "calmar_ratio":       round(calmar, 3),
        "max_drawdown":       round(mdd        * 100, 2),
        "win_rate":           round(win_r      * 100, 1),
        "var_95":             round(var95      * 100, 3),
        "cvar_95":            round(cvar95     * 100, 3),
        "n_rebalances":       n_trades,
        "transaction_cost_pct": transaction_cost * 100,
        "initial_capital":    initial_capital,
        "final_capital":      round(equity, 2),
        "tickers":            tickers,
        "weights":            {t: round(float(wi), 4) for t, wi in zip(tickers, w)},
    }


# ── Compare buy-and-hold benchmark ───────────────────────────────────────────

def benchmark_returns(prices_df: pd.DataFrame, tickers: list[str]) -> dict:
    """Equal-weight buy-and-hold benchmark."""
    avail = [t for t in tickers if t in prices_df.columns]
    if not avail:
        return {}
    eq_w = {t: 1 / len(avail) for t in avail}
    return backtest_portfolio(prices_df, eq_w,
                              transaction_cost=0.0,
                              rebalance_freq="monthly")
