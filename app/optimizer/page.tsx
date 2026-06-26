"use client";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Topbar from "@/components/layout/Topbar";
import EfficientFrontierChart from "@/components/optimizer/EfficientFrontierChart";
import AllocationChart from "@/components/optimizer/AllocationChart";
import ReturnSlider from "@/components/optimizer/ReturnSlider";
import { api } from "@/lib/api";
import type { ModelType, OptimizeResult, FrontierResult } from "@/lib/types";
import { MODEL_META, fmtPct, fmt } from "@/lib/utils";
import { Loader2, Play, Plus, X, ChevronDown } from "lucide-react";

/* ── Investor schema presets ─────────────────────────────────────── */
type Schema = "day" | "swing" | "long";
const SCHEMA_META: Record<Schema, { label: string; color: string; model: ModelType; hold: string; icon: string }> = {
  day:   { label: "Day",   color: "#f7768e", model: "cvar",    hold: "< 1 hari",  icon: "⚡" },
  swing: { label: "Swing", color: "#e0af68", model: "rmt",     hold: "2–14 hari", icon: "📈" },
  long:  { label: "Long",  color: "#9ece6a", model: "entropy", hold: "3+ bulan",  icon: "🌱" },
};

/* ── Compact model selector for mobile ──────────────────────────── */
const MODEL_KEYS: ModelType[] = ["markowitz", "cvar", "rmt", "quantum", "entropy"];

function ModelTabs({ value, onChange }: { value: ModelType; onChange: (m: ModelType) => void }) {
  return (
    <div>
      <div className="text-[#6c7086] font-mono text-xs uppercase tracking-wider mb-2">Model</div>
      <div className="flex flex-wrap gap-1.5">
        {MODEL_KEYS.map(k => {
          const m = MODEL_META[k];
          const active = value === k;
          return (
            <button key={k} onClick={() => onChange(k)}
              className={["px-2.5 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all border",
                active ? "border-transparent text-[#0a0a0f]" : "border-[#2a2a3e] text-[#6c7086] hover:text-[#cdd6f4]"
              ].join(" ")}
              style={active ? { background: m.color } : {}}
            >
              {m.label}
            </button>
          );
        })}
      </div>
      {/* One-line description of active model */}
      <div className="text-[#45475a] text-xs mt-1.5 font-mono">{MODEL_META[value].description}</div>
    </div>
  );
}

