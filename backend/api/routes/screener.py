from fastapi import APIRouter, HTTPException, Query
from typing import List
from data.fetcher import search_tickers, fetch_stock_info, fetch_batch_info_parallel, fetch_price_history

router = APIRouter()


@router.get("/search")
def search_stocks(q: str = Query(..., min_length=1)):
    results = search_tickers(q)
    return {"results": results}


@router.get("/info/{ticker}")
def get_stock_info(ticker: str):
    try:
        return fetch_stock_info(ticker.upper())
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/batch-info")
def get_batch_info(tickers: List[str]):
    upper = [t.upper() for t in tickers]
    stocks = fetch_batch_info_parallel(upper)
    return {"stocks": stocks}


@router.get("/prices/{ticker}")
def get_price_history(ticker: str, period: str = "1y"):
    try:
        prices = fetch_price_history([ticker.upper()], period=period)
        return {
            "ticker": ticker,
            "dates": [str(d.date()) for d in prices.index],
            "prices": prices.iloc[:, 0].round(4).tolist(),
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
