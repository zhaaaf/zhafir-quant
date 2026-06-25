import yfinance as yf
import pandas as pd
import numpy as np
from typing import List
from concurrent.futures import ThreadPoolExecutor, as_completed
import time
import threading

# ── TTL cache: {ticker: (data, timestamp)} ──────────────────────────────────
_CACHE: dict = {}
_CACHE_TTL = 1800  # 30 minutes
_CACHE_LOCK = threading.Lock()


def _cache_get(ticker: str):
    with _CACHE_LOCK:
        entry = _CACHE.get(ticker)
        if entry and time.time() - entry[1] < _CACHE_TTL:
            return entry[0]
    return None


def _cache_set(ticker: str, data: dict):
    with _CACHE_LOCK:
        _CACHE[ticker] = (data, time.time())


# ── Single ticker info ───────────────────────────────────────────────────────
def fetch_stock_info(ticker: str) -> dict:
    cached = _cache_get(ticker)
    if cached:
        return cached

    stock = yf.Ticker(ticker)
    info = stock.info
    result = {
        "symbol":         ticker,
        "name":           info.get("longName", ticker),
        "sector":         info.get("sector", "N/A"),
        "industry":       info.get("industry", "N/A"),
        "market_cap":     info.get("marketCap"),
        "pe_ratio":       info.get("trailingPE"),
        "pb_ratio":       info.get("priceToBook"),
        "dividend_yield": info.get("dividendYield"),
        "beta":           info.get("beta"),
        "52w_high":       info.get("fiftyTwoWeekHigh"),
        "52w_low":        info.get("fiftyTwoWeekLow"),
        "current_price":  info.get("currentPrice") or info.get("regularMarketPrice"),
        "volume":         info.get("volume"),
        "avg_volume":     info.get("averageVolume"),
        "currency":       info.get("currency", "USD"),
        "exchange":       info.get("exchange", ""),
    }
    _cache_set(ticker, result)
    return result


# ── Parallel batch fetch ─────────────────────────────────────────────────────
def fetch_batch_info_parallel(tickers: List[str], max_workers: int = 12) -> List[dict]:
    """Fetch info for multiple tickers in parallel. Cached results skip the network."""
    results = {}

    def _fetch(ticker: str):
        try:
            return ticker, fetch_stock_info(ticker)
        except Exception:
            return ticker, None

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {executor.submit(_fetch, t): t for t in tickers}
        for future in as_completed(futures):
            ticker, data = future.result()
            if data:
                results[ticker] = data

    # Return in original order
    return [results[t] for t in tickers if t in results]


# ── Price history ────────────────────────────────────────────────────────────
def fetch_price_history(tickers: List[str], period: str = "2y") -> pd.DataFrame:
    data = yf.download(tickers, period=period, auto_adjust=True, progress=False)
    if len(tickers) == 1:
        prices = data[["Close"]]
        prices.columns = tickers
    else:
        prices = data["Close"]
    return prices.dropna()


# ── Search ───────────────────────────────────────────────────────────────────
def search_tickers(query: str, limit: int = 20) -> List[dict]:
    try:
        results = yf.Search(query, max_results=limit)
        return [
            {
                "symbol":   q.get("symbol", ""),
                "name":     q.get("shortname") or q.get("longname", ""),
                "exchange": q.get("exchange", ""),
                "type":     q.get("quoteType", ""),
            }
            for q in results.quotes
            if q.get("quoteType") in ("EQUITY", "ETF")
        ]
    except Exception:
        return []


# ── Returns & stats ──────────────────────────────────────────────────────────
def compute_returns(prices: pd.DataFrame) -> pd.DataFrame:
    return np.log(prices / prices.shift(1)).dropna()


def compute_stats(prices: pd.DataFrame) -> dict:
    returns = compute_returns(prices)
    return {
        "mean_returns": returns.mean() * 252,
        "cov_matrix":   returns.cov() * 252,
        "returns":      returns,
    }
