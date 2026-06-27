"""TDS Bab 8: Strategy configuration API endpoint with timeframe validation."""
from fastapi import APIRouter, HTTPException
from domain.strategy_config import StrategyConfig, VALID_TIMEFRAMES, STOP_LOSS_RANGE, TradingStyle

router = APIRouter()


@router.post("/validate")
def validate_strategy(cfg: StrategyConfig):
    """
    Validate a StrategyConfig (TDS Bab 8).
    Pydantic validators enforce style/timeframe compatibility.
    Returns config + guidance if valid.
    """
    return {
        "valid":            True,
        "config":           cfg.model_dump(),
        "max_position":     cfg.max_position_size,
        "timeframe_note":   cfg.get_timeframe_note(),
        "kelly_pct":        cfg.kelly_scaling * 100,
    }


@router.get("/styles")
def get_styles():
    """Return all trading styles with valid timeframes and stop-loss ranges."""
    return {
        style.value: {
            "valid_timeframes": VALID_TIMEFRAMES[style],
            "stop_loss_range": {
                "min": STOP_LOSS_RANGE[style][0] * 100,
                "max": STOP_LOSS_RANGE[style][1] * 100,
            },
        }
        for style in TradingStyle
    }
