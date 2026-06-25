from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional
from data.fetcher import fetch_batch_info_parallel
from data.universe import UNIVERSES

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


def _passes(info: dict, p: FilterParams) -> bool:
    if p.sector and info.get("sector") != p.sector:
        return False
    pe = info.get("pe_ratio")
    if p.max_pe and pe and pe > p.max_pe:
        return False
    if p.min_pe and pe and pe < p.min_pe:
        return False
    pb = info.get("pb_ratio")
    if p.max_pb and pb and pb > p.max_pb:
        return False
    div = info.get("dividend_yield")
    if p.min_dividend_yield and (div is None or div < p.min_dividend_yield):
        return False
    mcap = info.get("market_cap")
    if p.min_market_cap and (mcap is None or mcap < p.min_market_cap):
        return False
    beta = info.get("beta")
    if p.max_beta and beta and beta > p.max_beta:
        return False
    if p.min_beta and beta and beta < p.min_beta:
        return False
    return True


@router.get("/universes")
def list_universes():
    return {name: len(tickers) for name, tickers in UNIVERSES.items()}


@router.post("/filter")
def filter_universe(params: FilterParams):
    tickers = UNIVERSES.get(params.universe, [])

    # Parallel fetch — cached tickers return instantly
    all_info = fetch_batch_info_parallel(tickers, max_workers=12)
    results = [info for info in all_info if _passes(info, params)]

    return {"results": results, "total": len(results), "universe": params.universe}
