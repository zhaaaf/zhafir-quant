from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
import numpy as np

from data.fetcher import fetch_price_history
from models.backtest import backtest_portfolio, benchmark_returns
from models.kelly import portfolio_kelly

router = APIRouter()


class BacktestRequest(BaseModel):
    tickers:          List[str] = Field(..., min_length=1, max_length=20)
    weights:          dict[str, float]           # {ticker: weight}
    period:           str  = "2y"                # data lookback
    initial_capital:  float = 10_000
    transaction_cost: float = Field(default=0.001, ge=0, le=0.05)   # 0.1% default
    rebalance_freq:   Literal["daily", "weekly", "monthly"] = "monthly"
    rf_annual:        float = 0.0575
    run_benchmark:    bool  = True


@router.post("/run")
def run_backtest(req: BacktestRequest):
    """
    Vectorized portfolio backtest (TDS Bab 6).
    Metrics: Sharpe, Sortino, Max Drawdown, Calmar, Win Rate, VaR/CVaR, Equity Curve.
    Transaction cost model: fixed commission γ per rebalance turnover.
    """
    try:
        tickers = [t.upper() for t in req.tickers]
        prices  = fetch_price_history(tickers, period=req.period)

        # Normalise weights to available tickers
        weights = {t.upper(): w for t, w in req.weights.items()
                   if t.upper() in prices.columns}
        if not weights:
            raise HTTPException(400, "No valid tickers with price data")
        total = sum(weights.values())
        weights = {t: w / total for t, w in weights.items()}

        result = backtest_portfolio(
            prices_df        = prices,
            weights          = weights,
            initial_capital  = req.initial_capital,
            transaction_cost = req.transaction_cost,
            rebalance_freq   = req.rebalance_freq,
            rf_annual        = req.rf_annual,
        )

        if "error" in result:
            raise HTTPException(400, result["error"])

        # Kelly sizing from backtest returns
        daily_rets = np.array(result["daily_returns"]) / 100
        kelly = portfolio_kelly(weights, daily_rets,
                                capital=req.initial_capital)
        result["kelly"] = kelly

        # Benchmark (equal-weight buy-and-hold)
        if req.run_benchmark:
            bench = benchmark_returns(prices, tickers)
            if bench and "error" not in bench:
                result["benchmark"] = {
                    "total_return":      bench["total_return"],
                    "annualized_return": bench["annualized_return"],
                    "sharpe_ratio":      bench["sharpe_ratio"],
                    "sortino_ratio":     bench["sortino_ratio"],
                    "max_drawdown":      bench["max_drawdown"],
                    "equity_curve":      bench["equity_curve"],
                }

        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))
