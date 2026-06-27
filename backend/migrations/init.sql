-- ============================================================
-- TDS Bab 5: LAZARUS DATA ARCHITECTURE — Hybrid Schema
-- PostgreSQL + TimescaleDB Hypertables
-- Run: docker exec -it quant_timescaledb psql -U quant_admin -d quant_personal_db -f /migrations/init.sql
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- ── 1. RELATIONAL TABLES (Metadata & Configuration) ─────────────────────────

CREATE TABLE IF NOT EXISTS instruments (
    instrument_id   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticker_symbol   VARCHAR(20) UNIQUE NOT NULL,
    asset_class     VARCHAR(50) NOT NULL,   -- EQUITY, ETF, CRYPTO
    exchange_name   VARCHAR(100) NOT NULL,
    market          VARCHAR(10) NOT NULL,   -- IDX, NYSE, NASDAQ
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS strategy_instances (
    instance_id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    strategy_name    VARCHAR(100) NOT NULL,
    schema_type      VARCHAR(20) NOT NULL,  -- day, swing, position, long
    model_type       VARCHAR(30) NOT NULL,  -- markowitz, cvar, rmt, entropy, quantum
    is_live_enabled  BOOLEAN DEFAULT FALSE,
    parameters_json  JSONB NOT NULL,
    allocated_capital NUMERIC(15, 4) NOT NULL,
    created_at       TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- TDS Bab 2: System constraints (Kelly, drawdown limits)
CREATE TABLE IF NOT EXISTS system_constraints (
    id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    max_drawdown_allowed   NUMERIC(5, 4) NOT NULL DEFAULT 0.1000,  -- 10%
    kelly_scaling_factor   NUMERIC(3, 2) DEFAULT 0.50,             -- Half-Kelly
    cloudflare_tunnel_id   VARCHAR(255),
    updated_at             TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO system_constraints (max_drawdown_allowed, kelly_scaling_factor)
    VALUES (0.10, 0.50) ON CONFLICT DO NOTHING;

-- TDS Bab 3: Notification log
CREATE TABLE IF NOT EXISTS operational_notifications (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    severity_level  VARCHAR(50) NOT NULL,   -- INFO, WARNING, CRITICAL
    message_text    TEXT NOT NULL,
    channel         VARCHAR(20) DEFAULT 'ntfy',  -- ntfy, telegram
    dispatched_at   TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    is_delivered    BOOLEAN DEFAULT FALSE
);

-- TDS Bab 3: Kill-Switch events
CREATE TABLE IF NOT EXISTS kill_switch_events (
    id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scope                 VARCHAR(100) NOT NULL,   -- ALL, NOTIFICATIONS, WATCHLIST
    reason                TEXT,
    timestamp             TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    prior_config_snapshot JSONB
);

-- TDS Bab 6: Backtest reports
CREATE TABLE IF NOT EXISTS backtest_reports (
    report_id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    strategy_instance_id     UUID,
    tickers                  TEXT[],
    weights_json             JSONB,
    period                   VARCHAR(10),
    total_return             NUMERIC(10, 4),
    annualized_return        NUMERIC(10, 4),
    annualized_vol           NUMERIC(10, 4),
    annualized_sharpe_ratio  NUMERIC(6, 4),
    annualized_sortino_ratio NUMERIC(6, 4),
    calmar_ratio             NUMERIC(6, 4),
    max_drawdown_pct         NUMERIC(5, 4),
    win_rate                 NUMERIC(4, 3),
    kelly_half_pct           NUMERIC(5, 2),
    initial_capital          NUMERIC(15, 4),
    final_capital            NUMERIC(15, 4),
    transaction_cost_pct     NUMERIC(5, 3),
    rebalance_freq           VARCHAR(20),
    n_rebalances             INT,
    performance_metrics_json JSONB,
    equity_curve_json        JSONB,
    created_at               TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ── 2. TIMESCALEDB HYPERTABLES (Time-Series Data) ──────────────────────────

-- Market tick data (TDS Bab 5)
CREATE TABLE IF NOT EXISTS market_data_ticks (
    timestamp     TIMESTAMPTZ NOT NULL,
    instrument_id UUID,
    open_price    NUMERIC(14, 4),
    high_price    NUMERIC(14, 4),
    low_price     NUMERIC(14, 4),
    close_price   NUMERIC(14, 4) NOT NULL,
    volume        NUMERIC(18, 2),
    adjusted      BOOLEAN DEFAULT TRUE
);

-- Convert to hypertable (weekly chunks for intraday resolution)
SELECT create_hypertable('market_data_ticks', 'timestamp',
    chunk_time_interval => INTERVAL '7 days',
    if_not_exists => TRUE);

-- Portfolio metrics history
CREATE TABLE IF NOT EXISTS portfolio_metrics_history (
    timestamp             TIMESTAMPTZ NOT NULL,
    strategy_instance_id  UUID,
    total_equity          NUMERIC(15, 4),
    cash_balance          NUMERIC(15, 4),
    unrealized_pnl        NUMERIC(15, 4),
    current_drawdown_pct  NUMERIC(5, 4),
    current_sharpe        NUMERIC(6, 4),
    current_sortino       NUMERIC(6, 4)
);

SELECT create_hypertable('portfolio_metrics_history', 'timestamp',
    chunk_time_interval => INTERVAL '1 month',
    if_not_exists => TRUE);

-- ── 3. COMPRESSION POLICIES (TDS Bab 5: target R_compression >= 0.80) ──────

ALTER TABLE market_data_ticks SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'instrument_id',
    timescaledb.compress_orderby   = 'timestamp DESC'
);
SELECT add_compression_policy('market_data_ticks', INTERVAL '7 days',
    if_not_exists => TRUE);

-- ── 4. INDEXES ──────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_instrument_time
    ON market_data_ticks (instrument_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_backtest_created
    ON backtest_reports (created_at DESC);

-- ── 5. SEED INSTRUMENTS (IDX LQ45 core) ─────────────────────────────────────

INSERT INTO instruments (ticker_symbol, asset_class, exchange_name, market) VALUES
    ('BBCA.JK', 'EQUITY', 'Indonesia Stock Exchange', 'IDX'),
    ('BBRI.JK', 'EQUITY', 'Indonesia Stock Exchange', 'IDX'),
    ('BMRI.JK', 'EQUITY', 'Indonesia Stock Exchange', 'IDX'),
    ('TLKM.JK', 'EQUITY', 'Indonesia Stock Exchange', 'IDX'),
    ('ASII.JK', 'EQUITY', 'Indonesia Stock Exchange', 'IDX'),
    ('AAPL',    'EQUITY', 'NASDAQ',                   'US'),
    ('MSFT',    'EQUITY', 'NASDAQ',                   'US'),
    ('NVDA',    'EQUITY', 'NASDAQ',                   'US'),
    ('GOOGL',   'EQUITY', 'NASDAQ',                   'US'),
    ('AMZN',    'EQUITY', 'NASDAQ',                   'US')
ON CONFLICT (ticker_symbol) DO NOTHING;

-- Done
SELECT 'TimescaleDB schema initialized ✓' AS status;
