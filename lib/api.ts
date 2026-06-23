import type {
  StockSearchResult, StockInfo, PriceHistory,
  OptimizeRequest, OptimizeResult, FrontierResult,
} from "./types";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body.detail ?? "API error");
  }
  return res.json() as Promise<T>;
}

export const api = {
  screener: {
    search: (q: string) =>
      req<{ results: StockSearchResult[] }>(`/api/screener/search?q=${encodeURIComponent(q)}`),

    info: (ticker: string) =>
      req<StockInfo>(`/api/screener/info/${ticker}`),

    batchInfo: (tickers: string[]) =>
      req<{ stocks: StockInfo[] }>(`/api/screener/batch-info`, {
        method: "POST",
        body: JSON.stringify(tickers),
      }),

    prices: (ticker: string, period = "1y") =>
      req<PriceHistory>(`/api/screener/prices/${ticker}?period=${period}`),
  },

  optimizer: {
    optimize: (body: OptimizeRequest) =>
      req<OptimizeResult>(`/api/optimizer/optimize`, {
        method: "POST",
        body: JSON.stringify(body),
      }),

    frontier: (body: OptimizeRequest) =>
      req<FrontierResult>(`/api/optimizer/frontier`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
  },
};
