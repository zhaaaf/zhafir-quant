/**
 * Schema (investor profile) — the anchor of the entire user flow.
 * Chosen once on Dashboard, persists via localStorage, drives:
 *   - Screener: which columns to show + default sort
 *   - Optimizer: which model to try first + which parameters to pre-fill
 *   - Compare: which objective function ranks the models
 *   - Schedule: notification cadence
 */

export type Schema = "day" | "swing" | "position" | "long";

export interface SchemaConfig {
  key:           Schema;
  label:         string;
  icon:          string;
  color:         string;
  tagline:       string;
  holdPeriod:    string;
  defaultModel:  string;
  defaultPeriod: string;
  defaultRF:     number;        // % (e.g. 5.75)
  defaultAlpha:  number;        // for CVaR
  objective:     string;        // shown in optimizer
  // Screener
  screenerColumns: string[];    // keys matching StockInfo fields
  screenerSort:    string;      // default sort column
  screenerFilters: Record<string, number | null>;
  // Schedule
  notifCadence: string;
}

export const SCHEMAS: Record<Schema, SchemaConfig> = {
  day: {
    key:           "day",
    label:         "Day Trade",
    icon:          "⚡",
    color:         "#f7768e",
    tagline:       "Beli saat market buka, jual sebelum tutup",
    holdPeriod:    "< 1 hari (intraday)",
    defaultModel:  "cvar",
    defaultPeriod: "3mo",
    defaultRF:     5.75,
    defaultAlpha:  0.99,
    objective:     "Minimasi CVaR (tail risk) + Sharpe harian (O→C) tertinggi",
    screenerColumns: [
      "symbol", "current_price", "rsi", "bb_signal",
      "macd_cross", "momentum_3m", "ma_cross", "composite_score", "score_label",
    ],
    screenerSort:    "composite_score",
    screenerFilters: { max_beta: 2.0 },    // volatile = day-tradeable
    notifCadence:  "08:45 WIB setiap hari (sebelum market buka)",
  },

  swing: {
    key:           "swing",
    label:         "Swing Trade",
    icon:          "📈",
    color:         "#e0af68",
    tagline:       "Hold 2–14 hari, manfaatkan momentum",
    holdPeriod:    "2–14 hari",
    defaultModel:  "rmt",
    defaultPeriod: "1y",
    defaultRF:     5.75,
    defaultAlpha:  0.95,
    objective:     "Sharpe tahunan tertinggi + penalti volatilitas > 25%",
    screenerColumns: [
      "symbol", "current_price", "composite_score", "score_label",
      "momentum_3m", "momentum_6m", "f_score", "ma_cross", "rsi",
    ],
    screenerSort:    "composite_score",
    screenerFilters: {},
    notifCadence:  "08:45 WIB setiap hari",
  },

  position: {
    key:           "position",
    label:         "Position Trade",
    icon:          "📊",
    color:         "#7dcfff",
    tagline:       "Trend following — hold minggu hingga bulan",
    holdPeriod:    "Beberapa minggu – 3 bulan",
    defaultModel:  "markowitz",
    defaultPeriod: "2y",
    defaultRF:     5.75,
    defaultAlpha:  0.95,
    objective:     "Sharpe tahunan + trend filter (MA50/200 golden cross)",
    screenerColumns: [
      "symbol", "current_price", "composite_score", "score_label",
      "momentum_6m", "momentum_12m", "ma_cross", "f_score", "composite_score",
    ],
    screenerSort:    "momentum_12m",
    screenerFilters: {},
    notifCadence:  "08:45 WIB Senin (awal pekan)",
  },

  long: {
    key:           "long",
    label:         "Long Invest",
    icon:          "🌱",
    color:         "#9ece6a",
    tagline:       "Investasi 3+ bulan berdasarkan fundamental",
    holdPeriod:    "3 bulan – 3 tahun",
    defaultModel:  "entropy",
    defaultPeriod: "3y",
    defaultRF:     5.75,
    defaultAlpha:  0.95,
    objective:     "Sharpe + bonus diversifikasi (Effective N) + kualitas fundamental",
    screenerColumns: [
      "symbol", "current_price", "composite_score", "score_label",
      "f_score", "graham_signal", "margin_of_safety", "z_zone",
      "dividend_yield", "momentum_12m",
    ],
    screenerSort:    "f_score",
    screenerFilters: { max_pe: 30, min_pe: 0 },   // value-oriented
    notifCadence:  "08:45 WIB Senin (weekly check)",
  },
};

/* ── localStorage persistence ───────────────────────────────── */
const STORAGE_KEY = "zq_schema";

export function getStoredSchema(): Schema {
  if (typeof window === "undefined") return "swing";
  return (localStorage.getItem(STORAGE_KEY) as Schema) ?? "swing";
}

export function storeSchema(schema: Schema): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, schema);
  }
}

/* ── Column display metadata for UniverseTable ──────────────── */
export const COLUMN_META: Record<string, {
  label: string;
  render?: string;  // how to format: "pct" | "num" | "color_pct" | "text" | "badge"
  sortable?: boolean;
}> = {
  symbol:          { label: "Ticker",       sortable: false },
  current_price:   { label: "Harga",        sortable: true,  render: "price" },
  rsi:             { label: "RSI",          sortable: true,  render: "rsi" },
  bb_signal:       { label: "BB Signal",    sortable: false, render: "badge" },
  macd_cross:      { label: "MACD",         sortable: false, render: "badge" },
  momentum_3m:     { label: "Mom 3M",       sortable: true,  render: "color_pct" },
  momentum_6m:     { label: "Mom 6M",       sortable: true,  render: "color_pct" },
  momentum_12m:    { label: "Mom 12M",      sortable: true,  render: "color_pct" },
  ma_cross:        { label: "MA Cross",     sortable: false, render: "badge" },
  composite_score: { label: "Score",        sortable: true,  render: "score" },
  score_label:     { label: "Signal",       sortable: false, render: "badge" },
  f_score:         { label: "F-Score",      sortable: true,  render: "fscore" },
  graham_signal:   { label: "Graham",       sortable: false, render: "badge" },
  margin_of_safety:{ label: "MoS%",        sortable: true,  render: "color_pct" },
  z_zone:          { label: "Altman",       sortable: false, render: "badge" },
  dividend_yield:  { label: "Dividen",      sortable: true,  render: "pct" },
};
