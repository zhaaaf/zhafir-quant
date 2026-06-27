"use client";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { StockInfo } from "@/lib/types";
import { fmtMcap, fmtPct, fmt } from "@/lib/utils";
import { SCHEMAS, type Schema } from "@/lib/schema";
import { TrendingUp, CheckSquare, Square, ChevronUp, ChevronDown, ChevronsUpDown, Columns } from "lucide-react";

interface Props {
  stocks: StockInfo[];
  selected: Set<string>;
  onToggle: (symbol: string) => void;
  onSelectAll: () => void;
  schema?: Schema;
}

type SortDir = "asc" | "desc";

interface Col {
  key: keyof StockInfo | string;
  label: string;
  sortable?: boolean;
  render: (s: StockInfo) => React.ReactNode;
  getValue?: (s: StockInfo) => number | null;
  group?: "basic" | "score";
}

const SCORE_COLOR: Record<string, string> = {
  "Strong Buy": "#9ece6a",
  "Buy":        "#7aa2f7",
  "Neutral":    "#e0af68",
  "Weak":       "#f7768e",
  "Avoid":      "#f7768e",
};

const GRAHAM_COLOR: Record<string, string> = {
  "Undervalued": "#9ece6a",
  "Fair":        "#e0af68",
  "Overvalued":  "#f7768e",
  "N/A":         "#45475a",
};

const F_COLOR: Record<string, string> = {
  "Strong":  "#9ece6a",
  "Neutral": "#e0af68",
  "Weak":    "#f7768e",
};

