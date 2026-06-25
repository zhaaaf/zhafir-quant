"use client";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Topbar from "@/components/layout/Topbar";
import ModelSelector from "@/components/optimizer/ModelSelector";
import EfficientFrontierChart from "@/components/optimizer/EfficientFrontierChart";
import AllocationChart from "@/components/optimizer/AllocationChart";
import { api } from "@/lib/api";
import type { ModelType, OptimizeResult, FrontierResult } from "@/lib/types";
import { MODEL_META, fmtPct, fmt } from "@/lib/utils";
import { Loader2, Play, Plus, X } from "lucide-react";

type Schema = "day" | "swing" | "long";
const SCHEMA_META: Record<Schema, { label: string; color: string; model: ModelType; hold: string; icon: string }> = {
  day:   { label: "Day Trading",    color: "#f7768e", model: "cvar",     hold: "< 1 hari",  icon: "⚡" },
  swing: { label: "Swing Trading",  color: "#e0af68", model: "rmt",      hold: "2–14 hari", icon: "📈" },
  long:  { label: "Long Invest",    color: "#9ece6a", model: "entropy",  hold: "3+ bulan",  icon: "🌱" },
};

function OptimizerInner() {
  const params = useSearchParams();
  const initialTickers = params.get("tickers")?.split(",").filter(Boolean) ?? [];

  const [tickers, setTickers] = useState<string[]>(initialTickers);
  const [tickerInput, setTickerInput] = useState("");
  const [schema, setSchema] = useState<Schema>("swing");
  const [model, setModel] = useState<ModelType>("rmt");
  const [period, setPeriod] = useState("2y");
  const [allowShort, setAllowShort] = useState(false);
  const [riskAversion, setRiskAversion] = useState(0.5);
  const [alpha, setAlpha] = useState(0.95);
  const [targetReturn, setTargetReturn] = useState("");
  const [riskFreeRate, setRiskFreeRate] = useState(0.04);

  const applySchema = (s: Schema) => {
    setSchema(s);
    setModel(SCHEMA_META[s].model);
  };

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OptimizeResult | null>(null);
  const [frontier, setFrontier] = useState<FrontierResult | null>(null);

  const addTicker = () => {
    const t = tickerInput.trim().toUpperCase();
    if (t && !tickers.includes(t)) {
      setTickers(prev => [...prev, t]);
      setTickerInput("");
    }
  };

  const run = async () => {
    if (tickers.length < 2) { setError("Add at least 2 tickers"); return; }
    setLoading(true);
    setError(null);
    setResult(null);
    setFrontier(null);
    try {
      const req = {
        tickers,
        model,
        period,
        allow_short: allowShort,
        risk_aversion: riskAversion,
        alpha,
        risk_free_rate: riskFreeRate,
        target_return: targetReturn ? parseFloat(targetReturn) / 100 : undefined,
      };
      const [opt, front] = await Promise.all([
        api.optimizer.optimize(req),
        api.optimizer.frontier(req),
      ]);
      setResult(opt);
      setFrontier(front);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Optimization failed");
    } finally {
      setLoading(false);
    }
  };

  const meta = MODEL_META[model];

  return (
    <div className="min-h-screen">
      <Topbar title="Portfolio Optimizer" subtitle={model} />

      <div className="p-4 md:p-6 grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-5">
        {/* Left panel */}
        <div className="space-y-5">
          {/* Investor Schema */}
          <div>
            <div className="text-[#6c7086] font-mono text-xs uppercase tracking-wider mb-2">Skema Investor</div>
            <div className="grid grid-cols-3 gap-1.5">
              {(Object.entries(SCHEMA_META) as [Schema, typeof SCHEMA_META[Schema]][]).map(([key, s]) => (
                <button
                  key={key}
                  onClick={() => applySchema(key)}
                  className={[
                    "p-2.5 rounded-lg border text-left transition-all",
                    schema === key
                      ? "border-[#7aa2f7]/40 bg-[#1e2035]"
                      : "border-[#2a2a3e] hover:border-[#313244] hover:bg-[#1a1a2e]",
                  ].join(" ")}
                >
                  <div className="text-base mb-0.5">{s.icon}</div>
                  <div className="font-semibold text-xs leading-tight" style={{ color: s.color }}>{s.label}</div>
                  <div className="text-[#45475a] text-xs">{s.hold}</div>
                </button>
              ))}
            </div>
            <div className="mt-1.5 text-[#45475a] text-xs font-mono">
              Hold: <span style={{ color: SCHEMA_META[schema].color }}>{SCHEMA_META[schema].hold}</span>
              {" · "}Model: <span className="text-[#6c7086]">{MODEL_META[SCHEMA_META[schema].model].label}</span>
            </div>
          </div>

          {/* Ticker input */}
          <div>
            <div className="text-[#6c7086] font-mono text-xs uppercase tracking-wider mb-2">Assets</div>
            <div className="flex gap-2 mb-2">
              <input
                className="flex-1 bg-[#11111b] border border-[#2a2a3e] text-[#cdd6f4] text-sm px-3 py-2 rounded-lg placeholder:text-[#45475a] outline-none focus:border-[#7aa2f7]/50"
                placeholder="AAPL, BBCA.JK…"
                value={tickerInput}
                onChange={e => setTickerInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addTicker()}
              />
              <button onClick={addTicker} className="px-3 py-2 bg-[#1e2035] border border-[#2a2a3e] text-[#7aa2f7] rounded-lg hover:bg-[#252545] transition-colors">
                <Plus size={14} />
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {tickers.map(t => (
                <span key={t} className="flex items-center gap-1 px-2 py-0.5 bg-[#1e2035] border border-[#3d59a1]/40 rounded text-[#7aa2f7] font-mono text-xs">
                  {t}
                  <button onClick={() => setTickers(p => p.filter(x => x !== t))} className="text-[#6c7086] hover:text-[#f7768e]">
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Model */}
          <ModelSelector value={model} onChange={setModel} />

          {/* Parameters */}
          <div>
            <div className="text-[#6c7086] font-mono text-xs uppercase tracking-wider mb-2">Parameters</div>
            <div className="space-y-3 bg-[#11111b] border border-[#2a2a3e] rounded-lg p-3">
              <label className="flex flex-col gap-1">
                <span className="text-[#6c7086] text-xs font-mono">Period</span>
                <select
                  value={period}
                  onChange={e => setPeriod(e.target.value)}
                  className="bg-[#1a1a2e] border border-[#2a2a3e] text-[#cdd6f4] text-xs rounded px-2 py-1.5 outline-none"
                >
                  {["6mo","1y","2y","3y","5y"].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </label>

              {model === "cvar" && (
                <label className="flex flex-col gap-1">
                  <span className="text-[#6c7086] text-xs font-mono">CVaR α level</span>
                  <input type="number" min="0.9" max="0.999" step="0.01"
                    value={alpha} onChange={e => setAlpha(parseFloat(e.target.value))}
                    className="bg-[#1a1a2e] border border-[#2a2a3e] text-[#cdd6f4] text-xs rounded px-2 py-1.5 outline-none w-full"
                  />
                </label>
              )}

              {model === "quantum" && (
                <label className="flex flex-col gap-1">
                  <span className="text-[#6c7086] text-xs font-mono">Risk Aversion λ</span>
                  <input type="number" min="0.01" max="2" step="0.01"
                    value={riskAversion} onChange={e => setRiskAversion(parseFloat(e.target.value))}
                    className="bg-[#1a1a2e] border border-[#2a2a3e] text-[#cdd6f4] text-xs rounded px-2 py-1.5 outline-none w-full"
                  />
                </label>
              )}

              <label className="flex flex-col gap-1">
                <span className="text-[#6c7086] text-xs font-mono">Target Return % (optional)</span>
                <input type="number" step="0.1" placeholder="e.g. 15"
                  value={targetReturn} onChange={e => setTargetReturn(e.target.value)}
                  className="bg-[#1a1a2e] border border-[#2a2a3e] text-[#cdd6f4] text-xs rounded px-2 py-1.5 outline-none w-full placeholder:text-[#45475a]"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-[#6c7086] text-xs font-mono">Risk-Free Rate %</span>
                <input type="number" step="0.1" min="0"
                  value={(riskFreeRate * 100).toFixed(1)}
                  onChange={e => setRiskFreeRate(parseFloat(e.target.value) / 100)}
                  className="bg-[#1a1a2e] border border-[#2a2a3e] text-[#cdd6f4] text-xs rounded px-2 py-1.5 outline-none w-full"
                />
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={allowShort} onChange={e => setAllowShort(e.target.checked)}
                  className="accent-[#7aa2f7]"
                />
                <span className="text-[#6c7086] text-xs font-mono">Allow Short Selling</span>
              </label>
            </div>
          </div>

          {/* Run */}
          <button
            onClick={run}
            disabled={loading || tickers.length < 2}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-semibold text-sm transition-colors disabled:opacity-40"
            style={{ background: meta.color, color: "#0a0a0f" }}
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            {loading ? "Optimizing…" : `Run ${meta.label}`}
          </button>

          {error && (
            <div className="bg-[#f7768e]/10 border border-[#f7768e]/30 text-[#f7768e] text-xs p-3 rounded-lg">
              {error}
            </div>
          )}
        </div>

        {/* Right panel — results */}
        <div className="space-y-5">
          {!result && !loading && (
            <div className="h-64 flex items-center justify-center text-[#45475a] border border-[#2a2a3e] rounded-xl bg-[#11111b]">
              <div className="text-center">
                <div className="text-3xl mb-2">⚗️</div>
                <div className="text-sm">Configure and run an optimization model</div>
              </div>
            </div>
          )}

          {loading && (
            <div className="h-64 flex flex-col items-center justify-center text-[#6c7086] border border-[#2a2a3e] rounded-xl bg-[#11111b] gap-3">
              <Loader2 size={24} className="animate-spin text-[#7aa2f7]" />
              <div className="text-sm">Running {meta.label}…</div>
              <div className="text-xs text-[#45475a] font-mono">{meta.ref}</div>
            </div>
          )}

          {result && (
            <>
              {/* Key metrics */}
              <div>
                <div className="text-[#6c7086] font-mono text-xs uppercase tracking-wider mb-2">Results — {meta.label}</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "Expected Return", value: fmtPct(result.expected_return), color: "#9ece6a" },
                    { label: "Volatility",       value: fmtPct(result.volatility),       color: "#f7768e" },
                    { label: "Sharpe Ratio",     value: fmt(result.sharpe_ratio, 3),     color: "#7aa2f7" },
                    { label: model === "cvar" ? "CVaR" : model === "entropy" ? "Entropy" : "# Assets",
                      value: model === "cvar" ? fmt(result.cvar, 4)
                           : model === "entropy" ? fmt(result.entropy, 3)
                           : String(result.tickers.length),
                      color: "#e0af68" },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="bg-[#11111b] border border-[#2a2a3e] rounded-lg p-3">
                      <div className="text-[#6c7086] text-xs mb-1">{label}</div>
                      <div className="font-mono font-bold text-lg" style={{ color }}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <AllocationChart weightsMap={result.weights_map} />

                {frontier && (
                  <EfficientFrontierChart
                    frontier={frontier.frontier}
                    optimal={result}
                    model={model}
                  />
                )}
              </div>

              {/* RMT stats */}
              {result.rmt_stats && (
                <div className="bg-[#11111b] border border-[#7dcfff]/20 rounded-lg p-4">
                  <div className="text-[#7dcfff] font-mono text-xs uppercase tracking-wider mb-2">RMT Analysis (Marchenko-Pastur)</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                    <div><span className="text-[#6c7086]">Signal EV: </span><span className="text-[#9ece6a]">{result.rmt_stats.n_signal}</span></div>
                    <div><span className="text-[#6c7086]">Noise EV: </span><span className="text-[#f7768e]">{result.rmt_stats.n_noise}</span></div>
                    <div><span className="text-[#6c7086]">λ+: </span><span className="text-[#7dcfff]">{fmt(result.rmt_stats.lambda_max, 3)}</span></div>
                    <div><span className="text-[#6c7086]">λ−: </span><span className="text-[#7dcfff]">{fmt(result.rmt_stats.lambda_min, 3)}</span></div>
                  </div>
                </div>
              )}

              {/* Quantum stats */}
              {result.n_selected != null && (
                <div className="bg-[#11111b] border border-[#bb9af7]/20 rounded-lg p-4">
                  <div className="text-[#bb9af7] font-mono text-xs uppercase tracking-wider mb-2">Quantum Annealing Result</div>
                  <div className="grid grid-cols-3 gap-3 text-xs font-mono">
                    <div><span className="text-[#6c7086]">Selected: </span><span className="text-[#bb9af7]">{result.n_selected} / {result.tickers.length}</span></div>
                    <div><span className="text-[#6c7086]">QUBO Energy: </span><span className="text-[#e0af68]">{fmt(result.qubo_energy, 4)}</span></div>
                    <div><span className="text-[#6c7086]">λ risk: </span><span className="text-[#7aa2f7]">{result.risk_aversion}</span></div>
                  </div>
                </div>
              )}

              {/* Entropy stats */}
              {result.effective_n != null && (
                <div className="bg-[#11111b] border border-[#e0af68]/20 rounded-lg p-4">
                  <div className="text-[#e0af68] font-mono text-xs uppercase tracking-wider mb-2">Max Entropy Stats</div>
                  <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                    <div><span className="text-[#6c7086]">Shannon Entropy H: </span><span className="text-[#e0af68]">{fmt(result.entropy, 4)} nats</span></div>
                    <div><span className="text-[#6c7086]">Effective N (e^H): </span><span className="text-[#9ece6a]">{fmt(result.effective_n, 2)}</span></div>
                  </div>
                </div>
              )}

              {/* Citation */}
              <div className="text-[#45475a] text-xs font-mono border-t border-[#1e1e2e] pt-3">
                Reference: {meta.ref}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function OptimizerPage() {
  return (
    <Suspense fallback={<div className="p-6 text-[#6c7086]">Loading…</div>}>
      <OptimizerInner />
    </Suspense>
  );
}
