"use client";
import { useRouter } from "next/navigation";
import { SCHEMAS, storeSchema, type Schema } from "@/lib/schema";
import { ArrowRight } from "lucide-react";

interface Props {
  current: Schema;
  onChange: (s: Schema) => void;
  showCTA?: boolean;   // show "Mulai Screener" button
}

export default function SchemaPicker({ current, onChange, showCTA = false }: Props) {
  const router = useRouter();

  const select = (s: Schema) => {
    storeSchema(s);
    onChange(s);
  };

  return (
    <div className="space-y-3">
      <div className="text-[#6c7086] font-mono text-xs uppercase tracking-wider">
        Profil Investor — pilih satu, berlaku untuk seluruh sesi
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {(Object.values(SCHEMAS) as typeof SCHEMAS[Schema][]).map(sc => {
          const active = current === sc.key;
          return (
            <button
              key={sc.key}
              onClick={() => select(sc.key)}
              className={[
                "text-left p-4 rounded-xl border transition-all",
                active
                  ? "border-transparent bg-[#1a1a2e]"
                  : "border-[#2a2a3e] hover:border-[#313244] hover:bg-[#11111b]",
              ].join(" ")}
              style={active ? { boxShadow: `0 0 0 2px ${sc.color}55` } : {}}
            >
              {/* Header */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{sc.icon}</span>
                <span className="font-bold text-sm" style={{ color: active ? sc.color : "#a6adc8" }}>
                  {sc.label}
                </span>
                {active && (
                  <span className="ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded"
                    style={{ background: sc.color + "22", color: sc.color }}>
                    AKTIF
                  </span>
                )}
              </div>

              {/* Tagline */}
              <div className="text-[#6c7086] text-xs mb-3">{sc.tagline}</div>

              {/* Details */}
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#45475a]">Hold</span>
                  <span className="font-mono text-[#a6adc8]">{sc.holdPeriod}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#45475a]">Model default</span>
                  <span className="font-mono" style={{ color: active ? sc.color : "#6c7086" }}>
                    {sc.defaultModel.toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#45475a]">Periode</span>
                  <span className="font-mono text-[#6c7086]">{sc.defaultPeriod}</span>
                </div>
              </div>

              {/* Objective */}
              <div className="mt-3 pt-3 border-t border-[#1e1e2e] text-[10px] text-[#45475a] leading-relaxed">
                {sc.objective}
              </div>
            </button>
          );
        })}
      </div>

      {showCTA && (
        <button
          onClick={() => router.push("/screener")}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-colors"
          style={{ background: SCHEMAS[current].color, color: "#0a0a0f" }}
        >
          Mulai Screener — {SCHEMAS[current].icon} {SCHEMAS[current].label}
          <ArrowRight size={14} />
        </button>
      )}
    </div>
  );
}
