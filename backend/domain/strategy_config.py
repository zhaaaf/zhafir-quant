"""
TDS Bab 8: StrategyConfig — Pydantic validation for trading style + timeframe.
Prevents user from mixing incompatible styles and timeframes.

Trading Styles Matrix (TDS Bab 8):
  DAYTRADE  → 1m, 5m, 15m        (intraday kill-switch)
  SWING     → 1h, 4h             (overnight hold, trailing stop)
  TRADING   → 1d                 (trend following, weeks)
  INVEST    → 1d, 1wk            (DCA accumulation)
"""
from pydantic import BaseModel, Field, field_validator, model_validator
from enum import Enum
from typing import List, Optional


class UniverseType(str, Enum):
    IDX = "IDX_STOCKS"
    US  = "US_STOCKS"


class TradingStyle(str, Enum):
    DAYTRADE = "DAYTRADE"
    SWING    = "SWING"
    TRADING  = "TRADING"    # Position trading (weeks–months)
    INVEST   = "INVEST"


VALID_TIMEFRAMES: dict[TradingStyle, list[str]] = {
    TradingStyle.DAYTRADE: ["1m", "5m", "15m"],
    TradingStyle.SWING:    ["1h", "4h"],
    TradingStyle.TRADING:  ["1d"],
    TradingStyle.INVEST:   ["1d", "1wk"],
}

STOP_LOSS_RANGE: dict[TradingStyle, tuple[float, float]] = {
    TradingStyle.DAYTRADE: (0.005, 0.015),   # 0.5–1.5%
    TradingStyle.SWING:    (0.03,  0.06),    # 3–6%
    TradingStyle.TRADING:  (0.08,  0.15),    # 8–15%
    TradingStyle.INVEST:   (0.0,   0.50),    # very wide / none
}


class StrategyConfig(BaseModel):
    """
    TDS Bab 8: Validated strategy configuration.
    Ensures timeframe matches trading style; prevents mixing incompatible params.
    """
    instance_name:       str
    universe:            UniverseType
    symbols:             List[str]  = Field(..., min_length=1, max_length=50)
    style:               TradingStyle
    timeframe:           str
    stop_loss_pct:       float      = Field(default=0.02, ge=0.0, le=0.5)
    initial_capital:     float      = Field(default=10_000, ge=100, le=1_000_000_000)
    kelly_scaling:       float      = Field(default=0.5, ge=0.1, le=1.0)
    is_live:             bool       = False
    broker:              Optional[str] = None  # "alpaca" | "ibkr" | None (signal-only)

    @field_validator("timeframe")
    @classmethod
    def validate_timeframe(cls, v: str, info) -> str:
        style = info.data.get("style")
        if style and v not in VALID_TIMEFRAMES.get(style, []):
            allowed = VALID_TIMEFRAMES.get(style, [])
            raise ValueError(
                f"{style} membutuhkan timeframe {allowed}, bukan '{v}'. "
                f"(TDS Bab 8: Trading Styles Matrix)"
            )
        return v

    @field_validator("symbols")
    @classmethod
    def validate_symbols(cls, v: List[str]) -> List[str]:
        if len(v) > 500:
            raise ValueError("Maksimum 500 aset per strategi (TDS Bab 1: Validation Rules)")
        return [s.upper() for s in v]

    @model_validator(mode="after")
    def validate_stop_loss_range(self) -> "StrategyConfig":
        lo, hi = STOP_LOSS_RANGE[self.style]
        if not (lo <= self.stop_loss_pct <= hi):
            raise ValueError(
                f"Stop loss {self.stop_loss_pct*100:.1f}% di luar range "
                f"{lo*100:.1f}%–{hi*100:.1f}% untuk style {self.style}. "
                f"(TDS Bab 8: Trading Styles Matrix)"
            )
        return self

    @model_validator(mode="after")
    def validate_live_requires_broker(self) -> "StrategyConfig":
        if self.is_live and not self.broker:
            raise ValueError("Live trading membutuhkan broker API key. Set broker='alpaca' atau 'ibkr'.")
        return self

    @property
    def max_position_size(self) -> float:
        """Kelly-scaled max position size in base currency."""
        return self.initial_capital * self.kelly_scaling

    def get_timeframe_note(self) -> str:
        notes = {
            TradingStyle.DAYTRADE: "Intraday Kill-Switch: tutup semua posisi 15 menit sebelum market tutup.",
            TradingStyle.SWING:    "Overnight hold 2–14 hari. Trailing stop menengah.",
            TradingStyle.TRADING:  "Trend following. Tahan selama struktur tren belum patah.",
            TradingStyle.INVEST:   "DCA accumulation. Fokus sinyal beli, abaikan volatilitas minor.",
        }
        return notes.get(self.style, "")
