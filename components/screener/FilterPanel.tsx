"use client";
import { useState } from "react";
import { SlidersHorizontal, ChevronDown } from "lucide-react";

export interface Filters {
  universe: string;
  sector: string;
  min_pe: string;
  max_pe: string;
  max_pb: string;
  min_dividend_yield: string;
  min_market_cap: string;
  max_beta: string;
}

const UNIVERSES = ["IDX LQ45", "IDX Kompas100", "S&P 500 Top 50", "Nasdaq 100"];
const SECTORS = [
  "","Technology","Financial Services","Energy","Consumer Cyclical",
  "Healthcare","Communication Services","Industrials","Basic Materials",
  "Consumer Defensive","Real Estate","Utilities",
];

interface Props {
  filters: Filters;
  onChange: (f: Filters) => void;
  onApply: () => void;
  loading: boolean;
}

export default function FilterPanel({ filters, onChange, onApply, loading }: Props) {
  const [open, setOpen] = useState(true);
  const set = (key: keyof Filters) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    onChange({ ...filters, [key]: e.target.value });

  return (
    <div className="bg-[#11111b] border border-[#2a2a3e] rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#1a1a2e] transition-colors"
      >
        <div className="flex items-center gap-2 text-[#a6adc8] text-sm font-semibold">
          <SlidersHorizontal size={14} className="text-[#7aa2f7]" />
          Filter & Universe
        </div>
        <ChevronDown size={14} className={`text-[#6c7086] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4 border-t border-[#2a2a3e]">
          {/* Universe */}
          <div className="pt-3">
            <label className="text-[#6c7086] font-mono text-xs uppercase tracking-wider block mb-2">Universe</label>
            <div className="grid grid-cols-2 gap-1.5">
              {UNIVERSES.map(u => (
                <button
                  key={u}
                  onClick={() => onChange({ ...filters, universe: u })}
                  className={[
                    "px-2 py-1.5 rounded text-xs font-mono transition-colors text-left",
                    filters.universe === u
                      ? "bg-[#1e2035] text-[#7aa2f7] border border-[#3d59a1]/40"
                      : "text-[#6c7086] hover:text-[#a6adc8] border border-[#2a2a3e] hover:border-[#313244]",
                  ].join(" ")}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>

          {/* Sector */}
          <div>
            <label className="text-[#6c7086] font-mono text-xs uppercase tracking-wider block mb-1.5">Sector</label>
            <select
              value={filters.sector}
              onChange={set("sector")}
              className="w-full bg-[#1a1a2e] border border-[#2a2a3e] text-[#cdd6f4] text-xs rounded px-2 py-1.5 outline-none"
            >
              <option value="">All Sectors</option>
              {SECTORS.filter(Boolean).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Numeric filters */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: "min_pe" as const,              label: "P/E Min",    placeholder: "e.g. 5"   },
              { key: "max_pe" as const,              label: "P/E Max",    placeholder: "e.g. 25"  },
              { key: "max_pb" as const,              label: "P/B Max",    placeholder: "e.g. 3"   },
              { key: "min_dividend_yield" as const,  label: "Div Yield ≥ %", placeholder: "e.g. 2" },
              { key: "max_beta" as const,            label: "Beta Max",   placeholder: "e.g. 1.5" },
              { key: "min_market_cap" as const,      label: "Mkt Cap ≥ B USD", placeholder: "e.g. 1" },
            ].map(({ key, label, placeholder }) => (
              <label key={key} className="flex flex-col gap-1">
                <span className="text-[#6c7086] text-xs font-mono">{label}</span>
                <input
                  type="number" step="any" placeholder={placeholder}
                  value={filters[key]}
                  onChange={set(key)}
                  className="bg-[#0a0a0f] border border-[#2a2a3e] text-[#cdd6f4] text-xs rounded px-2 py-1.5 outline-none placeholder:text-[#313244] focus:border-[#7aa2f7]/40"
                />
              </label>
            ))}
          </div>

          <button
            onClick={onApply}
            disabled={loading}
            className="w-full py-2 bg-[#7aa2f7]/10 hover:bg-[#7aa2f7]/20 border border-[#7aa2f7]/30 text-[#7aa2f7] rounded-lg text-sm font-semibold transition-colors disabled:opacity-40"
          >
            {loading ? "Screening…" : `Screen ${filters.universe}`}
          </button>
        </div>
      )}
    </div>
  );
}
