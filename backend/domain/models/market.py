"""
TDS Bab 4: Domain Layer — Pure Financial Entities
Clean Architecture: Domain layer has NO external dependencies (no I/O, no DB, no API).

Design Patterns implemented:
  A. Strategy Pattern — TradingStrategy ABC isolates signal generation from I/O
  B. Observer Pattern — MarketDataDispatcher broadcasts ticks to all observers
  C. Factory Pattern — OrderFactory creates broker-specific order objects

Reference: TDS Platform Kuantitatif Bab 4, Kontrol Implementasi
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import List, Dict, Any, Optional


# ── Value Objects (immutable domain primitives) ───────────────────────────────

@dataclass(frozen=True)
class MarketTick:
    """Single price event — immutable value object (TDS Bab 4)."""
    symbol:    str
    price:     float
    volume:    float
    timestamp: datetime
    bid:       Optional[float] = None
    ask:       Optional[float] = None

    @property
    def mid_price(self) -> float:
        if self.bid and self.ask:
            return (self.bid + self.ask) / 2
        return self.price

    @property
    def spread(self) -> float:
        if self.bid and self.ask:
            return self.ask - self.bid
        return 0.0


class OrderSide(str, Enum):
    BUY  = "BUY"
    SELL = "SELL"


class OrderType(str, Enum):
    MARKET = "MARKET"
    LIMIT  = "LIMIT"
    STOP   = "STOP"


@dataclass(frozen=True)
class Order:
    """Broker-agnostic order entity."""
    symbol:       str
    side:         OrderSide
    order_type:   OrderType
    quantity:     float
    limit_price:  Optional[float] = None
    stop_price:   Optional[float] = None
    portfolio_id: Optional[str]   = None


@dataclass
class Position:
    """Current holding in a portfolio."""
    symbol:           str
    quantity:         float
    avg_cost:         float
    current_price:    float = 0.0

    @property
    def market_value(self) -> float:
        return self.quantity * self.current_price

    @property
    def unrealized_pnl(self) -> float:
        return (self.current_price - self.avg_cost) * self.quantity

    @property
    def pnl_pct(self) -> float:
        if self.avg_cost <= 0:
            return 0.0
        return (self.current_price / self.avg_cost - 1) * 100


@dataclass
class Signal:
    """Trading signal output from a strategy."""
    symbol:      str
    action:      str              # BUY | SELL | HOLD | WATCH
    confidence:  float            # 0.0 – 1.0
    schema:      str              # day | swing | position | long
    reasons:     List[str] = field(default_factory=list)
    metadata:    Dict[str, Any] = field(default_factory=dict)


# ── B. Observer Pattern: Market Data Dispatcher ───────────────────────────────

class MarketDataObserver(ABC):
    """
    TDS Bab 4 Observer Pattern: any module that needs market data
    must implement on_tick() — risk engine, indicator calculator, UI telemetry.
    """
    @abstractmethod
    async def on_tick(self, tick: MarketTick) -> None:
        """Called asynchronously on every new market tick."""
        pass


class MarketDataDispatcher:
    """
    Pub/Sub dispatcher for market ticks.
    Observers attach() once; dispatcher.notify() broadcasts to all.
    """
    def __init__(self) -> None:
        self._observers: List[MarketDataObserver] = []

    def attach(self, observer: MarketDataObserver) -> None:
        if observer not in self._observers:
            self._observers.append(observer)

    def detach(self, observer: MarketDataObserver) -> None:
        self._observers = [o for o in self._observers if o is not observer]

    async def notify(self, tick: MarketTick) -> None:
        for observer in self._observers:
            await observer.on_tick(tick)

    @property
    def observer_count(self) -> int:
        return len(self._observers)


# ── A. Strategy Pattern: Alpha Generator ─────────────────────────────────────

class TradingStrategy(ABC):
    """
    TDS Bab 4 Strategy Pattern: isolates signal math from I/O side effects.
    Concrete strategies (Markowitz, CVaR, Momentum) implement generate_signal()
    without knowing anything about broker APIs or databases.
    """
    @abstractmethod
    def generate_signal(self, tick: MarketTick,
                        context: Dict[str, Any]) -> Signal:
        """Pure function: price data → signal. No I/O allowed."""
        pass

    @property
    def name(self) -> str:
        return self.__class__.__name__


class MomentumStrategy(TradingStrategy):
    """Simple moving average momentum — example concrete strategy."""
    def __init__(self, fast_window: int = 20, slow_window: int = 50) -> None:
        self.fast = fast_window
        self.slow = slow_window

    def generate_signal(self, tick: MarketTick, context: Dict[str, Any]) -> Signal:
        ma_fast = context.get("ma_fast", tick.price)
        ma_slow = context.get("ma_slow", tick.price)
        rsi     = context.get("rsi", 50)

        if ma_fast > ma_slow and rsi < 65:
            action, confidence = "BUY", 0.7
        elif ma_fast < ma_slow or rsi > 75:
            action, confidence = "SELL", 0.65
        else:
            action, confidence = "HOLD", 0.5

        return Signal(
            symbol=tick.symbol, action=action,
            confidence=confidence, schema="swing",
            reasons=[f"MA{self.fast}{'>' if ma_fast > ma_slow else '<'}MA{self.slow}",
                     f"RSI {rsi:.0f}"],
        )


# ── C. Factory Pattern: Order Creation ───────────────────────────────────────

class OrderFactory:
    """
    TDS Bab 4 Factory Pattern: creates Orders from abstract signals
    without coupling the signal layer to specific broker schemas.
    """
    @staticmethod
    def market_order(signal: Signal, quantity: float) -> Order:
        side = OrderSide.BUY if signal.action == "BUY" else OrderSide.SELL
        return Order(symbol=signal.symbol, side=side,
                     order_type=OrderType.MARKET, quantity=quantity)

    @staticmethod
    def limit_order(signal: Signal, quantity: float,
                    limit_price: float) -> Order:
        side = OrderSide.BUY if signal.action == "BUY" else OrderSide.SELL
        return Order(symbol=signal.symbol, side=side,
                     order_type=OrderType.LIMIT, quantity=quantity,
                     limit_price=limit_price)

    @staticmethod
    def stop_loss_order(symbol: str, quantity: float,
                        stop_price: float) -> Order:
        return Order(symbol=symbol, side=OrderSide.SELL,
                     order_type=OrderType.STOP, quantity=quantity,
                     stop_price=stop_price)