const COLS: Col[] = [
  {
    key: "symbol", label: "Ticker", group: "basic",
    render: s => (
      <span className="font-mono font-bold text-[#7aa2f7]">{s.symbol}
        <span className="text-[#45475a] font-normal ml-1 text-[10px]">{s.exchange}</span>
      </span>
    ),
  },
  {
    key: "name", label: "Company", group: "basic",
    render: s => <span className="text-[#cdd6f4] truncate max-w-[140px] block">{s.name}</span>,
  },
  {
    key: "sector", label: "Sector", group: "basic",
    render: s => <span className="text-[#6c7086] text-xs">{s.sector}</span>,
  },
  {
    key: "current_price", label: "Price", sortable: true, group: "basic",
    getValue: s => s.current_price ?? null,
    render: s => (
      <span className="font-mono text-[#cdd6f4]">
        {s.current_price != null
          ? `${s.currency === "IDR" ? "Rp" : "$"}${s.current_price.toLocaleString()}`
          : "—"}
      </span>
    ),
  },
  {
    key: "market_cap", label: "Mkt Cap", sortable: true, group: "basic",
    getValue: s => s.market_cap ?? null,
    render: s => <span className="font-mono text-[#6c7086] text-xs">{fmtMcap(s.market_cap)}</span>,
  },
  {
    key: "pe_ratio", label: "P/E", sortable: true, group: "basic",
    getValue: s => s.pe_ratio ?? null,
    render: s => (
      <span className={`font-mono text-xs ${s.pe_ratio != null && s.pe_ratio < 15 ? "text-[#9ece6a]" : "text-[#a6adc8]"}`}>
        {fmt(s.pe_ratio)}
      </span>
    ),
  },
  {
    key: "pb_ratio", label: "P/B", sortable: true, group: "basic",
    getValue: s => s.pb_ratio ?? null,
    render: s => <span className="font-mono text-[#a6adc8] text-xs">{fmt(s.pb_ratio)}</span>,
  },
  {
    key: "beta", label: "Beta", sortable: true, group: "basic",
    getValue: s => s.beta ?? null,
    render: s => (
      <span className={`font-mono text-xs ${s.beta != null && s.beta > 1.5 ? "text-[#f7768e]" : "text-[#a6adc8]"}`}>
        {fmt(s.beta)}
      </span>
    ),
  },
  {
    key: "dividend_yield", label: "Div%", sortable: true, group: "basic",
    getValue: s => s.dividend_yield ?? null,
    render: s => <span className="font-mono text-[#9ece6a] text-xs">{s.dividend_yield != null ? fmtPct(s.dividend_yield) : "—"}</span>,
  },
  // ── Score columns ──
  {
    key: "composite_score", label: "⚗ Score", sortable: true, group: "score",
    getValue: s => s.composite_score ?? null,
    render: s => s.composite_score != null ? (
      <div className="flex items-center gap-1.5">
        <span className="font-mono font-bold text-sm" style={{ color: SCORE_COLOR[s.score_label ?? ""] ?? "#6c7086" }}>
          {s.composite_score}
        </span>
        <span className="text-[#45475a] text-[10px] font-mono">/100</span>
      </div>
    ) : <span className="text-[#313244]">—</span>,
  },
  {
    key: "score_label", label: "Signal", group: "score",
    render: s => s.score_label ? (
      <span className="text-xs font-semibold font-mono" style={{ color: SCORE_COLOR[s.score_label] ?? "#6c7086" }}>
        {s.score_label}
      </span>
    ) : <span className="text-[#313244]">—</span>,
  },
  {
    key: "f_score", label: "F-Score", sortable: true, group: "score",
    getValue: s => s.f_score ?? null,
    render: s => s.f_score != null ? (
      <div>
        <span className="font-mono font-bold text-sm" style={{ color: F_COLOR[s.f_strength ?? ""] ?? "#6c7086" }}>
          {s.f_score}
        </span>
        <span className="text-[#45475a] font-mono text-[10px]">/{s.f_score_max}</span>
      </div>
    ) : <span className="text-[#313244]">—</span>,
  },
  {
    key: "margin_of_safety", label: "MoS%", sortable: true, group: "score",
    getValue: s => s.margin_of_safety ?? null,
    render: s => s.margin_of_safety != null ? (
      <span className="font-mono text-xs" style={{ color: GRAHAM_COLOR[s.graham_signal ?? "N/A"] }}>
        {s.margin_of_safety > 0 ? "+" : ""}{s.margin_of_safety}%
      </span>
    ) : <span className="text-[#313244]">—</span>,
  },
  {
    key: "momentum_3m", label: "3M%", sortable: true, group: "score",
    getValue: s => s.momentum_3m ?? null,
    render: s => s.momentum_3m != null ? (
      <span className={`font-mono text-xs ${s.momentum_3m >= 0 ? "text-[#9ece6a]" : "text-[#f7768e]"}`}>
        {s.momentum_3m > 0 ? "+" : ""}{s.momentum_3m}%
      </span>
    ) : <span className="text-[#313244]">—</span>,
  },
  {
    key: "momentum_6m", label: "6M%", sortable: true, group: "score",
    getValue: s => s.momentum_6m ?? null,
    render: s => s.momentum_6m != null ? (
      <span className={`font-mono text-xs ${s.momentum_6m >= 0 ? "text-[#9ece6a]" : "text-[#f7768e]"}`}>
        {s.momentum_6m > 0 ? "+" : ""}{s.momentum_6m}%
      </span>
    ) : <span className="text-[#313244]">—</span>,
  },
  {
    key: "dividend_yield", label: "Dividen", sortable: true, group: "basic",
    getValue: s => s.dividend_yield ?? null,
    render: s => <span className="font-mono text-[#9ece6a] text-xs">{s.dividend_yield != null ? fmtPct(s.dividend_yield) : "—"}</span>,
  },
  // ── Technical columns (Day/Swing schema) ─────────────────────────
  {
    key: "rsi", label: "RSI", sortable: true, group: "score",
    getValue: s => s.rsi ?? null,
    render: s => {
      const v = s.rsi;
      if (v == null) return <span className="text-[#313244]">—</span>;
      const color = v < 30 ? "#9ece6a" : v > 70 ? "#f7768e" : "#a6adc8";
      return <span className="font-mono text-xs font-semibold" style={{ color }}>{v}</span>;
    },
  },
  {
    key: "bb_signal", label: "BB Signal", sortable: false, group: "score",
    render: s => {
      const v = s.bb_signal;
      if (!v) return <span className="text-[#313244]">—</span>;
      const color = v === "Oversold" ? "#9ece6a" : v === "Overbought" ? "#f7768e" : "#6c7086";
      return <span className="font-mono text-xs" style={{ color }}>{v}</span>;
    },
  },
  {
    key: "macd_cross", label: "MACD", sortable: false, group: "score",
    render: s => {
      const v = s.macd_cross;
      if (!v) return <span className="text-[#313244]">—</span>;
      const color = v === "Bullish" ? "#9ece6a" : v === "Bearish" ? "#f7768e" : "#6c7086";
      return <span className="font-mono text-xs" style={{ color }}>{v}</span>;
    },
  },
  {
    key: "ma_cross", label: "MA Cross", sortable: false, group: "score",
    render: s => {
      const v = s.ma_cross;
      if (!v) return <span className="text-[#313244]">—</span>;
      const color = v === "Golden" || v === "Bullish" ? "#9ece6a"
                  : v === "Death"  || v === "Bearish" ? "#f7768e" : "#6c7086";
      return <span className="font-mono text-xs" style={{ color }}>{v}</span>;
    },
  },
  // ── Fundamental columns (Long schema) ────────────────────────────
  {
    key: "graham_signal", label: "Graham", sortable: false, group: "score",
    render: s => {
      const v = s.graham_signal;
      if (!v) return <span className="text-[#313244]">—</span>;
      const color = GRAHAM_COLOR[v] ?? "#6c7086";
      return <span className="font-mono text-xs" style={{ color }}>{v}</span>;
    },
  },
  {
    key: "z_zone", label: "Altman", sortable: false, group: "score",
    render: s => {
      const v = s.z_zone;
      if (!v) return <span className="text-[#313244]">—</span>;
      const color = v === "Safe" ? "#9ece6a" : v === "Distress" ? "#f7768e" : "#e0af68";
      return <span className="font-mono text-xs" style={{ color }}>{v}</span>;
    },
  },
];

