"use client";
import { useEffect, useState, useRef } from "react";
import { api } from "@/lib/api";
import { Loader2, Target, RefreshCw } from "lucide-react";

interface Range {
  r_min: number;
  r_max: number;
  r_default: number;
  r_mean: number;
  period: string;
}

interface Props {
  tickers: string[];
  period: string;
  allowShort: boolean;
  value: number | null;          // current target % (null = maximize Sharpe)
  onChange: (v: number | null) => void;
}

export default function ReturnSlider({ tickers, period, allowShort, value, onChange }: Props) {
  const [range, setRange]       = useState<Range | null>(null);
  const [loading, setLoading]   = useState(false);
  const [useSharpe, setUseSharpe] = useState(value === null);
  const fetchRef                = useRef(0);

  const fetchRange = async () => {
    if (tickers.length < 2) { setRange(null); return; }
    setLoading(true);
    const id = ++fetchRef.current;
    try {
      const r = await api.optimizer.range(tickers, period, allowShort);
      if (fetchRef.current === id) {
        setRange(r);
        // Auto-set to default (mean return) if nothing selected yet
        if (value === null && !useSharpe) onChange(r.r_default);
      }
    } catch {
      if (fetchRef.current === id) setRange(null);
    } finally {
      if (fetchRef.current === id) setLoading(false);
    }
  };

  useEffect(() => {
    fetchRange();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickers.join(","), period, allowShort]);

  const handleSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(parseFloat(e.target.value));
    setUseSharpe(false);
  };

  const toggleSharpe = () => {
    setUseSharpe(!useSharpe);
    onChange(useSharpe ? (range?.r_default ?? null) : null);
  };

  const pct = value ?? range?.r_default ?? 0;
  const frac = range ? (pct - range.r_min) / (range.r_max - range.r_min) : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[#6c7086] font-mono text-xs uppercase tracking-wider">Target Return</span>
        <div className="flex items-center gap-2">
          {loading && <Loader2 size={10} className="animate-spin text-[#6c7086]" />}
          {tickers.length >= 2 && (
            <button onClick={fetchRange} title="Refresh range" className="text-[#45475a] hover:text-[#7aa2f7] transition-colors">
              <RefreshCw size={10} />
            </button>
          )}
        </div>
      </div>

      {/* Maximize Sharpe toggle */}
      <button
        onClick={toggleSharpe}
        className={[
          "w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-xs transition-all",
          useSharpe
            ? "bg-[#1e2035] border-[#3d59a1]/50 text-[#7aa2f7]"
            : "border-[#2a2a3e] text-[#6c7086] hover:border-[#313244] hover:text-[#a6adc8]",
        ].join(" ")}
      >
        <Target size={11} />
        <span className="font-semibold">Maximize Sharpe Ratio</span>
        <span className="ml-auto text-[#45475a]">(no target)</span>
      </button>

      {/* Slider — only when not maximize Sharpe */}
      {!useSharpe && (
        <div className="bg-[#11111b] border border-[#2a2a3e] rounded-lg p-3 space-y-2">
          {range ? (
            <>
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-[#6c7086]">GMV: {range.r_min.toFixed(1)}%</span>
                <span className="text-[#7aa2f7] font-bold text-sm">{pct.toFixed(1)}%</span>
                <span className="text-[#6c7086]">Max: {range.r_max.toFixed(1)}%</span>
              </div>

              <div className="relative">
                <input
                  type="range"
                  min={range.r_min}
                  max={range.r_max}
                  step={0.1}
                  value={pct}
                  onChange={handleSlider}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #7aa2f7 ${frac * 100}%, #2a2a3e ${frac * 100}%)`,
                  }}
                />
              </div>

              {/* Preset markers */}
              <div className="flex justify-between text-[10px] font-mono text-[#45475a]">
                <button onClick={() => onChange(range.r_min)} className="hover:text-[#9ece6a] transition-colors">GMV</button>
                <button onClick={() => onChange(range.r_mean)} className="hover:text-[#7aa2f7] transition-colors">Mean</button>
                <button onClick={() => onChange((range.r_min + range.r_max) / 2)} className="hover:text-[#e0af68] transition-colors">Mid</button>
                <button onClick={() => onChange(range.r_max * 0.9)} className="hover:text-[#f7768e] transition-colors">90%</button>
              </div>

              <div className="text-[#45475a] text-[10px] font-mono">
                Range [{range.r_min.toFixed(1)}%, {range.r_max.toFixed(1)}%] · feasible returns · period {range.period}
              </div>
            </>
          ) : tickers.length < 2 ? (
            <div className="text-[#45475a] text-xs text-center py-2">Add ≥ 2 tickers to see feasible range</div>
          ) : loading ? (
            <div className="flex items-center justify-center gap-2 text-[#6c7086] text-xs py-2">
              <Loader2 size={12} className="animate-spin" />
              Computing feasible range…
            </div>
          ) : (
            <div className="text-[#f7768e] text-xs text-center py-2">Could not compute range</div>
          )}
        </div>
      )}
    </div>
  );
}