/* ── Collapsible section for mobile ─────────────────────────────── */
function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-[#11111b] border border-[#2a2a3e] rounded-xl overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-[#a6adc8] hover:bg-[#1a1a2e] transition-colors">
        {title}
        <ChevronDown size={13} className={`text-[#6c7086] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="px-4 pb-4 space-y-3">{children}</div>}
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────────────── */
function OptimizerInner() {
  const params = useSearchParams();
  const initialTickers = params.get("tickers")?.split(",").filter(Boolean) ?? [];

  const [tickers, setTickers]           = useState<string[]>(initialTickers);
  const [tickerInput, setTickerInput]   = useState("");
  const [schema, setSchema]             = useState<Schema>("swing");
  const [model, setModel]               = useState<ModelType>("rmt");
  const [period, setPeriod]             = useState("2y");
  const [allowShort, setAllowShort]     = useState(false);
  const [riskAversion, setRiskAversion] = useState(0.5);
  const [alpha, setAlpha]               = useState(0.95);
  const [targetReturnPct, setTargetReturnPct] = useState<number | null>(null);
  // FIX: store risk-free rate as display string to allow free typing
  const [rfDisplay, setRfDisplay]       = useState("4.0");
  const [riskFreeRate, setRiskFreeRate] = useState(0.04);

  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [result, setResult]   = useState<OptimizeResult | null>(null);
  const [frontier, setFrontier] = useState<FrontierResult | null>(null);

  const applySchema = (s: Schema) => { setSchema(s); setModel(SCHEMA_META[s].model); };

  const addTicker = () => {
    const t = tickerInput.trim().toUpperCase();
    if (t && !tickers.includes(t)) { setTickers(p => [...p, t]); setTickerInput(""); }
  };

  const run = async () => {
    if (tickers.length < 2) { setError("Tambah minimal 2 ticker"); return; }
    setLoading(true); setError(null); setResult(null); setFrontier(null);
    try {
      const data = await api.optimizer.compute({
        tickers, model, period,
        allow_short:    allowShort,
        risk_aversion:  riskAversion,
        alpha,
        risk_free_rate: riskFreeRate,
        target_return:  targetReturnPct !== null ? targetReturnPct / 100 : undefined,
      });
      setResult(data);
      setFrontier({ frontier: data.frontier ?? [], tickers: data.tickers, model: data.model });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Optimization failed");
    } finally { setLoading(false); }
  };

  const meta = MODEL_META[model];
  const canRun = tickers.length >= 2 && !loading;

  return (
    <div className="min-h-screen pb-24 md:pb-6">
      <Topbar title="Portfolio Optimizer" subtitle={`${meta.label} · ${tickers.length} assets`} />

      <div className="p-4 md:p-6 space-y-4 max-w-6xl mx-auto lg:grid lg:grid-cols-[320px_1fr] lg:gap-6 lg:space-y-0">

        {/* ══ LEFT PANEL ══════════════════════════════════════════ */}
        <div className="space-y-3">

          {/* Schema preset */}
          <Section title="Skema Investor" defaultOpen={true}>
            <div className="grid grid-cols-3 gap-2 pt-0.5">
              {(Object.entries(SCHEMA_META) as [Schema, typeof SCHEMA_META[Schema]][]).map(([key, s]) => (
                <button key={key} onClick={() => applySchema(key)}
                  className={["p-2.5 rounded-lg border text-center transition-all",
                    schema === key ? "border-[#7aa2f7]/40 bg-[#1e2035]" : "border-[#2a2a3e] hover:bg-[#1a1a2e]"
                  ].join(" ")}>
                  <div className="text-lg">{s.icon}</div>
                  <div className="text-xs font-semibold mt-0.5" style={{ color: s.color }}>{s.label}</div>
                  <div className="text-[10px] text-[#45475a]">{s.hold}</div>
                </button>
              ))}
            </div>
          </Section>

          {/* Assets */}
          <Section title={`Assets (${tickers.length})`} defaultOpen={true}>
            <div className="flex gap-2">
              <input
                className="flex-1 bg-[#0a0a0f] border border-[#2a2a3e] text-[#cdd6f4] text-sm px-3 py-2 rounded-lg placeholder:text-[#45475a] outline-none focus:border-[#7aa2f7]/50"
                placeholder="AAPL, BBCA.JK…"
                value={tickerInput}
                onChange={e => setTickerInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addTicker()}
              />
              <button onClick={addTicker}
                className="px-3 py-2 bg-[#1e2035] border border-[#2a2a3e] text-[#7aa2f7] rounded-lg hover:bg-[#252545] transition-colors">
                <Plus size={14} />
              </button>
            </div>
            {tickers.length > 0 && (
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
            )}
            {tickers.length < 2 && (
              <div className="text-[#45475a] text-xs">Tambah minimal 2 ticker untuk optimisasi</div>
            )}
          </Section>

          {/* Model — compact tabs */}
          <Section title="Model Matematika" defaultOpen={true}>
            <ModelTabs value={model} onChange={setModel} />
          </Section>

          {/* Parameters */}
          <Section title="Parameter" defaultOpen={false}>
            {/* Period */}
            <label className="flex flex-col gap-1">
              <span className="text-[#6c7086] text-xs font-mono">Period Data</span>
              <select value={period} onChange={e => setPeriod(e.target.value)}
                className="bg-[#0a0a0f] border border-[#2a2a3e] text-[#cdd6f4] text-xs rounded px-2 py-2 outline-none">
                {["6mo","1y","2y","3y","5y"].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </label>

            {/* CVaR alpha */}
            {model === "cvar" && (
              <label className="flex flex-col gap-1">
                <span className="text-[#6c7086] text-xs font-mono">CVaR α (confidence level)</span>
                <div className="flex items-center gap-2">
                  <input type="range" min={0.9} max={0.99} step={0.01} value={alpha}
                    onChange={e => setAlpha(parseFloat(e.target.value))}
                    className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer"
                    style={{ background: `linear-gradient(to right, #9ece6a ${(alpha-0.9)/0.09*100}%, #2a2a3e ${(alpha-0.9)/0.09*100}%)` }}
                  />
                  <span className="text-[#9ece6a] font-mono text-xs w-10 text-right">{(alpha*100).toFixed(0)}%</span>
                </div>
              </label>
            )}

            {/* Quantum λ */}
            {model === "quantum" && (
              <label className="flex flex-col gap-1">
                <span className="text-[#6c7086] text-xs font-mono">Risk Aversion λ</span>
                <div className="flex items-center gap-2">
                  <input type="range" min={0.1} max={2} step={0.1} value={riskAversion}
                    onChange={e => setRiskAversion(parseFloat(e.target.value))}
                    className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer"
                    style={{ background: `linear-gradient(to right, #bb9af7 ${riskAversion/2*100}%, #2a2a3e ${riskAversion/2*100}%)` }}
                  />
                  <span className="text-[#bb9af7] font-mono text-xs w-10 text-right">{riskAversion.toFixed(1)}</span>
                </div>
              </label>
            )}

            {/* Risk-free rate — FIX: uncontrolled display string */}
            <label className="flex flex-col gap-1">
              <span className="text-[#6c7086] text-xs font-mono">Risk-Free Rate (%/tahun)</span>
              <input
                type="number" step="0.1" min="0" max="20"
                value={rfDisplay}
                onChange={e => {
                  setRfDisplay(e.target.value);
                  const v = parseFloat(e.target.value);
                  if (!isNaN(v)) setRiskFreeRate(v / 100);
                }}
                onBlur={() => setRfDisplay((riskFreeRate * 100).toFixed(1))}
                className="bg-[#0a0a0f] border border-[#2a2a3e] text-[#cdd6f4] text-xs rounded px-2 py-2 outline-none w-full focus:border-[#7aa2f7]/50"
                placeholder="4.0"
              />
              <span className="text-[#45475a] text-[10px]">Contoh: 4.0 = BI Rate 4% per tahun</span>
            </label>

            {/* Short selling */}
            <label className="flex items-center gap-2 cursor-pointer py-1">
              <input type="checkbox" checked={allowShort} onChange={e => setAllowShort(e.target.checked)} className="accent-[#7aa2f7]" />
              <span className="text-[#6c7086] text-xs font-mono">Allow Short Selling</span>
            </label>
          </Section>

          {/* Target return slider */}
          <Section title="Target Return" defaultOpen={false}>
            <ReturnSlider
              tickers={tickers} period={period} allowShort={allowShort}
              value={targetReturnPct} onChange={setTargetReturnPct}
            />
          </Section>

          {/* Run button — desktop only (mobile uses sticky bar) */}
          <div className="hidden lg:block">
            <button onClick={run} disabled={!canRun}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-colors disabled:opacity-40"
              style={{ background: meta.color, color: "#0a0a0f" }}>
              {loading ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />}
              {loading ? "Optimizing…" : `Run ${meta.label}`}
            </button>
            {error && <div className="mt-2 text-[#f7768e] text-xs p-3 rounded-lg bg-[#f7768e]/10 border border-[#f7768e]/30">{error}</div>}
          </div>
        </div>

        {/* ══ RIGHT PANEL — results ════════════════════════════════ */}
        <div className="space-y-5">
          {!result && !loading && (
            <div className="h-48 md:h-64 flex items-center justify-center text-[#45475a] border border-[#2a2a3e] rounded-xl bg-[#11111b]">
              <div className="text-center px-4">
                <div className="text-3xl mb-2">⚗️</div>
                <div className="text-sm">{tickers.length < 2 ? "Tambah ≥ 2 ticker lalu Run" : "Tekan Run untuk mulai optimisasi"}</div>
              </div>
            </div>
          )}

          {loading && (
            <div className="h-48 md:h-64 flex flex-col items-center justify-center text-[#6c7086] border border-[#2a2a3e] rounded-xl bg-[#11111b] gap-3">
              <Loader2 size={24} className="animate-spin text-[#7aa2f7]" />
              <div className="text-sm">Running {meta.label}…</div>
              <div className="text-xs text-[#45475a] font-mono text-center px-4">{meta.ref}</div>
            </div>
          )}

          {result && (
            <>
              {/* Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Return (ann.)",  value: fmtPct(result.expected_return), color: "#9ece6a" },
                  { label: "Volatility",     value: fmtPct(result.volatility),       color: "#f7768e" },
                  { label: "Sharpe Ratio",   value: fmt(result.sharpe_ratio, 3),     color: "#7aa2f7" },
                  { label: model === "cvar" ? "CVaR" : model === "entropy" ? "Entropy" : "Assets",
                    value: model === "cvar"     ? fmt(result.cvar, 4)
                         : model === "entropy"  ? fmt(result.entropy, 3)
                         : String(result.tickers.length),
                    color: "#e0af68" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-[#11111b] border border-[#2a2a3e] rounded-lg p-3">
                    <div className="text-[#6c7086] text-xs mb-1">{label}</div>
                    <div className="font-mono font-bold text-lg leading-tight" style={{ color }}>{value}</div>
                  </div>
                ))}
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <AllocationChart weightsMap={result.weights_map} />
                {frontier && frontier.frontier.length > 0 && (
                  <EfficientFrontierChart frontier={frontier.frontier} optimal={result} model={model} />
                )}
              </div>

              {/* Model-specific stats */}
              {result.rmt_stats && (
                <div className="bg-[#11111b] border border-[#7dcfff]/20 rounded-lg p-4">
                  <div className="text-[#7dcfff] font-mono text-xs uppercase tracking-wider mb-2">RMT · Marchenko-Pastur</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                    <div><span className="text-[#6c7086]">Signal EV: </span><span className="text-[#9ece6a]">{result.rmt_stats.n_signal}</span></div>
                    <div><span className="text-[#6c7086]">Noise EV: </span><span className="text-[#f7768e]">{result.rmt_stats.n_noise}</span></div>
                    <div><span className="text-[#6c7086]">λ+: </span><span className="text-[#7dcfff]">{fmt(result.rmt_stats.lambda_max, 3)}</span></div>
                    <div><span className="text-[#6c7086]">λ−: </span><span className="text-[#7dcfff]">{fmt(result.rmt_stats.lambda_min, 3)}</span></div>
                  </div>
                </div>
              )}

              {result.n_selected != null && (
                <div className="bg-[#11111b] border border-[#bb9af7]/20 rounded-lg p-4">
                  <div className="text-[#bb9af7] font-mono text-xs uppercase tracking-wider mb-2">Quantum Annealing</div>
                  <div className="grid grid-cols-3 gap-3 text-xs font-mono">
                    <div><span className="text-[#6c7086]">Selected: </span><span className="text-[#bb9af7]">{result.n_selected}/{result.tickers.length}</span></div>
                    <div><span className="text-[#6c7086]">QUBO E: </span><span className="text-[#e0af68]">{fmt(result.qubo_energy, 3)}</span></div>
                    <div><span className="text-[#6c7086]">λ: </span><span className="text-[#7aa2f7]">{result.risk_aversion}</span></div>
                  </div>
                </div>
              )}

              {result.effective_n != null && (
                <div className="bg-[#11111b] border border-[#e0af68]/20 rounded-lg p-4">
                  <div className="text-[#e0af68] font-mono text-xs uppercase tracking-wider mb-2">Max Entropy</div>
                  <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                    <div><span className="text-[#6c7086]">H: </span><span className="text-[#e0af68]">{fmt(result.entropy, 3)} nats</span></div>
                    <div><span className="text-[#6c7086]">Eff-N: </span><span className="text-[#9ece6a]">{fmt(result.effective_n, 2)}</span></div>
                  </div>
                </div>
              )}

              <div className="text-[#313244] text-xs font-mono border-t border-[#1e1e2e] pt-3">{meta.ref}</div>
            </>
          )}
        </div>
      </div>

      {/* ══ STICKY RUN BAR — mobile only ════════════════════════════ */}
      <div className="lg:hidden fixed bottom-16 left-0 right-0 z-40 px-4 pb-2 pt-3 bg-[#0a0a0f]/95 backdrop-blur border-t border-[#2a2a3e]">
        {error && <div className="text-[#f7768e] text-xs mb-2 px-1">{error}</div>}
        <button onClick={run} disabled={!canRun}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-colors disabled:opacity-40"
          style={{ background: meta.color, color: "#0a0a0f" }}>
          {loading ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />}
          {loading ? "Optimizing…"
            : tickers.length < 2 ? `Run (tambah ${2 - tickers.length} ticker lagi)`
            : `Run ${meta.label} · ${tickers.length} assets`}
        </button>
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
