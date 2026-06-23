"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Topbar from "@/components/layout/Topbar";
import SearchBar from "@/components/screener/SearchBar";
import StockTable from "@/components/screener/StockTable";
import FilterPanel, { type Filters } from "@/components/screener/FilterPanel";
import UniverseTable from "@/components/screener/UniverseTable";
import type { StockInfo } from "@/lib/types";

type Tab = "manual" | "universe";

const DEFAULT_FILTERS: Filters = {
  universe: "IDX LQ45",
  sector: "",
  min_pe: "", max_pe: "", max_pb: "",
  min_dividend_yield: "", min_market_cap: "", max_beta: "",
};

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function ScreenerPage() {
  const [tab, setTab] = useState<Tab>("universe");
  const router = useRouter();

  // Manual tab state
  const [manualTickers, setManualTickers] = useState<string[]>([]);

  // Universe tab state
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [universeStocks, setUniverseStocks] = useState<StockInfo[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const applyFilters = async () => {
    setLoading(true);
    setUniverseStocks([]);
    setSelected(new Set());
    try {
      const body = {
        universe: filters.universe,
        sector: filters.sector || null,
        max_pe:              filters.max_pe              ? +filters.max_pe              : null,
        min_pe:              filters.min_pe              ? +filters.min_pe              : null,
        max_pb:              filters.max_pb              ? +filters.max_pb              : null,
        min_dividend_yield:  filters.min_dividend_yield  ? +filters.min_dividend_yield / 100 : null,
        min_market_cap:      filters.min_market_cap      ? +filters.min_market_cap * 1e9 : null,
        max_beta:            filters.max_beta            ? +filters.max_beta            : null,
      };
      const res = await fetch(`${BASE}/api/universe/filter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      setUniverseStocks(data.results ?? []);
    } catch {
      setUniverseStocks([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelected = (sym: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(sym) ? next.delete(sym) : next.add(sym);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === universeStocks.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(universeStocks.map(s => s.symbol)));
    }
  };

  return (
    <div className="min-h-screen">
      <Topbar
        title="Stock Screener"
        subtitle={tab === "universe" ? `${filters.universe}` : "manual search"}
      />

      <div className="p-6 space-y-5">
        {/* Tabs */}
        <div className="flex gap-1 bg-[#11111b] border border-[#2a2a3e] rounded-lg p-1 w-fit">
          {([["universe","🔍 Universe Filter"],["manual","✋ Manual Search"]] as [Tab, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={[
                "px-4 py-1.5 rounded text-sm font-semibold transition-colors",
                tab === key
                  ? "bg-[#1e2035] text-[#7aa2f7] border border-[#3d59a1]/40"
                  : "text-[#6c7086] hover:text-[#a6adc8]",
              ].join(" ")}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "universe" && (
          <>
            <FilterPanel
              filters={filters}
              onChange={setFilters}
              onApply={applyFilters}
              loading={loading}
            />
            <UniverseTable
              stocks={universeStocks}
              selected={selected}
              onToggle={toggleSelected}
              onSelectAll={selectAll}
            />
          </>
        )}

        {tab === "manual" && (
          <>
            <div>
              <SearchBar onAdd={t => !manualTickers.includes(t) && setManualTickers(p => [...p, t])} added={manualTickers} />
              <p className="text-[#45475a] text-xs mt-2 font-mono">
                IDX: BBCA.JK · NYSE/NASDAQ: AAPL · LSE: SHEL.L · HKEX: 0700.HK
              </p>
            </div>
            <StockTable
              tickers={manualTickers}
              onRemove={t => setManualTickers(p => p.filter(x => x !== t))}
              onSelectForOptimizer={ts => {
                const params = new URLSearchParams({ tickers: ts.join(",") });
                router.push(`/optimizer?${params}`);
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}
