"use client";
import { AlertTriangle, CheckCircle, Info, TrendingDown, TrendingUp, Minus } from "lucide-react";

interface Interpretation {
  quality:       string;
  grade:         string;
  action:        string;
  action_detail: string;
  messages:      string[];
  warnings:      string[];
  suggestions:   string[];
  n_active:      number;
  max_weight_pct: number;
  sharpe:        number;
  grade_color:   string;
}

interface Props {
  interp: Interpretation;
}

const QUALITY_BG: Record<string, string> = {
  excellent: "border-[#9ece6a]/30 bg-[#9ece6a]/5",
  good:      "border-[#7aa2f7]/30 bg-[#7aa2f7]/5",
  fair:      "border-[#e0af68]/30 bg-[#e0af68]/5",
  poor:      "border-[#f7768e]/30 bg-[#f7768e]/10",
  bad:       "border-[#f7768e]/50 bg-[#f7768e]/15",
};

const ACTION_ICON: Record<string, React.ReactNode> = {
  "LAYAK TRADING":   <TrendingUp size={16} className="text-[#9ece6a]" />,
  "PERTIMBANGKAN":   <TrendingUp size={16} className="text-[#7aa2f7]" />,
  "HATI-HATI":       <Minus size={16} className="text-[#e0af68]" />,
  "TUNDA DULU":      <TrendingDown size={16} className="text-[#f7768e]" />,
  "JANGAN TRADING":  <AlertTriangle size={16} className="text-[#f7768e]" />,
};

export default function ResultInterpretation({ interp }: Props) {
  return (
    <div className={`border rounded-xl p-4 space-y-3 ${QUALITY_BG[interp.quality] ?? "border-[#2a2a3e]"}`}>
      {/* Header: grade + action */}
      <div className="flex items-center gap-3">
        {/* Grade badge */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg shrink-0"
          style={{ background: interp.grade_color + "22", color: interp.grade_color }}
        >
          {interp.grade}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {ACTION_ICON[interp.action]}
            <span className="font-bold text-sm" style={{ color: interp.grade_color }}>
              {interp.action}
            </span>
          </div>
          <div className="text-[#6c7086] text-xs mt-0.5 leading-relaxed">{interp.action_detail}</div>
        </div>

        {/* Sharpe badge */}
        <div className="shrink-0 text-right">
          <div className="text-[#6c7086] text-[10px] font-mono uppercase">Sharpe</div>
          <div className="font-mono font-bold text-lg leading-none" style={{ color: interp.grade_color }}>
            {interp.sharpe.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Messages */}
      {interp.messages.length > 0 && (
        <div className="space-y-1.5">
          {interp.messages.map((m, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-[#a6adc8]">
              <Info size={11} className="text-[#7aa2f7] mt-0.5 shrink-0" />
              <span className="leading-relaxed">{m}</span>
            </div>
          ))}
        </div>
      )}

      {/* Warnings */}
      {interp.warnings.length > 0 && (
        <div className="space-y-1.5">
          {interp.warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-2 text-xs">
              <AlertTriangle size={11} className="text-[#f7768e] mt-0.5 shrink-0" />
              <span className="text-[#f7768e] leading-relaxed">{w}</span>
            </div>
          ))}
        </div>
      )}

      {/* Suggestions */}
      {interp.suggestions.length > 0 && (
        <div className="border-t border-[#2a2a3e] pt-3 space-y-1.5">
          <div className="text-[#6c7086] text-[10px] font-mono uppercase tracking-wider">Saran:</div>
          {interp.suggestions.map((s, i) => (
            <div key={i} className="flex items-start gap-2 text-xs">
              <CheckCircle size={11} className="text-[#e0af68] mt-0.5 shrink-0" />
              <span className="text-[#a6adc8] leading-relaxed">{s}</span>
            </div>
          ))}
        </div>
      )}

      {/* Quick stats */}
      <div className="flex gap-4 text-[10px] font-mono text-[#6c7086] border-t border-[#2a2a3e] pt-2">
        <span>Aktif: <span className="text-[#cdd6f4]">{interp.n_active} saham</span></span>
        <span>Konsentrasi maks: <span className={interp.max_weight_pct > 50 ? "text-[#f7768e]" : "text-[#cdd6f4]"}>{interp.max_weight_pct}%</span></span>
      </div>
    </div>
  );
}