// Schema-specific column sets — all keys must exist in COLS above
const SCHEMA_COLS: Record<Schema, string[]> = {
  day:      ["symbol", "current_price", "rsi", "bb_signal", "macd_cross", "momentum_3m", "ma_cross", "composite_score", "score_label"],
  swing:    ["symbol", "current_price", "composite_score", "score_label", "momentum_3m", "momentum_6m", "f_score", "ma_cross", "rsi"],
  position: ["symbol", "current_price", "composite_score", "score_label", "momentum_6m", "momentum_12m", "ma_cross", "f_score"],
  long:     ["symbol", "current_price", "composite_score", "score_label", "f_score", "graham_signal", "margin_of_safety", "z_zone", "dividend_yield"],
};
const SCHEMA_SORT: Record<Schema, string> = {
  day:      "composite_score",
  swing:    "composite_score",
  position: "momentum_12m",   // best 12M trend momentum
  long:     "f_score",
};

export default function UniverseTable({ stocks, selected, onToggle, onSelectAll, schema = "swing" }: Props) {
  const router   = useRouter();
  const sc       = SCHEMAS[schema];
  const [showAll, setShowAll]   = useState(false);
  const [sortKey, setSortKey]   = useState<string>(SCHEMA_SORT[schema]);
  const [sortDir, setSortDir]   = useState<SortDir>("desc");

  // Filter columns based on schema (unless showAll)
  const visibleColKeys = showAll ? COLS.map(c => c.key as string) : SCHEMA_COLS[schema];
  const visibleCols    = COLS.filter(c => visibleColKeys.includes(c.key as string));

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const sorted = useMemo(() => {
    const col = COLS.find(c => c.key === sortKey);
    if (!col?.getValue) return stocks;
    return [...stocks].sort((a, b) => {
      const av = col.getValue!(a) ?? -Infinity;
      const bv = col.getValue!(b) ?? -Infinity;
      return sortDir === "desc" ? bv - av : av - bv;
    });
  }, [stocks, sortKey, sortDir]);

  const SortIcon = ({ colKey }: { colKey: string }) => {
    if (sortKey !== colKey) return <ChevronsUpDown size={10} className="text-[#313244] ml-0.5" />;
    return sortDir === "desc"
      ? <ChevronDown size={10} className="text-[#7aa2f7] ml-0.5" />
      : <ChevronUp size={10} className="text-[#7aa2f7] ml-0.5" />;
  };

  if (!stocks.length) {
    return (
      <div className="text-center py-12 text-[#45475a] border border-[#2a2a3e] rounded-xl bg-[#11111b]">
        <div className="text-3xl mb-2">🔍</div>
        <div className="text-sm">Apply filters to screen stocks</div>
        <div className="text-xs mt-1 text-[#313244]">Mathematical scores (F-Score, Graham, Momentum) auto-computed</div>
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
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <button onClick={onSelectAll} className="flex items-center gap-1.5 text-xs text-[#6c7086] hover:text-[#7aa2f7] transition-colors">
            {selected.size === stocks.length && stocks.length > 0
              ? <CheckSquare size={13} className="text-[#7aa2f7]" />
              : <Square size={13} />}
            {selected.size === stocks.length && stocks.length > 0 ? "Deselect All" : "Select All"}
          </button>
          {selected.size > 0 && (
            <span className="text-[#7aa2f7] text-xs font-mono">{selected.size} selected</span>
          )}
          {/* Schema column badge */}
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded"
            style={{ background: sc.color + "22", color: sc.color }}>
            {sc.icon} {sc.label} view
          </span>
          <button onClick={() => setShowAll(p => !p)}
            className="flex items-center gap-1 text-[#45475a] hover:text-[#6c7086] text-[10px] transition-colors">
            <Columns size={10} />
            {showAll ? "Schema view" : "Semua kolom"}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[#45475a] text-xs font-mono">{stocks.length} saham</span>
          {selected.size >= 2 && (
            <button onClick={goOptimize}
              className="flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-semibold transition-colors"
              style={{ background: sc.color + "15", borderColor: sc.color + "44", color: sc.color }}>
              <TrendingUp size={11} />
              Optimize {selected.size} stocks
            </button>
          )}
        </div>
      </div>

      {/* Reference note */}
      <div className="mb-2 text-[#45475a] text-xs font-mono">
        ⚗ Score = 40% Quality (Piotroski) + 35% Value (Graham) + 25% Momentum (Jegadeesh-Titman) · klik header untuk sort
      </div>

      <div className="overflow-x-auto rounded-lg border border-[#2a2a3e]">
        <table className="w-full text-xs min-w-[900px]">
          <thead>
            <tr className="border-b border-[#2a2a3e] bg-[#0a0a0f]">
              <th className="w-8 px-2 py-2.5" />
              {visibleCols.map(col => (
                <th
                  key={col.key}
                  className={[
                    "px-3 py-2.5 text-left font-mono uppercase tracking-wider whitespace-nowrap select-none",
                    col.sortable ? "cursor-pointer hover:text-[#cdd6f4] transition-colors" : "",
                    col.group === "score" ? "text-[#7aa2f7]/70" : "text-[#6c7086]",
                    sortKey === col.key ? "text-[#7aa2f7]" : "",
                  ].join(" ")}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <span className="flex items-center gap-0.5">
                    {col.label}
                    {col.sortable && <SortIcon colKey={col.key} />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map(s => (
              <tr
                key={s.symbol}
                onClick={() => onToggle(s.symbol)}
                className={[
                  "border-b border-[#1e1e2e] cursor-pointer transition-colors",
                  selected.has(s.symbol)
                    ? "bg-[#1e2035] hover:bg-[#252545]"
                    : "hover:bg-[#11111b]",
                ].join(" ")}
              >
                <td className="px-2 py-2.5 text-center">
                  {selected.has(s.symbol)
                    ? <CheckSquare size={12} className="text-[#7aa2f7] mx-auto" />
                    : <Square size={12} className="text-[#45475a] mx-auto" />}
                </td>
                {visibleCols.map(col => (
                  <td key={col.key} className="px-3 py-2.5">
                    {col.render(s)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
