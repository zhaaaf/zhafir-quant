"""
Markowitz Mean-Variance Optimization (AIMMS Portfolio Model)

Reference:
  Markowitz, H. (1952). Portfolio Selection.
  Journal of Finance, 7(1), 77-91.
  DOI: 10.2307/2975974

AIMMS formulation:
  min   w' Σ w
  s.t.  w' μ ≥ r_target
        Σ w_i = 1
        w_i ≥ 0  (long-only; relax for short-selling)
"""
import numpy as np
from scipy.optimize import minimize
from typing import List, Optional


def portfolio_variance(weights: np.ndarray, cov_matrix: np.ndarray) -> float:
    return float(weights @ cov_matrix @ weights)


def portfolio_return(weights: np.ndarray, mean_returns: np.ndarray) -> float:
    return float(weights @ mean_returns)


def portfolio_sharpe(weights: np.ndarray, mean_returns: np.ndarray,
                     cov_matrix: np.ndarray, rf: float = 0.0) -> float:
    ret = portfolio_return(weights, mean_returns)
    vol = np.sqrt(portfolio_variance(weights, cov_matrix))
    return (ret - rf) / vol if vol > 1e-10 else 0.0


def minimize_variance(mean_returns: np.ndarray, cov_matrix: np.ndarray,
                      target_return: float, allow_short: bool = False) -> dict:
    n = len(mean_returns)
    bounds = ((-1, 1) if allow_short else (0, 1),) * n
    constraints = [
        {"type": "eq",   "fun": lambda w: np.sum(w) - 1},
        {"type": "ineq", "fun": lambda w: w @ mean_returns - target_return},
    ]
    x0 = np.ones(n) / n
    result = minimize(portfolio_variance, x0, args=(cov_matrix,),
                      method="SLSQP", bounds=bounds, constraints=constraints,
                      options={"ftol": 1e-10, "maxiter": 1000})
    w = result.x
    return {
        "weights": w.tolist(),
        "expected_return": portfolio_return(w, mean_returns),
        "volatility": float(np.sqrt(portfolio_variance(w, cov_matrix))),
        "sharpe_ratio": portfolio_sharpe(w, mean_returns, cov_matrix),
        "success": bool(result.success),
    }


def maximize_sharpe(mean_returns: np.ndarray, cov_matrix: np.ndarray,
                    rf: float = 0.0, allow_short: bool = False) -> dict:
    n = len(mean_returns)
    bounds = ((-1, 1) if allow_short else (0, 1),) * n
    constraints = [{"type": "eq", "fun": lambda w: np.sum(w) - 1}]
    x0 = np.ones(n) / n
    result = minimize(
        lambda w: -portfolio_sharpe(w, mean_returns, cov_matrix, rf),
        x0, method="SLSQP", bounds=bounds, constraints=constraints,
        options={"ftol": 1e-10, "maxiter": 1000},
    )
    w = result.x
    return {
        "weights": w.tolist(),
        "expected_return": portfolio_return(w, mean_returns),
        "volatility": float(np.sqrt(portfolio_variance(w, cov_matrix))),
        "sharpe_ratio": portfolio_sharpe(w, mean_returns, cov_matrix, rf),
        "success": bool(result.success),
    }


def compute_efficient_frontier(mean_returns: np.ndarray, cov_matrix: np.ndarray,
                                n_points: int = 50, allow_short: bool = False) -> List[dict]:
    r_min = float(np.min(mean_returns))
    r_max = float(np.max(mean_returns))
    frontier = []
    for target in np.linspace(r_min, r_max, n_points):
        try:
            res = minimize_variance(mean_returns, cov_matrix, target, allow_short)
            if res["success"]:
                frontier.append({
                    "volatility": res["volatility"],
                    "expected_return": res["expected_return"],
                    "sharpe_ratio": res["sharpe_ratio"],
                })
        except Exception:
            continue
    return frontier
