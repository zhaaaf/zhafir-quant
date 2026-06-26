from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
import numpy as np

from data.fetcher import fetch_price_history, compute_stats
from models.markowitz import compute_efficient_frontier, maximize_sharpe, minimize_variance, _global_min_variance_return
from models.cvar import minimize_cvar, compute_cvar_frontier
from models.rmt import clean_covariance_matrix
from models.quantum import quantum_portfolio_optimize
from models.entropy import maximize_entropy_portfolio
from models.interpretation import interpret_result

router = APIRouter()


class OptimizeRequest(BaseModel):
    tickers: List[str] = Field(..., min_length=2, max_length=30)
    model: Literal["markowitz", "cvar", "rmt", "quantum", "entropy"] = "markowitz"
    period: str = "2y"
    target_return: Optional[float] = None
    risk_aversion: float = 0.5
    alpha: float = 0.95
    allow_short: bool = False
    risk_free_rate: float = 0.0


def _load_data(tickers: List[str], period: str):
    prices = fetch_price_history(tickers, period=period)
    prices = prices.dropna(axis=1, thresh=int(len(prices) * 0.8))
    if prices.shape[1] < 2:
        raise HTTPException(status_code=400, detail="Insufficient data for tickers")
    stats = compute_stats(prices)
    return (
        prices.columns.tolist(),
        stats["mean_returns"].values,
        stats["cov_matrix"].values,
        stats["returns"].values,
    )


def _run_optimize(req: OptimizeRequest, mu, cov, rets, valid_tickers):
    """Core optimization — separated so compute() can reuse without re-downloading."""
    if req.model == "markowitz":
        result = (minimize_variance(mu, cov, req.target_return, req.allow_short)
                  if req.target_return is not None
                  else maximize_sharpe(mu, cov, req.risk_free_rate, req.allow_short))

    elif req.model == "rmt":
        cleaned_cov, rmt_stats = clean_covariance_matrix(rets)
        result = maximize_sharpe(mu, cleaned_cov, req.risk_free_rate, req.allow_short)
        result["rmt_stats"] = rmt_stats

    elif req.model == "cvar":
        target = req.target_return if req.target_return is not None else float(np.mean(mu))
        result = minimize_cvar(rets, mu, target, req.alpha, req.allow_short)

    elif req.model == "quantum":
        result = quantum_portfolio_optimize(mu, cov, req.risk_aversion)

    elif req.model == "entropy":
        result = maximize_entropy_portfolio(mu, cov, min_return=req.target_return)

    else:
        raise HTTPException(status_code=400, detail="Unknown model")

    result["tickers"]     = valid_tickers
    result["weights_map"] = {t: round(float(w), 6)
                             for t, w in zip(valid_tickers, result.get("weights", []))}
    result["model"]       = req.model
    return result


def _run_frontier(req: OptimizeRequest, mu, cov, rets, valid_tickers):
    """Compute efficient frontier — reuses already-loaded data."""
    if req.model == "rmt":
        cov, _ = clean_covariance_matrix(rets)
        frontier = compute_efficient_frontier(mu, cov, n_points=50)
    elif req.model == "cvar":
        frontier = compute_cvar_frontier(rets, mu, n_points=30, alpha=req.alpha)
    elif req.model in ("markowitz", "entropy", "quantum"):
        frontier = compute_efficient_frontier(mu, cov, n_points=50,
                                              allow_short=req.allow_short)
    else:
        frontier = []
    return {"frontier": frontier, "tickers": valid_tickers, "model": req.model}


# ── FIX: single endpoint that returns BOTH portfolio + frontier in one price download
@router.post("/compute")
def compute(req: OptimizeRequest):
    """
    Combined endpoint: downloads price data ONCE, returns optimal portfolio + frontier.
    Replaces calling /optimize and /frontier separately (which caused double downloads).
    """
    try:
        tickers = [t.upper() for t in req.tickers]
        valid_tickers, mu, cov, rets = _load_data(tickers, req.period)

        portfolio = _run_optimize(req, mu, cov, rets, valid_tickers)
        frontier  = _run_frontier(req, mu, cov, rets, valid_tickers)

        # Add interpretation (beginner-friendly explanation of results)
        interp = interpret_result(portfolio, req.model, mu, req.risk_free_rate)

        return {**portfolio, "frontier": frontier["frontier"], "interpretation": interp}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class RangeRequest(BaseModel):
    tickers: List[str] = Field(..., min_length=2, max_length=30)
    period: str = "2y"
    allow_short: bool = False


@router.post("/range")
def get_feasible_range(req: RangeRequest):
    """
    Returns the feasible return range [r_min, r_max] for the slider.
    r_min = global minimum variance portfolio return (efficient frontier start)
    r_max = maximum achievable return (100% in best single asset)
    """
    try:
        tickers = [t.upper() for t in req.tickers]
        valid_tickers, mu, cov, rets = _load_data(tickers, req.period)

        r_min = _global_min_variance_return(mu, cov, req.allow_short)
        r_max = float(np.max(mu))
        r_mean = float(np.mean(mu))
        # Suggested default: mean return (midpoint of efficient frontier)
        r_default = float(np.clip(r_mean, r_min, r_max))

        return {
            "tickers":      valid_tickers,
            "r_min":        round(r_min   * 100, 2),
            "r_max":        round(r_max   * 100, 2),
            "r_default":    round(r_default * 100, 2),
            "r_mean":       round(r_mean  * 100, 2),
            "period":       req.period,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Legacy endpoints kept for backward compatibility
@router.post("/optimize")
def optimize_portfolio(req: OptimizeRequest):
    try:
        tickers = [t.upper() for t in req.tickers]
        valid_tickers, mu, cov, rets = _load_data(tickers, req.period)
        return _run_optimize(req, mu, cov, rets, valid_tickers)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/frontier")
def compute_frontier(req: OptimizeRequest):
    try:
        tickers = [t.upper() for t in req.tickers]
        valid_tickers, mu, cov, rets = _load_data(tickers, req.period)
        return _run_frontier(req, mu, cov, rets, valid_tickers)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
