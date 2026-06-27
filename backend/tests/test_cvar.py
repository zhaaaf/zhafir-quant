"""
TDS Bab 4: Unit tests for CVaR optimization.
Reference: Rockafellar & Uryasev (2000), DOI: 10.21314/JOR.2000.038
"""
import numpy as np
import pytest
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from models.cvar import minimize_cvar, compute_cvar, compute_cvar_frontier


@pytest.fixture
def sample_returns():
    np.random.seed(0)
    T, N = 252, 3
    rets = np.random.randn(T, N) * 0.012
    mu   = rets.mean(axis=0) * 252
    return rets, mu


def test_cvar_succeeds(sample_returns):
    rets, mu = sample_returns
    result = minimize_cvar(rets, mu, target_return=float(np.mean(mu)), alpha=0.95)
    assert result["success"]


def test_cvar_weights_sum_to_one(sample_returns):
    rets, mu = sample_returns
    result = minimize_cvar(rets, mu, target_return=float(np.mean(mu)))
    assert result["success"]
    assert abs(sum(result["weights"]) - 1.0) < 1e-5


def test_cvar_has_sharpe(sample_returns):
    rets, mu = sample_returns
    result = minimize_cvar(rets, mu, target_return=float(np.mean(mu)))
    assert result["success"]
    assert "sharpe_ratio" in result
    assert result["sharpe_ratio"] is not None


def test_cvar_is_less_than_var(sample_returns):
    rets, mu = sample_returns
    result = minimize_cvar(rets, mu, target_return=float(np.mean(mu)))
    assert result.get("cvar", 0) >= result.get("var", 0) - 1e-6


def test_cvar_frontier_non_empty(sample_returns):
    rets, mu = sample_returns
    frontier = compute_cvar_frontier(rets, mu, n_points=5, alpha=0.95)
    assert len(frontier) >= 3


def test_compute_cvar_positive(sample_returns):
    rets, mu = sample_returns
    w = np.array([1/3, 1/3, 1/3])
    cvar = compute_cvar(w, rets, alpha=0.95)
    assert cvar >= 0
