import yfinance as yf
import pandas as pd
import numpy as np
from typing import List

def fetch_price_history(tickers: List[str], period: str = "2y") -> pd.DataFrame:
    data = yf.download(tickers, period=period, auto_adjust=True, progress=False)
    if len(tickers) == 1:
        prices = data[["Close"]]
        prices.columns = tickers
    else:
        prices = data["Close"]
    return prices.dropna()

def fetch_stock_info(ticker: str) -> dict:
    stock = yf.Ticker(ticker)
    info = stock.info
    return {
        "symbol": ticker,
        "name": info.get("longName", ticker),
        "sector": info.get("sector", "N/A"),
        "industry": info.get("industry", "N/A"),
        "market_cap": info.get("marketCap"),
        "pe_ratio": info.get("trailingPE"),
        "pb_ratio": info.get("priceToBook"),
        "dividend_yield": info.get("dividendYield"),
        "beta": info.get("beta"),
        "52w_high": info.get("fiftyTwoWeekHigh"),
        "52w_low": info.get("fiftyTwoWeekLow"),
        "current_price": info.get("currentPrice") or info.get("regularMarketPrice"),
        "volume": info.get("volume"),
        "avg_volume": info.get("averageVolume"),
        "currency": info.get("currency", "USD"),
        "exchange": info.get("exchange", ""),
    }

def search_tickers(query: str, limit: int = 20) -> List[dict]:
    try:
        results = yf.Search(query, max_results=limit)
        quotes = results.quotes
        return [
            {
                "symbol": q.get("symbol", ""),
                "name": q.get("shortname") or q.get("longname", ""),
                "exchange": q.get("exchange", ""),
                "type": q.get("quoteType", ""),
            }
            for q in quotes
            if q.get("quoteType") in ("EQUITY", "ETF")
        ]
    except Exception:
        return []

def compute_returns(prices: pd.DataFrame) -> pd.DataFrame:
    return np.log(prices / prices.shift(1)).dropna()

def compute_stats(prices: pd.DataFrame) -> dict:
    returns = compute_returns(prices)
    mean_returns = returns.mean() * 252
    cov_matrix = returns.cov() * 252
    return {
        "mean_returns": mean_returns,
        "cov_matrix": cov_matrix,
        "returns": returns,
    }
