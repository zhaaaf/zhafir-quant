"use client";
import type { ModelType } from "@/lib/types";
import { MODEL_META } from "@/lib/utils";

interface Props {
  value: ModelType;
  onChange: (m: ModelType) => void;
}

export default function ModelSelector({ value, onChange }: Props) {
  return (
    <div className="space-y-2">
      <div className="text-[#6c7086] font-mono text-xs uppercase tracking-wider mb-3">Optimization Model</div>
      <div className="grid grid-cols-1 gap-2">
        {(Object.entries(MODEL_META) as [ModelType, typeof MODEL_META[string]][]).map(([key, meta]) => (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={[
              "text-left px-4 py-3 rounded-lg border transition-all",
              value === key
                ? "border-[#7aa2f7]/50 bg-[#1e2035]"
                : "border-[#2a2a3e] bg-[#11111b] hover:border-[#313244] hover:bg-[#1a1a2e]",
            ].join(" ")}
          >
            <div className="flex items-center gap-2 mb-1">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: meta.color }}
              />
              <span
                className="font-mono text-xs font-semibold"
                style={{ color: value === key ? meta.color : "#a6adc8" }}
              >
                {meta.label}
              </span>
            </div>
            <div className="text-[#6c7086] text-xs leading-relaxed pl-4">{meta.description}</div>
            <div className="text-[#45475a] text-xs mt-1 pl-4 font-mono">{meta.ref}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
