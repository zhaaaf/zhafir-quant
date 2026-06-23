from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional
from data.fetcher import fetch_stock_info
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


@router.get("/universes")
def list_universes():
    return {name: len(tickers) for name, tickers in UNIVERSES.items()}


@router.post("/filter")
def filter_universe(params: FilterParams):
    tickers = UNIVERSES.get(params.universe, [])
    results = []

    for ticker in tickers:
        try:
            info = fetch_stock_info(ticker)
            if info.get("error"):
                continue

            # Apply filters
            if params.sector and info.get("sector") != params.sector:
                continue
            pe = info.get("pe_ratio")
            if params.max_pe and pe and pe > params.max_pe:
                continue
            if params.min_pe and pe and pe < params.min_pe:
                continue
            pb = info.get("pb_ratio")
            if params.max_pb and pb and pb > params.max_pb:
                continue
            div = info.get("dividend_yield")
            if params.min_dividend_yield and (div is None or div < params.min_dividend_yield):
                continue
            mcap = info.get("market_cap")
            if params.min_market_cap and (mcap is None or mcap < params.min_market_cap):
                continue
            beta = info.get("beta")
            if params.max_beta and beta and beta > params.max_beta:
                continue
            if params.min_beta and beta and beta < params.min_beta:
                continue

            results.append(info)
        except Exception:
            continue

    return {"results": results, "total": len(results), "universe": params.universe}
