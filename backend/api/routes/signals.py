from fastapi import APIRouter, Query
from typing import Literal
from data.fetcher import fetch_price_history
from models.signals import generate_signal, SCHEMA_META

router = APIRouter()


@router.get("/{ticker}")
def get_ticker_signal(
    ticker: str,
    schema: Literal["day", "swing", "long"] = Query("swing"),
):
    prices = fetch_price_history([ticker.upper()], period="3mo")
    series = prices.iloc[:, 0].dropna()
    sig = generate_signal(series, schema)
    return {
        "ticker": ticker.upper(),
        "schema": schema,
        "schema_meta": SCHEMA_META[schema],
        **sig,
    }
