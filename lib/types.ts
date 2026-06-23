export interface StockSearchResult {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
}

export interface StockInfo {
  symbol: string;
  name: string;
  sector: string;
  industry: string;
  market_cap?: number;
  pe_ratio?: number;
  pb_ratio?: number;
  dividend_yield?: number;
  beta?: number;
  "52w_high"?: number;
  "52w_low"?: number;
  current_price?: number;
  volume?: number;
  avg_volume?: number;
  currency: string;
  exchange: string;
  error?: string;
}

export interface PriceHistory {
  ticker: string;
  dates: string[];
  prices: number[];
}

export type ModelType = "markowitz" | "cvar" | "rmt" | "quantum" | "entropy";

export interface OptimizeRequest {
  tickers: string[];
  model: ModelType;
  period?: string;
  target_return?: number;
  risk_aversion?: number;
  alpha?: number;
  allow_short?: boolean;
  risk_free_rate?: number;
}

export interface RmtStats {
  n_signal: number;
  n_noise: number;
  lambda_max: number;
  lambda_min: number;
  eigenvalues: number[];
  signal_eigenvalues: number[];
}

export interface OptimizeResult {
  tickers: string[];
  weights: number[];
  weights_map: Record<string, number>;
  expected_return: number;
  volatility: number;
  sharpe_ratio: number;
  model: ModelType;
  success?: boolean;
  cvar?: number;
  var?: number;
  entropy?: number;
  effective_n?: number;
  n_selected?: number;
  selected_assets?: boolean[];
  qubo_energy?: number;
  risk_aversion?: number;
  rmt_stats?: RmtStats;
}

export interface FrontierPoint {
  volatility: number;
  expected_return: number;
  sharpe_ratio?: number;
  cvar?: number;
}

export interface FrontierResult {
  frontier: FrontierPoint[];
  tickers: string[];
  model: ModelType;
}
