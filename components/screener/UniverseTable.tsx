"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { StockInfo } from "@/lib/types";
import { fmtMcap, fmtPct, fmt } from "@/lib/utils";
import { TrendingUp, CheckSquare, Square } from "lucide-react";

interface Props {
  stocks: StockInfo[];
  selected: Set<string>;
  onToggle: (symbol: string) => void;
  onSelectAll: () => void;
}

export default function UniverseTable({ stocks, selected, onToggle, onSelectAll }: Props) {
  const router = useRouter();

  if (!stocks.length) {
    return (
      <div className="text-center py-12 text-[#45475a] border border-[#2a2a3e] rounded-xl bg-[#11111b]">
        <div className="text-3xl mb-2">🔍</div>
        <div className="text-sm">Apply filters to screen stocks</div>
      </div>
    );
  }

  const goOptimize = () => {
    if (!selected.size) return;
    const params = new URLSearchParams({ tickers: [...selected].join(",") });
    router.push(`/optimizer?${params}`);
  };

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <button onClick={onSelectAll} className="flex items-center gap-1.5 text-xs text-[#6c7086] hover:text-[#7aa2f7] transition-colors">
            {selected.size === stocks.length
              ? <CheckSquare size={13} className="text-[#7aa2f7]" />
              : <Square size={13} />}
            {selected.size === stocks.length ? "Deselect All" : "Select All"}
          </button>
          {selected.size > 0 && (
            <span className="text-[#7aa2f7] text-xs font-mono">{selected.size} selected</span>
          )}
        </div>
        {selected.size >= 2 && (
          <button
            onClick={goOptimize}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#7aa2f7]/10 hover:bg-[#7aa2f7]/20 border border-[#7aa2f7]/30 text-[#7aa2f7] rounded-lg text-xs font-semibold transition-colors"
          >
            <TrendingUp size={12} />
            Optimize {selected.size} stocks
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border border-[#2a2a3e]">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[#2a2a3e] bg-[#11111b]">
              <th className="w-8 px-2 py-3"></th>
              {["Ticker","Company","Sector","Price","Mkt Cap","P/E","P/B","Beta","Div Yield"].map(h => (
                <th key={h} className="px-3 py-3 text-left text-[#6c7086] font-mono uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stocks.map(s => (
              <tr
                key={s.symbol}
                onClick={() => onToggle(s.symbol)}
                className={[
                  "border-b border-[#1e1e2e] cursor-pointer transition-colors",
                  selected.has(s.symbol) ? "bg-[#1e2035] hover:bg-[#252545]" : "hover:bg-[#1a1a2e]/50",
                ].join(" ")}
              >
                <td className="px-2 py-2.5 text-center">
                  {selected.has(s.symbol)
                    ? <CheckSquare size={12} className="text-[#7aa2f7] mx-auto" />
                    : <Square size={12} className="text-[#45475a] mx-auto" />}
                </td>
                <td className="px-3 py-2.5 font-mono font-bold text-[#7aa2f7]">{s.symbol}</td>
                <td className="px-3 py-2.5 text-[#cdd6f4] max-w-[160px] truncate">{s.name}</td>
                <td className="px-3 py-2.5 text-[#6c7086]">{s.sector ?? "—"}</td>
                <td className="px-3 py-2.5 font-mono text-[#cdd6f4]">
                  {s.current_price != null
                    ? `${s.currency === "IDR" ? "Rp" : "$"}${s.current_price.toLocaleString()}`
                    : "—"}
                </td>
                <td className="px-3 py-2.5 font-mono text-[#6c7086]">{fmtMcap(s.market_cap)}</td>
                <td className="px-3 py-2.5 font-mono">
                  <span className={s.pe_ratio != null && s.pe_ratio < 15 ? "text-[#9ece6a]" : "text-[#a6adc8]"}>
                    {fmt(s.pe_ratio)}
                  </span>
                </td>
                <td className="px-3 py-2.5 font-mono text-[#a6adc8]">{fmt(s.pb_ratio)}</td>
                <td className="px-3 py-2.5 font-mono">
                  <span className={s.beta != null && s.beta > 1.5 ? "text-[#f7768e]" : "text-[#a6adc8]"}>
                    {fmt(s.beta)}
                  </span>
                </td>
                <td className="px-3 py-2.5 font-mono text-[#9ece6a]">
                  {s.dividend_yield != null ? fmtPct(s.dividend_yield) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-2 text-[#45475a] text-xs font-mono text-right">{stocks.length} stocks found</div>
    </div>
  );
}
