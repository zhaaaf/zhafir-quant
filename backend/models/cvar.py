"""
CVaR (Conditional Value at Risk) Portfolio Optimization

Reference:
  Rockafellar, R.T. & Uryasev, S. (2000).
  Optimization of Conditional Value-at-Risk.
  Journal of Risk, 2(3), 21-41.
  DOI: 10.21314/JOR.2000.038

Linearization:
  min   ζ + 1/((1−α)T) Σ z_t
  s.t.  z_t ≥ −r_t′w − ζ   ∀t
        z_t ≥ 0
        Σ w_i = 1
        w′μ ≥ r_target          ← inequality (not equality, avoids infeasibility)
        w_i ≥ 0
"""
import numpy as np
from scipy.optimize import linprog
from typing import List


def compute_cvar(weights: np.ndarray, returns: np.ndarray, alpha: float = 0.95) -> float:
    port_ret = returns @ weights
    var      = np.percentile(port_ret, (1 - alpha) * 100)
    tail     = port_ret[port_ret <= var]
    return float(-tail.mean()) if len(tail) > 0 else 0.0


def minimize_cvar(returns: np.ndarray, mean_returns: np.ndarray,
                  target_return: float, alpha: float = 0.95,
                  allow_short: bool = False) -> dict:
    """
    FIX: return constraint changed from equality (= target) to inequality (≥ target).
    Equality caused LP infeasibility when target was not exactly achievable.
    """
    T, n = returns.shape
    # Variables: [w(n), zeta(1), z(T)]
    c          = np.zeros(n + 1 + T)
    c[n]       = 1.0
    c[n + 1:]  = 1.0 / ((1 - alpha) * T)

    # Inequality constraints block:
    # (1) z_t >= -r_t'w - zeta  =>  -r_t'w - zeta - z_t <= 0
    # (2) w'μ >= target_return  =>  -w'μ <= -target_return
    A_ub = np.zeros((T + 1, n + 1 + T))
    for t in range(T):
        A_ub[t, :n]        = -returns[t]
        A_ub[t, n]         = -1.0
        A_ub[t, n + 1 + t] = -1.0
    A_ub[T, :n] = -mean_returns          # -w'μ <= -target_return
    b_ub        = np.zeros(T + 1)
    b_ub[T]     = -target_return

    # Only budget equality: Σw = 1
    A_eq        = np.zeros((1, n + 1 + T))
    A_eq[0, :n] = 1.0
    b_eq        = np.array([1.0])

    w_bounds = [(-1, 1) if allow_short else (0, 1)] * n
    bounds   = w_bounds + [(None, None)] + [(0, None)] * T

    res = linprog(c, A_ub=A_ub, b_ub=b_ub, A_eq=A_eq, b_eq=b_eq,
                  bounds=bounds, method="highs")

    if res.success:
        w        = res.x[:n]
        port_vol = float(np.std(returns @ w) * np.sqrt(252))
        return {
            "weights":         w.tolist(),
            "expected_return": float(w @ mean_returns),
            "volatility":      port_vol,
            "cvar":            float(res.fun),
            "var":             float(res.x[n]),
            "success":         True,
        }
    return {"weights": [], "success": False, "error": res.message}


def compute_cvar_frontier(returns: np.ndarray, mean_returns: np.ndarray,
                           n_points: int = 30, alpha: float = 0.95) -> List[dict]:
    """
    FIX: Use global min-CVaR return as lower bound (not min individual asset return).
    Sweep from min-variance portfolio return upward.
    """
    # Global minimum CVaR portfolio (no return target)
    T, n    = returns.shape
    c       = np.zeros(n + 1 + T)
    c[n]    = 1.0
    c[n+1:] = 1.0 / ((1 - alpha) * T)
    A_ub    = np.zeros((T, n + 1 + T))
    for t in range(T):
        A_ub[t, :n]        = -returns[t]
        A_ub[t, n]         = -1.0
        A_ub[t, n+1+t]     = -1.0
    A_eq        = np.zeros((1, n+1+T))
    A_eq[0, :n] = 1.0
    w_bounds    = [(0, 1)] * n
    res_min     = linprog(c, A_ub=A_ub, b_ub=np.zeros(T),
                          A_eq=A_eq, b_eq=np.array([1.0]),
                          bounds=w_bounds + [(None, None)] + [(0, None)] * T,
                          method="highs")
    r_min = float(res_min.x[:n] @ mean_returns) if res_min.success else float(np.min(mean_returns))
    r_max = float(np.max(mean_returns))

    frontier = []
    for target in np.linspace(r_min, r_max, n_points):
        try:
            res = minimize_cvar(returns, mean_returns, target, alpha)
            if res.get("success"):
                frontier.append({
                    "volatility":      res["volatility"],
                    "expected_return": res["expected_return"],
                    "cvar":            res["cvar"],
                })
        except Exception:
            continue
    return frontier
