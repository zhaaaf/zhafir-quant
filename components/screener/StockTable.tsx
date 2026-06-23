"use client";
import { useState, useEffect } from "react";
import { Loader2, X, TrendingUp } from "lucide-react";
import { api } from "@/lib/api";
import type { StockInfo } from "@/lib/types";
import { fmtMcap, fmtPct, fmt } from "@/lib/utils";
import Link from "next/link";

interface Props {
  tickers: string[];
  onRemove: (t: string) => void;
  onSelectForOptimizer: (tickers: string[]) => void;
}

export default function StockTable({ tickers, onRemove, onSelectForOptimizer }: Props) {
  const [stocks, setStocks] = useState<Record<string, StockInfo>>({});
  const [loading, setLoading] = useState<string[]>([]);

  useEffect(() => {
    const toFetch = tickers.filter(t => !stocks[t]);
    if (!toFetch.length) return;
    setLoading(prev => [...prev, ...toFetch]);
    api.screener.batchInfo(toFetch).then(res => {
      const map: Record<string, StockInfo> = {};
      res.stocks.forEach(s => { map[s.symbol] = s; });
      setStocks(prev => ({ ...prev, ...map }));
      setLoading(prev => prev.filter(t => !toFetch.includes(t)));
    });
  }, [tickers]);

  if (!tickers.length) {
    return (
      <div className="text-center py-16 text-[#45475a]">
        <div className="text-4xl mb-3">📊</div>
        <div className="text-sm">Search and add stocks to start screening</div>
      </div>
    );
  }

  const loaded = tickers.filter(t => stocks[t]);

  const cols = [
    { key: "symbol",         label: "Ticker" },
    { key: "name",           label: "Company" },
    { key: "sector",         label: "Sector" },
    { key: "current_price",  label: "Price" },
    { key: "market_cap",     label: "Mkt Cap" },
    { key: "pe_ratio",       label: "P/E" },
    { key: "pb_ratio",       label: "P/B" },
    { key: "beta",           label: "Beta" },
    { key: "dividend_yield", label: "Div Yield" },
    { key: "52w_high",       label: "52W High" },
    { key: "52w_low",        label: "52W Low" },
  ];

  return (
    <div>
      {loaded.length >= 2 && (
        <div className="flex justify-end mb-3">
          <button
            onClick={() => onSelectForOptimizer(tickers)}
            className="flex items-center gap-2 px-4 py-2 bg-[#7aa2f7]/10 hover:bg-[#7aa2f7]/20 border border-[#7aa2f7]/30 text-[#7aa2f7] rounded-lg text-sm transition-colors"
          >
            <TrendingUp size={13} />
            Optimize Portfolio ({tickers.length} stocks)
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-[#2a2a3e]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2a2a3e] bg-[#11111b]">
              {cols.map(c => (
                <th key={c.key} className="px-4 py-3 text-left text-[#6c7086] font-mono text-xs uppercase tracking-wider whitespace-nowrap">
                  {c.label}
                </th>
              ))}
              <th className="px-4 py-3 text-[#6c7086] font-mono text-xs uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tickers.map(ticker => {
              const s = stocks[ticker];
              const isLoading = loading.includes(ticker);
              return (
                <tr key={ticker} className="border-b border-[#1e1e2e] hover:bg-[#1a1a2e]/50 transition-colors">
                  {isLoading || !s ? (
                    <td colSpan={cols.length + 1} className="px-4 py-3">
                      <div className="flex items-center gap-2 text-[#6c7086]">
                        <Loader2 size={12} className="animate-spin" />
                        <span className="font-mono text-xs">{ticker}</span>
                        <span className="text-xs">Loading…</span>
                      </div>
                    </td>
                  ) : (
                    <>
                      <td className="px-4 py-3">
                        <Link href={`/screener/${s.symbol}`} className="font-mono font-bold text-[#7aa2f7] hover:underline">
                          {s.symbol}
                        </Link>
                        <div className="text-[#6c7086] text-xs">{s.exchange} · {s.currency}</div>
                      </td>
                      <td className="px-4 py-3 text-[#cdd6f4] max-w-[180px] truncate">{s.name}</td>
                      <td className="px-4 py-3 text-[#a6adc8] text-xs">{s.sector}</td>
                      <td className="px-4 py-3 font-mono text-[#cdd6f4]">
                        {s.current_price != null ? `${s.currency === "IDR" ? "Rp" : "$"}${s.current_price.toLocaleString()}` : "—"}
                      </td>
                      <td className="px-4 py-3 font-mono text-[#a6adc8] text-xs">{fmtMcap(s.market_cap)}</td>
                      <td className="px-4 py-3 font-mono text-xs">
                        <span className={s.pe_ratio != null && s.pe_ratio < 15 ? "text-[#9ece6a]" : "text-[#a6adc8]"}>
                          {fmt(s.pe_ratio)}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-[#a6adc8] text-xs">{fmt(s.pb_ratio)}</td>
                      <td className="px-4 py-3 font-mono text-xs">
                        <span className={s.beta != null && s.beta > 1.5 ? "text-[#f7768e]" : "text-[#a6adc8]"}>
                          {fmt(s.beta)}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-[#9ece6a] text-xs">
                        {s.dividend_yield != null ? fmtPct(s.dividend_yield) : "—"}
                      </td>
                      <td className="px-4 py-3 font-mono text-[#a6adc8] text-xs">
                        {s["52w_high"] != null ? s["52w_high"].toLocaleString() : "—"}
                      </td>
                      <td className="px-4 py-3 font-mono text-[#a6adc8] text-xs">
                        {s["52w_low"] != null ? s["52w_low"].toLocaleString() : "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => onRemove(ticker)} className="text-[#45475a] hover:text-[#f7768e] transition-colors p-1 rounded">
                          <X size={12} />
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
