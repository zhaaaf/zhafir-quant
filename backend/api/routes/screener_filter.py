from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional
from concurrent.futures import ThreadPoolExecutor, as_completed

import yfinance as yf
from data.fetcher import fetch_batch_info_parallel, fetch_price_history
from data.universe import UNIVERSES
from models.stock_scoring import (
    piotroski_f_score, graham_number, momentum_score, composite_score, score_label
)

router = APIRouter()


class FilterParams(BaseModel):
    universe: str = "IDX LQ45"
    sector: Optional[str] = None
    max_pe: Optional[float] = None
    min_pe: Optional[float] = None
    max_pb: Optional[float] = None
    min_dividend_yield: Optional[float] = None
    min_market_cap: Optional[float] = None
    max_beta: Optional[float] = None
    min_beta: Optional[float] = None
    include_scores: bool = True


def _passes(info: dict, p: FilterParams) -> bool:
    if p.sector and info.get("sector") != p.sector:
        return False
    pe = info.get("pe_ratio")
    if p.max_pe and pe and pe > p.max_pe: return False
    if p.min_pe and pe and pe < p.min_pe: return False
    pb = info.get("pb_ratio")
    if p.max_pb and pb and pb > p.max_pb: return False
    div = info.get("dividend_yield")
    if p.min_dividend_yield and (div is None or div < p.min_dividend_yield): return False
    mcap = info.get("market_cap")
    if p.min_market_cap and (mcap is None or mcap < p.min_market_cap): return False
    beta = info.get("beta")
    if p.max_beta and beta and beta > p.max_beta: return False
    if p.min_beta and beta and beta < p.min_beta: return False
    return True


def _score_stock(ticker: str, info: dict) -> dict:
    """Compute all mathematical scores for one stock."""
    # yfinance full info for scoring fields
    try:
        full_info = yf.Ticker(ticker).info
    except Exception:
        full_info = {}

    f = piotroski_f_score(full_info)
    gn = graham_number(full_info)

    # Price history for momentum
    try:
        prices = fetch_price_history([ticker], period="1y")
        series = prices.iloc[:, 0].dropna() if not prices.empty else None
    except Exception:
        series = None

    mom = momentum_score(series)
    comp = composite_score(full_info, f, gn, mom)

    return {
        **info,
        "f_score":           f["score"],
        "f_score_max":       f["max"],
        "f_strength":        f["strength"],
        "graham_number":     gn["graham_number"],
        "margin_of_safety":  gn["margin_of_safety"],
        "graham_signal":     gn["signal"],
        "momentum_3m":       mom["momentum_3m"],
        "momentum_6m":       mom["momentum_6m"],
        "momentum_12m":      mom["momentum_12m"],
        "momentum_pts":      mom["score"],
        "composite_score":   comp,
        "score_label":       score_label(comp),
    }


@router.get("/universes")
def list_universes():
    return {name: len(tickers) for name, tickers in UNIVERSES.items()}


@router.post("/filter")
def filter_universe(params: FilterParams):
    tickers = UNIVERSES.get(params.universe, [])

    # Step 1: parallel fetch basic info
    all_info = fetch_batch_info_parallel(tickers, max_workers=10)
    filtered = [info for info in all_info if _passes(info, params)]

    if not params.include_scores:
        return {"results": filtered, "total": len(filtered), "universe": params.universe}

    # Step 2: parallel compute math scores for filtered stocks only
    results = []
    with ThreadPoolExecutor(max_workers=8) as executor:
        futures = {
            executor.submit(_score_stock, info["symbol"], info): info["symbol"]
            for info in filtered
        }
        scored = {}
        for future in as_completed(futures):
            sym = futures[future]
            try:
                scored[sym] = future.result()
            except Exception:
                scored[sym] = filtered[[i["symbol"] for i in filtered].index(sym)]

    # Preserve original order
    results = [scored[info["symbol"]] for info in filtered if info["symbol"] in scored]

    return {"results": results, "total": len(results), "universe": params.universe}
