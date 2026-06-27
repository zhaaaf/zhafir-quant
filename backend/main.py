from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes import screener, optimizer
from api.routes import schedule, signals, screener_filter
from api.routes import backtest_route
from api.routes import control
from api.routes import strategy
from scheduler import start_scheduler, stop_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    start_scheduler()
    yield
    stop_scheduler()


app = FastAPI(
    title="Zhafir's Quant Investing API",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(screener.router,        prefix="/api/screener",  tags=["screener"])
app.include_router(screener_filter.router, prefix="/api/universe",  tags=["universe"])
app.include_router(optimizer.router,       prefix="/api/optimizer", tags=["optimizer"])
app.include_router(signals.router,         prefix="/api/signals",   tags=["signals"])
app.include_router(schedule.router,        prefix="/api/schedule",  tags=["schedule"])
app.include_router(backtest_route.router,  prefix="/api/backtest",  tags=["backtest"])
app.include_router(control.router,         prefix="/api/control",   tags=["control"])
app.include_router(strategy.router,        prefix="/api/strategy",  tags=["strategy"])


@app.get("/")
def health():
    return {"status": "ok", "service": "Zhafir's Quant Investing API v2"}
