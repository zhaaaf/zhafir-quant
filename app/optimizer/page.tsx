"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Topbar from "@/components/layout/Topbar";
import SchemaPicker from "@/components/schema/SchemaPicker";
import ModelComparison from "@/components/optimizer/ModelComparison";
import EfficientFrontierChart from "@/components/optimizer/EfficientFrontierChart";
import AllocationChart from "@/components/optimizer/AllocationChart";
import ReturnSlider from "@/components/optimizer/ReturnSlider";
import ParamHelpButton from "@/components/optimizer/ParamHelp";
import ResultInterpretation from "@/components/optimizer/ResultInterpretation";
import { MODEL_META, fmt, fmtPct } from "@/lib/utils";
import { PARAM_HELP, MODEL_HELP } from "@/lib/paramHelp";
import { getStoredSchema, storeSchema, SCHEMAS, type Schema } from "@/lib/schema";
import { Loader2, Play, Plus, X, ChevronDown } from "lucide-react";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function Section({ title, children, defaultOpen = true }: {
  title: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
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

interface RankedModel {
  model: string; rank: number; is_winner: boolean; schema_score: number;
  sharpe_ratio?: number; expected_return?: number; volatility?: number;
  weights?: number[]; weights_map?: Record<string, number>; tickers?: string[];
  cvar?: number; effective_n?: number; entropy?: number;
  n_selected?: number; rmt_stats?: Record<string, unknown>;
  interpretation?: Record<string, unknown>; frontier?: unknown[];
  success: boolean; error?: string;
}

interface CompareResult {
  schema: Schema;
  winner: RankedModel;
  ranked: RankedModel[];
  note: string;
  ticker_stats?: Record<string, unknown>;
  stop_loss?: Record<string, unknown>;
  period: string;
  returns_type: string;
}

function OptimizerInner() {
  const params         = useSearchParams();
  const initialTickers = params.get("tickers")?.split(",").filter(Boolean) ?? [];

  const [schema, setSchema]             = useState<Schema>("swing");
  const [tickers, setTickers]           = useState<string[]>(initialTickers);
  const [tickerInput, setTickerInput]   = useState("");
  const [period, setPeriod]             = useState("1y");
  const [allowShort, setAllowShort]     = useState(false);
  const [rfDisplay, setRfDisplay]       = useState("5.75");
  const [riskFreeRate, setRiskFreeRate] = useState(0.0575);
  const [alpha, setAlpha]               = useState(0.95);
  const [riskAversion, setRiskAversion] = useState(0.5);
  const [targetReturnPct, setTargetReturnPct] = useState<number | null>(null);

  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [compareResult, setCompareResult] = useState<CompareResult | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>("");

  // Load schema from localStorage on mount
  useEffect(() => {
    const s = getStoredSchema();
    setSchema(s);
    const sc = SCHEMAS[s];
    setPeriod(sc.defaultPeriod);
    setAlpha(sc.defaultAlpha);
    setRfDisplay(String(sc.defaultRF));
    setRiskFreeRate(sc.defaultRF / 100);
  }, []);

  // When schema changes externally, sync parameters
  const handleSchemaChange = (s: Schema) => {
    setSchema(s);
    storeSchema(s);
    const sc = SCHEMAS[s];
    setPeriod(sc.defaultPeriod);
    setAlpha(sc.defaultAlpha);
    setRfDisplay(String(sc.defaultRF));
    setRiskFreeRate(sc.defaultRF / 100);
    setCompareResult(null);
    setError(null);
  };

  const addTicker = () => {
    const t = tickerInput.trim().toUpperCase();
    if (t && !tickers.includes(t)) { setTickers(p => [...p, t]); setTickerInput(""); }
  };

  const run = async () => {
    if (tickers.length < 2) { setError("Tambah minimal 2 ticker"); return; }
    setLoading(true); setError(null); setCompareResult(null);
    try {
      const r = await fetch(`${BASE}/api/optimizer/compare`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tickers, schema, period,
          risk_free_rate: riskFreeRate,
          allow_short: allowShort,
          alpha, risk_aversion: riskAversion,
        }),
      });
      if (!r.ok) { const e = await r.json(); throw new Error(e.detail || "Error"); }
      const data: CompareResult = await r.json();
      setCompareResult(data);
      setSelectedModel(data.winner.model);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Optimization failed");
    } finally { setLoading(false); }
  };

  const sc          = SCHEMAS[schema];
  const canRun      = tickers.length >= 2 && !loading;
  const activeModel = compareResult?.ranked.find(r => r.model === selectedModel);

  return (
    <div className="min-h-screen pb-24 md:pb-6">
      <Topbar
        title="Portfolio Optimizer"
        subtitle={`${sc.icon} ${sc.label} · 5 model berjalan paralel`}
      />

      <div className="p-4 md:p-6 space-y-4 max-w-6xl mx-auto lg:grid lg:grid-cols-[320px_1fr] lg:gap-6 lg:space-y-0">

        {/* ══ LEFT PANEL ══ */}
        <div className="space-y-3">

          {/* Schema — compact in optimizer */}
          <Section title={`Profil: ${sc.icon} ${sc.label}`} defaultOpen={false}>
            <SchemaPicker current={schema} onChange={handleSchemaChange} />
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
                className="px-3 py-2 bg-[#1e2035] border border-[#2a2a3e] text-[#7aa2f7] rounded-lg hover:bg-[#252545]">
                <Plus size={14} />
              </button>
            </div>
            {tickers.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tickers.map(t => (
                  <span key={t} className="flex items-center gap-1 px-2 py-0.5 bg-[#1e2035] border border-[#3d59a1]/40 rounded text-[#7aa2f7] font-mono text-xs">
                    {t}
                    <button onClick={() => setTickers(p => p.filter(x => x !== t))} className="text-[#45475a] hover:text-[#f7768e]">
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            {tickers.length < 2 && (
              <div className="text-[#45475a] text-xs">Minimal 2 ticker</div>
            )}
          </Section>

          {/* Parameters */}
          <Section title="Parameter" defaultOpen={false}>
            <label className="flex flex-col gap-1">
              <span className="text-[#6c7086] text-xs font-mono flex items-center">
                Period Data
                <ParamHelpButton help={PARAM_HELP.period} onSuggest={v => setPeriod(String(v))} />
              </span>
              <select value={period} onChange={e => setPeriod(e.target.value)}
                className="bg-[#0a0a0f] border border-[#2a2a3e] text-[#cdd6f4] text-xs rounded px-2 py-2 outline-none">
                {["1mo","3mo","6mo","1y","2y","3y","5y"].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <span className="text-[#45475a] text-[10px]">
                Default untuk {sc.label}: {sc.defaultPeriod}
              </span>
            </label>

            {/* CVaR alpha */}
            <label className="flex flex-col gap-1">
              <span className="text-[#6c7086] text-xs font-mono flex items-center">
                CVaR α
                <ParamHelpButton help={PARAM_HELP.alpha} onSuggest={v => setAlpha(Number(v))} />
              </span>
              <div className="flex items-center gap-2">
                <input type="range" min={0.9} max={0.99} step={0.01} value={alpha}
                  onChange={e => setAlpha(parseFloat(e.target.value))}
                  className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer"
                  style={{ background: `linear-gradient(to right,#9ece6a ${(alpha-0.9)/0.09*100}%,#2a2a3e ${(alpha-0.9)/0.09*100}%)` }}
                />
                <span className="font-mono text-xs text-[#9ece6a] w-10 text-right">{(alpha*100).toFixed(0)}%</span>
              </div>
            </label>

            {/* Risk-free rate */}
            <label className="flex flex-col gap-1">
              <span className="text-[#6c7086] text-xs font-mono flex items-center">
                Risk-Free Rate %
                <ParamHelpButton help={PARAM_HELP.risk_free_rate}
                  onSuggest={v => { setRfDisplay(String(v)); setRiskFreeRate(Number(v) / 100); }} />
              </span>
              <input type="number" step="0.1" min="0" max="20"
                value={rfDisplay}
                onChange={e => { setRfDisplay(e.target.value); const v = parseFloat(e.target.value); if (!isNaN(v)) setRiskFreeRate(v/100); }}
                onBlur={() => setRfDisplay((riskFreeRate*100).toFixed(2))}
                className="bg-[#0a0a0f] border border-[#2a2a3e] text-[#cdd6f4] text-xs rounded px-2 py-2 outline-none w-full focus:border-[#7aa2f7]/50"
                placeholder="5.75"
              />
              <span className="text-[#45475a] text-[10px]">BI Rate: 5.75% · SBN 10yr: ~6.5%</span>
            </label>

            {/* Short selling */}
            <label className="flex items-center gap-2 cursor-pointer py-1">
              <input type="checkbox" checked={allowShort} onChange={e => setAllowShort(e.target.checked)} className="accent-[#7aa2f7]" />
              <span className="text-[#6c7086] text-xs font-mono flex items-center">
                Allow Short Selling
                <ParamHelpButton help={PARAM_HELP.allow_short} />
              </span>
            </label>
          </Section>

          {/* Target return slider */}
          <Section title="Target Return" defaultOpen={false}>
            <ReturnSlider
              tickers={tickers} period={period} allowShort={allowShort}
              value={targetReturnPct} onChange={setTargetReturnPct}
            />
          </Section>

          {/* Desktop Run button */}
          <div className="hidden lg:block">
            <button onClick={run} disabled={!canRun}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-colors disabled:opacity-40"
              style={{ background: sc.color, color: "#0a0a0f" }}>
              {loading ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />}
              {loading ? "Running 5 models…" : `Run — ${sc.icon} ${sc.label}`}
            </button>
            {error && <div className="mt-2 text-[#f7768e] text-xs p-3 rounded-lg bg-[#f7768e]/10 border border-[#f7768e]/30">{error}</div>}
          </div>
        </div>

        {/* ══ RIGHT PANEL — results ══ */}
        <div className="space-y-5">
          {!compareResult && !loading && (
            <div className="h-48 md:h-64 flex items-center justify-center text-[#45475a] border border-[#2a2a3e] rounded-xl bg-[#11111b]">
              <div className="text-center px-4">
                <div className="text-3xl mb-2">{sc.icon}</div>
                <div className="text-sm text-[#6c7086]">
                  {tickers.length < 2 ? "Tambah ≥ 2 ticker lalu Run" : `Tekan Run — 5 model akan berjalan paralel`}
                </div>
                <div className="text-[#45475a] text-xs mt-1 font-mono">{sc.objective}</div>
              </div>
            </div>
          )}

          {loading && (
            <div className="h-64 flex flex-col items-center justify-center text-[#6c7086] border border-[#2a2a3e] rounded-xl bg-[#11111b] gap-3">
              <Loader2 size={24} className="animate-spin" style={{ color: sc.color }} />
              <div className="text-sm">Running Markowitz · CVaR · RMT · Quantum · Entropy…</div>
              <div className="text-xs text-[#45475a] font-mono">Parallel execution · satu download data</div>
            </div>
          )}

          {compareResult && (
            <>
              {/* Model comparison table */}
              <ModelComparison
                ranked={compareResult.ranked}
                schema={compareResult.schema}
                note={compareResult.note}
                onSelect={setSelectedModel}
                selected={selectedModel}
              />

              {/* Selected model detail */}
              {activeModel && activeModel.success && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-xs text-[#6c7086] font-mono">
                    <span>Detail:</span>
                    <span style={{ color: MODEL_META[activeModel.model]?.color }}>
                      {MODEL_META[activeModel.model]?.label}
                    </span>
                    {activeModel.is_winner && (
                      <span className="px-1.5 py-0.5 rounded text-[10px]"
                        style={{ background: sc.color + "22", color: sc.color }}>
                        WINNER
                      </span>
                    )}
                    {!activeModel.is_winner && (
                      <span className="text-[#45475a]">
                        — Sharpe lebih rendah dari {compareResult.ranked[0].model.toUpperCase()} untuk schema {sc.label}
                      </span>
                    )}
                  </div>

                  {/* Day schema note */}
                  {schema === "day" && (
                    <div className="bg-[#e0af68]/10 border border-[#e0af68]/20 rounded-lg px-3 py-2 text-xs text-[#e0af68] font-mono">
                      ⚡ Day Trade mode: nilai Return/Vol/Sharpe adalah HARIAN (O→C). Ann. Sharpe = Daily × √252.
                    </div>
                  )}

                  {/* Interpretation */}
                  {activeModel.interpretation && (
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    <ResultInterpretation interp={activeModel.interpretation as any} />
                  )}

                  {/* Metrics — day schema uses daily units, others annual */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {(() => {
                      const isDay = schema === "day";
                      const ret   = activeModel.expected_return ?? 0;
                      const vol   = activeModel.volatility ?? 0;
                      const sr    = activeModel.sharpe_ratio ?? 0;
                      return [
                        {
                          label: isDay ? "Return/hari" : "Return (ann.)",
                          value: isDay ? `${(ret*100).toFixed(3)}%` : fmtPct(ret),
                          color: ret >= 0 ? "#9ece6a" : "#f7768e",
                        },
                        {
                          label: isDay ? "Vol/hari" : "Volatilitas",
                          value: isDay ? `${(vol*100).toFixed(2)}%` : fmtPct(vol),
                          color: "#f7768e",
                        },
                        {
                          label: isDay ? "Daily Sharpe" : "Sharpe Ratio",
                          value: fmt(sr, 3),
                          color: sr >= (isDay ? 0.15 : 1.0) ? "#9ece6a" : sr >= (isDay ? 0.05 : 0.5) ? "#e0af68" : "#f7768e",
                        },
                        {
                          label: activeModel.model === "cvar" ? "CVaR" : activeModel.model === "entropy" ? "Eff-N" : isDay ? "Ann. Sharpe" : "Assets",
                          value: activeModel.model === "cvar"    ? fmt(activeModel.cvar, 4)
                               : activeModel.model === "entropy" ? fmt(activeModel.effective_n, 2)
                               : isDay ? fmt(sr * Math.sqrt(252), 2)
                               : String(activeModel.tickers?.length ?? "—"),
                          color: "#e0af68",
                        },
                      ];
                    })().map(({ label, value, color }) => (
                      <div key={label} className="bg-[#11111b] border border-[#2a2a3e] rounded-lg p-3">
                        <div className="text-[#6c7086] text-xs mb-1">{label}</div>
                        <div className="font-mono font-bold text-xl leading-tight" style={{ color }}>{value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Charts */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {activeModel.weights_map && (
                      <AllocationChart weightsMap={activeModel.weights_map} />
                    )}
                    {activeModel.frontier && (activeModel.frontier as unknown[]).length > 0 && (
                      <EfficientFrontierChart
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        frontier={activeModel.frontier as any}
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        optimal={activeModel as any}
                        model={activeModel.model}
                      />
                    )}
                  </div>

                  {/* Day trade extra */}
                  {compareResult.stop_loss && (
                    <div className="bg-[#11111b] border border-[#f7768e]/20 rounded-xl p-4">
                      <div className="text-[#f7768e] font-mono text-xs uppercase tracking-wider mb-3">Risk Management (Day Trade)</div>
                      <div className="grid grid-cols-3 gap-4 text-center text-xs">
                        {[
                          { label: "Stop Loss",    key: "stop_loss_pct",    color: "#f7768e" },
                          { label: "Take Profit",  key: "take_profit_pct",  color: "#9ece6a" },
                          { label: "Risk/Reward",  key: "risk_reward_ratio", color: "#e0af68" },
                        ].map(({ label, key, color }) => (
                          <div key={label}>
                            <div className="font-mono font-bold text-lg" style={{ color }}>
                              {key === "risk_reward_ratio"
                                ? `${(compareResult.stop_loss as Record<string, number>)[key]}:1`
                                : `${(compareResult.stop_loss as Record<string, number>)[key]}%`}
                            </div>
                            <div className="text-[#6c7086]">{label}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Model usage note */}
                  <div className="bg-[#0a0a0f] border border-[#1e1e2e] rounded-lg p-3 text-xs space-y-1">
                    <div className="flex gap-1.5">
                      <span className="text-[#9ece6a]">✓ Kapan:</span>
                      <span className="text-[#6c7086]">{MODEL_HELP[activeModel.model]?.when}</span>
                    </div>
                    <div className="flex gap-1.5">
                      <span className="text-[#f7768e]">✗ Hindari:</span>
                      <span className="text-[#6c7086]">{MODEL_HELP[activeModel.model]?.avoid}</span>
                    </div>
                  </div>

                  <div className="text-[#313244] text-xs font-mono">
                    Data: {compareResult.returns_type} · Period: {compareResult.period}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Mobile sticky run bar */}
      <div className="lg:hidden fixed bottom-16 left-0 right-0 z-40 px-4 pb-2 pt-3 bg-[#0a0a0f]/95 backdrop-blur border-t border-[#2a2a3e]">
        {error && <div className="text-[#f7768e] text-xs mb-2">{error}</div>}
        <button onClick={run} disabled={!canRun}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm disabled:opacity-40"
          style={{ background: sc.color, color: "#0a0a0f" }}>
          {loading ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />}
          {loading ? "Running 5 models…"
            : tickers.length < 2 ? `Tambah ${2 - tickers.length} ticker lagi`
            : `Run ${sc.icon} ${sc.label} · ${tickers.length} assets`}
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
