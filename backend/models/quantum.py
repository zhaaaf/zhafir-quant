"""
Quantum-Inspired Portfolio Optimization via Simulated Quantum Annealing

Reference:
  Mugel, S., et al. (2022).
  Dynamic portfolio optimization with real datasets using quantum processors
  and quantum-inspired tensor networks.
  Physical Review Research, 4(1), 013006.
  DOI: 10.1103/PhysRevResearch.4.013006

QUBO formulation:
  H = −μ'x + λ_r x'Σx + λ_b (Σxi − B)²
  x_i ∈ {0,1}  (include / exclude asset)

Solved via path-integral Monte Carlo (Suzuki-Trotter decomposition):
  P replicas are coupled by a transverse-field term J_⊥ that decreases
  as the annealing schedule cools, allowing quantum tunneling early on.
"""
import numpy as np
from typing import Tuple


def build_qubo(mean_returns: np.ndarray, cov_matrix: np.ndarray,
               risk_aversion: float = 0.5, lambda_budget: float = 10.0) -> np.ndarray:
    n = len(mean_returns)
    B = n / 2  # target: hold half the assets

    Q = np.zeros((n, n))
    np.fill_diagonal(Q, -mean_returns)            # linear return term
    Q += risk_aversion * cov_matrix               # quadratic risk term

    # Budget penalty: λ(Σxi − B)² expanded
    np.fill_diagonal(Q, Q.diagonal() + lambda_budget * (1 - 2 * B))
    Q += 2 * lambda_budget * (np.ones((n, n)) - np.eye(n))
    return Q


def _qubo_energy(x: np.ndarray, Q: np.ndarray) -> float:
    return float(x @ Q @ x)


def simulated_quantum_annealing(Q: np.ndarray, n_replicas: int = 20,
                                 n_steps: int = 2000,
                                 T_start: float = 2.0, T_end: float = 0.01,
                                 Gamma_start: float = 2.0) -> Tuple[np.ndarray, float]:
    """
    Path-integral Monte Carlo with Suzuki-Trotter expansion.
    Transverse field Γ → 0 converts quantum tunneling to classical SA.
    """
    n = Q.shape[0]
    replicas = np.random.randint(0, 2, (n_replicas, n)).astype(float)

    best_energy = np.inf
    best_x = replicas[0].copy()

    for step in range(n_steps):
        t = step / n_steps
        T = T_start * (T_end / T_start) ** t
        Gamma = Gamma_start * (1 - t)

        # Suzuki-Trotter inter-replica coupling
        J_perp = (-0.5 * T * np.log(np.tanh(Gamma / (n_replicas * T + 1e-12)))
                  if T > 1e-12 and Gamma > 1e-12 else 0.0)

        for r in range(n_replicas):
            i = np.random.randint(n)

            # Classical energy change for spin flip at site i
            xi = replicas[r, i]
            delta_cl = (1 - 2 * xi) * (Q[i] @ replicas[r] + Q[:, i] @ replicas[r]
                                        - Q[i, i] * xi)

            # Quantum coupling with neighbouring replicas (periodic BC)
            s  = 2 * xi - 1
            sp = 2 * replicas[(r - 1) % n_replicas, i] - 1
            sn = 2 * replicas[(r + 1) % n_replicas, i] - 1
            delta_q = -J_perp * (-s - s) * (sp + sn) / 2  # simplified flip term

            if delta_cl + delta_q < 0 or np.random.rand() < np.exp(
                    -(delta_cl + delta_q) / (T + 1e-12)):
                replicas[r, i] = 1 - xi

            e = _qubo_energy(replicas[r], Q)
            if e < best_energy:
                best_energy = e
                best_x = replicas[r].copy()

    return best_x, best_energy


def quantum_portfolio_optimize(mean_returns: np.ndarray, cov_matrix: np.ndarray,
                                risk_aversion: float = 0.5) -> dict:
    n = len(mean_returns)
    Q = build_qubo(mean_returns, cov_matrix, risk_aversion)
    binary_x, qubo_energy = simulated_quantum_annealing(Q)

    selected = binary_x > 0.5
    if not selected.any():
        selected = np.ones(n, dtype=bool)

    weights = np.zeros(n)
    weights[selected] = 1.0 / selected.sum()

    port_ret = float(weights @ mean_returns)
    port_vol = float(np.sqrt(weights @ cov_matrix @ weights))

    return {
        "weights": weights.tolist(),
        "selected_assets": selected.tolist(),
        "n_selected": int(selected.sum()),
        "expected_return": port_ret,
        "volatility": port_vol,
        "sharpe_ratio": float(port_ret / port_vol) if port_vol > 1e-10 else 0.0,
        "qubo_energy": float(qubo_energy),
        "risk_aversion": risk_aversion,
        "success": True,
    }
