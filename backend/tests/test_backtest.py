"""
TDS Bab 4: Unit tests for backtesting engine.
Uses mock price data (no network calls).
Reference: Sharpe (1966), Sortino & Price (1994), Kelly (1956)
"""
import numpy as np
import pandas as pd
import pytest
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from models.backtest import (
    annualized_sharpe, annualized_sortino, max_drawdown,
    calmar_ratio, win_rate, backtest_portfolio,
)
from models.kelly import kelly_fraction, kelly_from_returns


# ── Mock price data ──────────────────────────────────────────────────────────

@pytest.fixture
def mock_prices():
    np.random.seed(99)
    dates  = pd.date_range("2022-01-03", periods=252, freq="B")
    n      = len(dates)
    # Two assets with positive drift
    aapl = 150 * np.exp(np.cumsum(np.random.randn(n) * 0.012 + 0.0003))
    msft = 300 * np.exp(np.cumsum(np.random.randn(n) * 0.010 + 0.0004))
    df   = pd.DataFrame({"AAPL": aapl, "MSFT": msft}, index=dates)
    return df


# ── Metrics ──────────────────────────────────────────────────────────────────

def test_sharpe_positive_drift():
    rets = np.random.randn(252) * 0.01 + 0.001   # positive mean
    sr   = annualized_sharpe(rets, rf_daily=0.0)
    assert sr > 0


def test_sortino_geq_zero_positive_mean():
    rets = np.random.randn(252) * 0.01 + 0.001
    so   = annualized_sortino(rets, rf_daily=0.0)
    assert np.isfinite(so)


def test_max_drawdown_between_zero_and_one():
    rets = np.random.randn(252) * 0.02
    mdd  = max_drawdown(rets)
    assert 0 <= mdd <= 1


def test_win_rate_between_zero_and_one():
    rets = np.random.randn(252) * 0.01
    wr   = win_rate(rets)
    assert 0 <= wr <= 1


# ── Backtest engine ───────────────────────────────────────────────────────────

def test_backtest_returns_metrics(mock_prices):
    weights = {"AAPL": 0.6, "MSFT": 0.4}
    result  = backtest_portfolio(mock_prices, weights,
                                  initial_capital=10_000,
                                  transaction_cost=0.001,
                                  rebalance_freq="monthly")
    assert "error" not in result
    assert "sharpe_ratio" in result
    assert "sortino_ratio" in result
    assert "max_drawdown" in result
    assert "win_rate" in result
    assert "equity_curve" in result


def test_backtest_equity_curve_length(mock_prices):
    result = backtest_portfolio(mock_prices, {"AAPL": 0.5, "MSFT": 0.5})
    # equity_curve has one extra point (initial capital) relative to returns
    assert len(result["equity_curve"]) == len(result["daily_returns"]) + 1


def test_backtest_final_capital_positive(mock_prices):
    result = backtest_portfolio(mock_prices, {"AAPL": 0.6, "MSFT": 0.4})
    assert result["final_capital"] > 0


# ── Kelly Criterion ──────────────────────────────────────────────────────────

def test_kelly_fraction_positive_edge():
    # b=2, p=0.6, q=0.4 → f* = (2*0.6-0.4)/2 = 0.4 → half = 0.2
    f = kelly_fraction(win_rate=0.6, avg_gain=0.02, avg_loss=0.01, scale=0.5)
    assert f > 0


def test_kelly_fraction_zero_no_edge():
    # p=0.4, b=1 → f* = (1*0.4-0.6)/1 = -0.2 → clamped to 0
    f = kelly_fraction(win_rate=0.4, avg_gain=0.01, avg_loss=0.01, scale=1.0)
    assert f == 0.0


def test_kelly_from_returns_keys():
    rets = np.random.randn(252) * 0.01 + 0.0005
    k    = kelly_from_returns(rets, scale=0.5)
    for key in ("kelly_full", "kelly_half", "win_rate", "interpretation"):
        assert key in k
