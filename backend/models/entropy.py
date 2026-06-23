"""
Maximum Entropy Portfolio (Statistical Mechanics)

Reference:
  Shore, J.E. & Johnson, R.W. (1980).
  Axiomatic derivation of the principle of maximum entropy and the
  principle of minimum cross-entropy.
  IEEE Transactions on Information Theory, 26(1), 26-37.
  DOI: 10.1109/TIT.1980.1056144

Analogy: thermodynamic equilibrium maximises entropy −Σp log p.
Applied to portfolio weights: maximum entropy ≡ maximum diversification.
Unconstrained solution is 1/N (uniform), but constraints on return
and risk push weight mass toward efficient assets.
"""
import numpy as np
from scipy.optimize import minimize
from typing import Optional


def portfolio_entropy(weights: np.ndarray) -> float:
    w = weights[weights > 1e-12]
    return float(-np.sum(w * np.log(w)))


def maximize_entropy_portfolio(mean_returns: np.ndarray, cov_matrix: np.ndarray,
                                min_return: Optional[float] = None,
                                max_volatility: Optional[float] = None) -> dict:
    n = len(mean_returns)
    constraints = [{"type": "eq", "fun": lambda w: np.sum(w) - 1}]

    if min_return is not None:
        constraints.append({
            "type": "ineq",
            "fun": lambda w: w @ mean_returns - min_return,
        })
    if max_volatility is not None:
        constraints.append({
            "type": "ineq",
            "fun": lambda w: max_volatility**2 - w @ cov_matrix @ w,
        })

    result = minimize(
        lambda w: -portfolio_entropy(w),
        x0=np.ones(n) / n,
        method="SLSQP",
        bounds=[(1e-6, 1)] * n,
        constraints=constraints,
        options={"ftol": 1e-10, "maxiter": 1000},
    )

    w = result.x
    port_ret = float(w @ mean_returns)
    port_vol = float(np.sqrt(w @ cov_matrix @ w))

    return {
        "weights": w.tolist(),
        "expected_return": port_ret,
        "volatility": port_vol,
        "sharpe_ratio": float(port_ret / port_vol) if port_vol > 1e-10 else 0.0,
        "entropy": portfolio_entropy(w),
        "effective_n": float(np.exp(portfolio_entropy(w))),
        "success": bool(result.success),
    }
