"""
Markowitz Mean-Variance Optimization (AIMMS Portfolio Model)

Reference:
  Markowitz, H. (1952). Portfolio Selection.
  Journal of Finance, 7(1), 77-91.
  DOI: 10.2307/2975974

AIMMS formulation:
  min   w′ Σ w
  s.t.  w′μ ≥ r_target
        Σ w_i = 1
        w_i ≥ 0  (long-only; relax for short-selling)
"""
import numpy as np
from scipy.optimize import minimize
from typing import List


def portfolio_variance(weights: np.ndarray, cov_matrix: np.ndarray) -> float:
    return float(weights @ cov_matrix @ weights)


def portfolio_return(weights: np.ndarray, mean_returns: np.ndarray) -> float:
    return float(weights @ mean_returns)


def portfolio_sharpe(weights: np.ndarray, mean_returns: np.ndarray,
                     cov_matrix: np.ndarray, rf: float = 0.0) -> float:
    ret = portfolio_return(weights, mean_returns)
    vol = np.sqrt(portfolio_variance(weights, cov_matrix))
    return (ret - rf) / vol if vol > 1e-10 else 0.0


def _global_min_variance_return(mean_returns: np.ndarray, cov_matrix: np.ndarray,
                                 allow_short: bool = False) -> float:
    """Compute the return of the global minimum variance portfolio."""
    n = len(mean_returns)
    result = minimize(
        portfolio_variance,
        x0=np.ones(n) / n,
        args=(cov_matrix,),
        method="SLSQP",
        bounds=((-1, 1) if allow_short else (0, 1),) * n,
        constraints=[{"type": "eq", "fun": lambda w: np.sum(w) - 1}],
        options={"ftol": 1e-12, "maxiter": 1000},
    )
    return float(result.x @ mean_returns) if result.success else float(np.min(mean_returns))


def minimize_variance(mean_returns: np.ndarray, cov_matrix: np.ndarray,
                      target_return: float, allow_short: bool = False) -> dict:
    n = len(mean_returns)
    bounds = ((-1, 1) if allow_short else (0, 1),) * n
    constraints = [
        {"type": "eq",   "fun": lambda w: np.sum(w) - 1},
        {"type": "ineq", "fun": lambda w: w @ mean_returns - target_return},
    ]
    result = minimize(portfolio_variance, np.ones(n) / n, args=(cov_matrix,),
                      method="SLSQP", bounds=bounds, constraints=constraints,
                      options={"ftol": 1e-10, "maxiter": 1000})
    w = result.x
    return {
        "weights":         w.tolist(),
        "expected_return": portfolio_return(w, mean_returns),
        "volatility":      float(np.sqrt(portfolio_variance(w, cov_matrix))),
        "sharpe_ratio":    portfolio_sharpe(w, mean_returns, cov_matrix),
        "success":         bool(result.success),
    }


def maximize_sharpe(mean_returns: np.ndarray, cov_matrix: np.ndarray,
                    rf: float = 0.0, allow_short: bool = False) -> dict:
    n = len(mean_returns)
    # Guard: if all returns are negative or below rf, Sharpe is undefined
    if np.all(mean_returns <= rf):
        return minimize_variance(mean_returns, cov_matrix,
                                  float(np.max(mean_returns)), allow_short)
    bounds = ((-1, 1) if allow_short else (0, 1),) * n
    constraints = [{"type": "eq", "fun": lambda w: np.sum(w) - 1}]
    # Multiple starts to avoid local optima
    best, best_sharpe = None, -np.inf
    for x0 in [np.ones(n) / n, np.eye(n)[np.argmax(mean_returns)]]:
        res = minimize(lambda w: -portfolio_sharpe(w, mean_returns, cov_matrix, rf),
                       x0, method="SLSQP", bounds=bounds, constraints=constraints,
                       options={"ftol": 1e-10, "maxiter": 1000})
        s = portfolio_sharpe(res.x, mean_returns, cov_matrix, rf)
        if res.success and s > best_sharpe:
            best, best_sharpe = res, s
    w = best.x if best else np.ones(n) / n
    return {
        "weights":         w.tolist(),
        "expected_return": portfolio_return(w, mean_returns),
        "volatility":      float(np.sqrt(portfolio_variance(w, cov_matrix))),
        "sharpe_ratio":    portfolio_sharpe(w, mean_returns, cov_matrix, rf),
        "success":         bool(best.success) if best else False,
    }


def compute_efficient_frontier(mean_returns: np.ndarray, cov_matrix: np.ndarray,
                                n_points: int = 50, allow_short: bool = False) -> List[dict]:
    """
    FIX: Use global min-variance portfolio return as lower bound.
    The correct efficient frontier starts at the GMV portfolio, not at min(individual returns).
    Targets below GMV return are infeasible (below-frontier portfolios are dominated).
    """
    r_min = _global_min_variance_return(mean_returns, cov_matrix, allow_short)
    r_max = float(np.max(mean_returns))

    frontier = []
    for target in np.linspace(r_min, r_max, n_points):
        try:
            res = minimize_variance(mean_returns, cov_matrix, target, allow_short)
            if res["success"]:
                frontier.append({
                    "volatility":      res["volatility"],
                    "expected_return": res["expected_return"],
                    "sharpe_ratio":    res["sharpe_ratio"],
                })
        except Exception:
            continue
    return frontier
