"""
Random Matrix Theory (RMT) Covariance Matrix Cleaning

Reference:
  Laloux, L., Cizeau, P., Bouchaud, J.P., & Potters, M. (1999).
  Noise Dressing of Financial Correlation Matrices.
  Physical Review Letters, 83(7), 1467-1470.
  DOI: 10.1103/PhysRevLett.83.1467

Marchenko-Pastur law: for a random (N×T) matrix with T,N→∞ at ratio q=T/N,
eigenvalues of the sample correlation matrix concentrate in [λ−, λ+]:
  λ± = σ²(1 ± 1/√q)²
Eigenvalues above λ+ carry genuine signal; those in the bulk are noise.
"""
import numpy as np
from typing import Tuple


def marchenko_pastur_bounds(T: int, N: int, sigma: float = 1.0) -> Tuple[float, float]:
    q = T / N
    lam_max = sigma**2 * (1 + 1 / np.sqrt(q))**2
    lam_min = sigma**2 * (1 - 1 / np.sqrt(q))**2
    return float(lam_min), float(lam_max)


def clean_covariance_matrix(returns: np.ndarray) -> Tuple[np.ndarray, dict]:
    T, N = returns.shape
    std_devs = returns.std(axis=0)

    # Empirical correlation matrix
    corr = np.corrcoef(returns.T)

    # Eigen-decomposition (eigh for symmetric matrix → real eigenvalues)
    eigenvalues, eigenvectors = np.linalg.eigh(corr)

    lam_min, lam_max = marchenko_pastur_bounds(T, N)

    noise_mask = eigenvalues <= lam_max
    signal_mask = ~noise_mask

    # Replace noise eigenvalues with their mean (preserve trace)
    noise_mean = float(eigenvalues[noise_mask].mean()) if noise_mask.any() else lam_max
    cleaned_ev = eigenvalues.copy()
    cleaned_ev[noise_mask] = noise_mean

    # Reconstruct correlation matrix
    cleaned_corr = eigenvectors @ np.diag(cleaned_ev) @ eigenvectors.T

    # Re-normalize diagonal to 1
    d = np.sqrt(np.diag(cleaned_corr))
    cleaned_corr /= np.outer(d, d)

    # Convert back to covariance (annualized)
    cleaned_cov = cleaned_corr * np.outer(std_devs, std_devs) * 252

    stats = {
        "n_signal": int(signal_mask.sum()),
        "n_noise": int(noise_mask.sum()),
        "lambda_max": lam_max,
        "lambda_min": lam_min,
        "eigenvalues": eigenvalues.tolist(),
        "signal_eigenvalues": eigenvalues[signal_mask].tolist(),
    }
    return cleaned_cov, stats
