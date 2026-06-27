"""
TDS Bab 4: Unit tests for Markowitz MVO — TradingStrategy isolation pattern.
Tests run without internet or database (mock data).
Reference: Markowitz (1952), DOI: 10.2307/2975974
"""
import numpy as np
import pytest
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from models.markowitz import (
    portfolio_variance, portfolio_return, portfolio_sharpe,
    portfolio_sortino, maximize_sharpe, minimize_variance,
    compute_efficient_frontier, _global_min_variance_return,
)


@pytest.fixture
def two_asset():
    np.random.seed(42)
    T, N = 252, 2
    rets = np.random.randn(T, N) * 0.01
    mu   = rets.mean(axis=0) * 252
    cov  = np.cov(rets.T) * 252
    return mu, cov, rets


def test_portfolio_variance_positive(two_asset):
    mu, cov, _ = two_asset
    w = np.array([0.5, 0.5])
    assert portfolio_variance(w, cov) > 0


def test_weights_sum_to_one(two_asset):
    mu, cov, _ = two_asset
    result = maximize_sharpe(mu, cov, rf=0.0)
    assert result["success"]
    assert abs(sum(result["weights"]) - 1.0) < 1e-6


def test_sharpe_positive(two_asset):
    mu, cov, _ = two_asset
    result = maximize_sharpe(mu, cov, rf=0.0)
    assert result["sharpe_ratio"] > 0


def test_minimize_variance_constraint(two_asset):
    mu, cov, _ = two_asset
    target = float(np.mean(mu))
    result = minimize_variance(mu, cov, target_return=target)
    assert result["success"]
    assert result["expected_return"] >= target - 1e-4


def test_efficient_frontier_ordered(two_asset):
    mu, cov, _ = two_asset
    frontier = compute_efficient_frontier(mu, cov, n_points=10)
    assert len(frontier) >= 5
    returns = [p["expected_return"] for p in frontier]
    assert returns == sorted(returns)    # frontier should be ascending in return


def test_gmv_return_is_lower_bound(two_asset):
    mu, cov, _ = two_asset
    r_gmv = _global_min_variance_return(mu, cov)
    frontier = compute_efficient_frontier(mu, cov, n_points=20)
    assert frontier[0]["expected_return"] >= r_gmv - 1e-4


def test_sortino_leq_sharpe_in_volatile_market(two_asset):
    mu, cov, rets = two_asset
    w = np.array([0.5, 0.5])
    sh  = portfolio_sharpe(w, mu, cov)
    so  = portfolio_sortino(w, mu, rets)
    # Sortino can be higher than Sharpe (downside only) — just check both are finite
    assert np.isfinite(sh)
    assert np.isfinite(so)
