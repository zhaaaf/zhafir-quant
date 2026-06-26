"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Topbar from "@/components/layout/Topbar";
import SearchBar from "@/components/screener/SearchBar";
import StockTable from "@/components/screener/StockTable";
import FilterPanel, { type Filters } from "@/components/screener/FilterPanel";
import UniverseTable from "@/components/screener/UniverseTable";
import type { StockInfo } from "@/lib/types";
import { getStoredSchema, storeSchema, SCHEMAS, type Schema } from "@/lib/schema";

type Tab = "manual" | "universe";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function ScreenerPage() {
  const [schema, setSchema] = useState<Schema>("swing");
  const [tab, setTab]       = useState<Tab>("universe");
  const router              = useRouter();

  const [manualTickers, setManualTickers] = useState<string[]>([]);
  const [filters, setFilters]             = useState<Filters>({
    universe: "IDX LQ45", period: "1y", sector: "",
    min_pe: "", max_pe: "", max_pb: "",
    min_dividend_yield: "", min_market_cap: "", max_beta: "",
  });
  const [universeStocks, setUniverseStocks] = useState<StockInfo[]>([]);
  const [selected, setSelected]             = useState<Set<string>>(new Set());
  const [loading, setLoading]               = useState(false);
  const [periodLabel, setPeriodLabel]       = useState("");

  useEffect(() => {
    const s = getStoredSchema();
    setSchema(s);
    const sc = SCHEMAS[s];
    // Pre-fill period and filters based on schema
    setFilters(prev => ({
      ...prev,
      period:   sc.defaultPeriod,
      max_beta: sc.screenerFilters.max_beta != null ? String(sc.screenerFilters.max_beta) : "",
      max_pe:   sc.screenerFilters.max_pe   != null ? String(sc.screenerFilters.max_pe)   : "",
      min_pe:   sc.screenerFilters.min_pe   != null ? String(sc.screenerFilters.min_pe)   : "",
    }));
  }, []);

  const applyFilters = async () => {
    setLoading(true); setUniverseStocks([]); setSelected(new Set());
    try {
      const body = {
        universe:           filters.universe,
        period:             filters.period,
        sector:             filters.sector || null,
        max_pe:             filters.max_pe             ? +filters.max_pe             : null,
        min_pe:             filters.min_pe             ? +filters.min_pe             : null,
        max_pb:             filters.max_pb             ? +filters.max_pb             : null,
        min_dividend_yield: filters.min_dividend_yield ? +filters.min_dividend_yield / 100 : null,
        min_market_cap:     filters.min_market_cap     ? +filters.min_market_cap * 1e9 : null,
        max_beta:           filters.max_beta           ? +filters.max_beta           : null,
      };
      const res  = await fetch(`${BASE}/api/universe/filter`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const data = await res.json();
      setUniverseStocks(data.results ?? []);
      setPeriodLabel(data.period_label ?? filters.period);
    } catch { setUniverseStocks([]); }
    finally { setLoading(false); }
  };

  const toggleSelected = (sym: string) =>
    setSelected(prev => { const n = new Set(prev); n.has(sym) ? n.delete(sym) : n.add(sym); return n; });

  const selectAll = () =>
    setSelected(selected.size === universeStocks.length
      ? new Set() : new Set(universeStocks.map(s => s.symbol)));

  const sc = SCHEMAS[schema];

  return (
    <div className="min-h-screen">
      <Topbar
        title="Stock Screener"
        subtitle={`${sc.icon} ${sc.label} · ${tab === "universe" ? filters.universe : "manual"}`}
      />

      <div className="p-4 md:p-6 space-y-4">

        {/* Schema indicator */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-mono"
          style={{ borderColor: sc.color + "44", background: sc.color + "08", color: sc.color }}>
          {sc.icon} Profil aktif: {sc.label} — kolom & filter disesuaikan
          <button onClick={() => { const n: Schema = schema === "day" ? "swing" : schema === "swing" ? "long" : "day"; storeSchema(n); setSchema(n); }}
            className="ml-auto text-[#45475a] hover:text-[#6c7086] font-normal">
            ganti ▸
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-[#11111b] border border-[#2a2a3e] rounded-lg p-1 w-fit">
          {([["universe", "🔍 Universe Filter"], ["manual", "✋ Manual Search"]] as [Tab, string][]).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={["px-4 py-1.5 rounded text-sm font-semibold transition-colors",
                tab === key ? "bg-[#1e2035] text-[#7aa2f7] border border-[#3d59a1]/40" : "text-[#6c7086] hover:text-[#a6adc8]",
              ].join(" ")}>
              {label}
            </button>
          ))}
        </div>

        {tab === "universe" && (
          <>
            <FilterPanel filters={filters} onChange={setFilters} onApply={applyFilters} loading={loading} />
            <UniverseTable
              stocks={universeStocks} selected={selected}
              onToggle={toggleSelected} onSelectAll={selectAll}
              schema={schema}
            />
          </>
        )}

        {tab === "manual" && (
          <>
            <div>
              <SearchBar onAdd={t => !manualTickers.includes(t) && setManualTickers(p => [...p, t])} added={manualTickers} />
              <p className="text-[#45475a] text-xs mt-2 font-mono">
                IDX: BBCA.JK · NYSE/NASDAQ: AAPL · LSE: SHEL.L
              </p>
            </div>
            <StockTable
              tickers={manualTickers}
              onRemove={t => setManualTickers(p => p.filter(x => x !== t))}
              onSelectForOptimizer={ts => router.push(`/optimizer?tickers=${ts.join(",")}`)}
            />
          </>
        )}
      </div>
    </div>
  );
}
