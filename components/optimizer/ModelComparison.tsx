"use client";
import { MODEL_META, fmt, fmtPct } from "@/lib/utils";
import { SCHEMAS, type Schema } from "@/lib/schema";
import { Trophy, ChevronRight } from "lucide-react";

interface ModelRow {
  model:           string;
  rank:            number;
  is_winner:       boolean;
  schema_score:    number;
  sharpe_ratio?:   number;
  expected_return?: number;
  volatility?:     number;
  cvar?:           number;
  effective_n?:    number;
  success:         boolean;
  error?:          string;
}

interface Props {
  ranked:   ModelRow[];
  schema:   Schema;
  note:     string;
  onSelect: (model: string) => void;
  selected: string;
}

const RANK_ICON = ["🥇", "🥈", "🥉", "4.", "5."];

export default function ModelComparison({ ranked, schema, note, onSelect, selected }: Props) {
  const sc    = SCHEMAS[schema];
  const extra = schema === "day"   ? { key: "cvar",       label: "CVaR" }
              : schema === "long"  ? { key: "effective_n", label: "Eff-N" }
              : null;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[#cdd6f4] font-semibold text-sm flex items-center gap-2">
            <Trophy size={14} style={{ color: sc.color }} />
            Perbandingan 5 Model — {sc.icon} {sc.label}
          </div>
          <div className="text-[#45475a] text-xs mt-0.5 font-mono">
            Ranked by: {sc.objective}
          </div>
        </div>
      </div>

      {/* Significance note */}
      {note && (
        <div className="text-[#6c7086] text-xs bg-[#11111b] border border-[#2a2a3e] rounded-lg px-3 py-2 font-mono">
          {note}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-[#2a2a3e]">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[#2a2a3e] bg-[#0a0a0f]">
              {["Rank", "Model", "Sharpe", "Return/yr", "Volatilitas",
                ...(extra ? [extra.label] : []), "Skor Schema", ""].map(h => (
                <th key={h} className="px-3 py-2.5 text-left text-[#45475a] font-mono whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ranked.map((r, i) => {
              const meta    = MODEL_META[r.model];
              const isWin   = r.is_winner;
              const isSel   = selected === r.model;

              if (!r.success) return (
                <tr key={r.model} className="border-b border-[#1e1e2e] opacity-40">
                  <td className="px-3 py-2 text-[#45475a]">{RANK_ICON[i]}</td>
                  <td className="px-3 py-2 font-mono text-[#6c7086]">{meta?.label ?? r.model}</td>
                  <td colSpan={extra ? 6 : 5} className="px-3 py-2 text-[#f7768e] font-mono text-[10px]">
                    Gagal: {r.error}
                  </td>
                </tr>
              );

              return (
                <tr key={r.model}
                  onClick={() => onSelect(r.model)}
                  className={[
                    "border-b border-[#1e1e2e] cursor-pointer transition-colors",
                    isSel ? "bg-[#1e2035]" : isWin ? "bg-[#11111b]" : "hover:bg-[#11111b]/60",
                  ].join(" ")}>

                  {/* Rank */}
                  <td className="px-3 py-3 text-base">{RANK_ICON[i]}</td>

                  {/* Model name */}
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: meta?.color ?? "#6c7086" }} />
                      <span className="font-mono font-semibold" style={{ color: isWin ? meta?.color : "#a6adc8" }}>
                        {meta?.label ?? r.model}
                      </span>
                      {isWin && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                          style={{ background: sc.color + "22", color: sc.color }}>
                          WINNER
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Sharpe */}
                  <td className="px-3 py-3 font-mono font-bold"
                    style={{ color: (r.sharpe_ratio ?? 0) >= 1 ? "#9ece6a" : (r.sharpe_ratio ?? 0) >= 0.5 ? "#e0af68" : "#f7768e" }}>
                    {fmt(r.sharpe_ratio, 2)}
                  </td>

                  {/* Return */}
                  <td className="px-3 py-3 font-mono"
                    style={{ color: (r.expected_return ?? 0) >= 0 ? "#9ece6a" : "#f7768e" }}>
                    {r.expected_return != null ? `${r.expected_return > 0 ? "+" : ""}${(r.expected_return * 100).toFixed(1)}%` : "—"}
                  </td>

                  {/* Volatility */}
                  <td className="px-3 py-3 font-mono text-[#f7768e]">
                    {r.volatility != null ? `${(r.volatility * 100).toFixed(1)}%` : "—"}
                  </td>

                  {/* Extra column */}
                  {extra && (
                    <td className="px-3 py-3 font-mono text-[#7aa2f7]">
                      {extra.key === "cvar"
                        ? (r.cvar != null ? fmt(r.cvar, 4) : "—")
                        : (r.effective_n != null ? r.effective_n.toFixed(1) : "—")}
                    </td>
                  )}

                  {/* Schema score */}
                  <td className="px-3 py-3 font-mono text-[#6c7086]">
                    {r.schema_score.toFixed(3)}
                  </td>

                  {/* Select button */}
                  <td className="px-3 py-3">
                    <ChevronRight size={12}
                      className={isSel ? "text-[#7aa2f7]" : "text-[#313244]"} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="text-[#313244] text-[10px] font-mono">
        Klik baris untuk lihat detail alokasi model tersebut
      </div>
    </div>
  );
}
