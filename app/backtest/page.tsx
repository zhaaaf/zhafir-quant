"use client";
import { useState, useEffect } from "react";
import Topbar from "@/components/layout/Topbar";
import EquityChart from "@/components/backtest/EquityChart";
import AllocationChart from "@/components/optimizer/AllocationChart";
import { Loader2, Play, Plus, X, TrendingUp, TrendingDown, Minus } from "lucide-react";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface Metric { label: string; value: string; color: string; sub?: string }
interface KellyData { kelly_full: number; kelly_half: number; win_rate: number; avg_gain_pct: number; avg_loss_pct: number; gain_loss_ratio: number; interpretation: string; note: string }
interface BacktestResult {
  total_return: number; annualized_return: number; annualized_vol: number;
  sharpe_ratio: number; sortino_ratio: number; calmar_ratio: number;
  max_drawdown: number; win_rate: number; var_95: number; cvar_95: number;
  n_rebalances: number; transaction_cost_pct: number;
  initial_capital: number; final_capital: number;
  dates: string[]; equity_curve: number[]; daily_returns: number[];
  tickers: string[]; weights: Record<string, number>;
  kelly: KellyData;
  benchmark?: { total_return: number; annualized_return: number; sharpe_ratio: number; sortino_ratio: number; max_drawdown: number; equity_curve: number[] };
}

const REBAL = ["daily","weekly","monthly"] as const;

export default function BacktestPage() {
  const [tickers, setTickers]       = useState<string[]>(["AAPL","MSFT","GOOGL"]);
  const [tickerInput, setTickerInput] = useState("");
  const [weightsInput, setWeightsInput] = useState<Record<string, string>>({});
  const [period, setPeriod]         = useState("2y");
  const [capital, setCapital]       = useState("10000");
  const [txCost, setTxCost]         = useState("0.1");
  const [rebal, setRebal]           = useState<typeof REBAL[number]>("monthly");
  const [rf, setRf]                 = useState("5.75");
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [result, setResult]         = useState<BacktestResult | null>(null);

  // Equal-weight default
  useEffect(() => {
    const eq = tickers.length ? 1 / tickers.length : 1;
    const map: Record<string, string> = {};
    tickers.forEach(t => { map[t] = weightsInput[t] ?? String((eq * 100).toFixed(1)); });
    setWeightsInput(map);
  }, [tickers]);

  const addTicker = () => {
    const t = tickerInput.trim().toUpperCase();
    if (t && !tickers.includes(t)) { setTickers(p => [...p, t]); setTickerInput(""); }
  };

  const run = async () => {
    if (tickers.length < 1) { setError("Tambah minimal 1 ticker"); return; }
    setLoading(true); setError(null); setResult(null);
    try {
      const weights: Record<string, number> = {};
      let total = 0;
      tickers.forEach(t => { const v = parseFloat(weightsInput[t] || "0"); weights[t] = v; total += v; });
      if (total <= 0) { setError("Total bobot harus > 0"); setLoading(false); return; }
      Object.keys(weights).forEach(k => { weights[k] = weights[k] / total; });

      const r = await fetch(`${BASE}/api/backtest/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tickers, weights,
          period, initial_capital: parseFloat(capital),
          transaction_cost: parseFloat(txCost) / 100,
          rebalance_freq: rebal,
          rf_annual: parseFloat(rf) / 100,
        }),
      });
      if (!r.ok) { const e = await r.json(); throw new Error(e.detail || "Error"); }
      setResult(await r.json());
    } catch (e) { setError(e instanceof Error ? e.message : "Failed"); }
    finally { setLoading(false); }
  };

  const metrics: Metric[] = result ? [
    { label: "Total Return",       value: `${result.total_return > 0 ? "+" : ""}${result.total_return}%`,    color: result.total_return >= 0 ? "#9ece6a" : "#f7768e" },
    { label: "Ann. Return",        value: `${result.annualized_return > 0 ? "+" : ""}${result.annualized_return}%`, color: result.annualized_return >= 0 ? "#9ece6a" : "#f7768e" },
    { label: "Ann. Volatility",    value: `${result.annualized_vol}%`,   color: "#f7768e" },
    { label: "Sharpe Ratio",       value: String(result.sharpe_ratio),   color: result.sharpe_ratio >= 1 ? "#9ece6a" : result.sharpe_ratio >= 0.5 ? "#e0af68" : "#f7768e",
      sub: "SR = √252·E[Rp-Rf]/σ" },
    { label: "Sortino Ratio",      value: String(result.sortino_ratio),  color: result.sortino_ratio >= 1.2 ? "#9ece6a" : result.sortino_ratio >= 0.6 ? "#e0af68" : "#f7768e",
      sub: "σd = downside only" },
    { label: "Calmar Ratio",       value: String(result.calmar_ratio),   color: result.calmar_ratio >= 0.5 ? "#9ece6a" : "#e0af68",
      sub: "Return / MaxDD" },
    { label: "Max Drawdown",       value: `-${result.max_drawdown}%`,    color: "#f7768e" },
    { label: "Win Rate",           value: `${result.win_rate}%`,         color: result.win_rate >= 55 ? "#9ece6a" : result.win_rate >= 48 ? "#e0af68" : "#f7768e" },
    { label: "VaR 95%",            value: `${result.var_95}%/day`,       color: "#f7768e", sub: "1-day at 95%" },
    { label: "CVaR 95%",           value: `${result.cvar_95}%/day`,      color: "#f7768e", sub: "Exp. tail loss" },
    { label: "Final Capital",      value: `$${result.final_capital.toLocaleString()}`, color: result.final_capital >= result.initial_capital ? "#9ece6a" : "#f7768e" },
    { label: "Rebalances",         value: String(result.n_rebalances),   color: "#6c7086", sub: `Cost ${result.transaction_cost_pct}%/trade` },
  ] : [];

  const kelly = result?.kelly;

  return (
    <div className="min-h-screen pb-6">
      <Topbar title="Backtesting Engine" subtitle="Vectorized · Sharpe · Sortino · Max Drawdown · Kelly" />

      <div className="p-4 md:p-6 max-w-6xl space-y-5">

        {/* Reference strip */}
        <div className="bg-[#11111b] border border-[#2a2a3e] rounded-lg px-4 py-2.5 text-xs text-[#45475a] font-mono flex flex-wrap gap-x-4 gap-y-1">
          <span>Sharpe (1966)</span>
          <span>Sortino & Price (1994) — σd downside only</span>
          <span>Kelly (1956) — f* = (b·p − q)/b</span>
          <span>Calmar (1991) — Return/MaxDD</span>
          <span>TDS Bab 6: Event-driven evaluation</span>
        </div>

        {/* Config */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_260px] gap-5">

          {/* Tickers + weights */}
          <div className="bg-[#11111b] border border-[#2a2a3e] rounded-xl p-5 space-y-4">
            <div className="text-[#a6adc8] font-semibold text-sm">Portfolio</div>
            <div className="flex gap-2">
              <input className="flex-1 bg-[#0a0a0f] border border-[#2a2a3e] text-[#cdd6f4] text-sm px-3 py-2 rounded-lg placeholder:text-[#45475a] outline-none focus:border-[#7aa2f7]/50"
                placeholder="BBCA.JK, AAPL…" value={tickerInput}
                onChange={e => setTickerInput(e.target.value)} onKeyDown={e => e.key === "Enter" && addTicker()} />
              <button onClick={addTicker} className="px-3 py-2 bg-[#1e2035] border border-[#2a2a3e] text-[#7aa2f7] rounded-lg hover:bg-[#252545]">
                <Plus size={14} />
              </button>
            </div>

            <div className="space-y-2">
              {tickers.map(t => (
                <div key={t} className="flex items-center gap-2">
                  <span className="font-mono text-[#7aa2f7] text-xs w-24 shrink-0">{t}</span>
                  <div className="relative flex-1">
                    <input type="number" min="0" max="100" step="0.1"
                      value={weightsInput[t] ?? ""}
                      onChange={e => setWeightsInput(p => ({ ...p, [t]: e.target.value }))}
                      className="w-full bg-[#0a0a0f] border border-[#2a2a3e] text-[#cdd6f4] text-xs rounded px-2 py-1.5 outline-none pr-8"
                    />
                    <span className="absolute right-2 top-1.5 text-[#45475a] text-xs">%</span>
                  </div>
                  <button onClick={() => setTickers(p => p.filter(x => x !== t))} className="text-[#45475a] hover:text-[#f7768e]">
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
            <div className="text-[#45475a] text-xs">Total bobot akan dinormalisasi otomatis ke 100%</div>
          </div>

          {/* Parameters */}
          <div className="bg-[#11111b] border border-[#2a2a3e] rounded-xl p-5 space-y-3">
            <div className="text-[#a6adc8] font-semibold text-sm">Parameter</div>

            {[
              { label: "Period Data",       val: period,  set: setPeriod,  opts: ["6mo","1y","2y","3y","5y"] },
              { label: "Frekuensi Rebalans", val: rebal,   set: setRebal,   opts: REBAL },
            ].map(({ label, val, set, opts }) => (
              <label key={label} className="flex flex-col gap-1">
                <span className="text-[#6c7086] text-xs font-mono">{label}</span>
                <select value={val} onChange={e => (set as (v: string) => void)(e.target.value)}
                  className="bg-[#0a0a0f] border border-[#2a2a3e] text-[#cdd6f4] text-xs rounded px-2 py-1.5 outline-none">
                  {opts.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </label>
            ))}

            {[
              { label: "Modal Awal ($)",     val: capital,  set: setCapital,  ph: "10000" },
              { label: "Biaya Transaksi %",  val: txCost,   set: setTxCost,   ph: "0.1"  },
              { label: "Risk-Free Rate %",   val: rf,       set: setRf,       ph: "5.75" },
            ].map(({ label, val, set, ph }) => (
              <label key={label} className="flex flex-col gap-1">
                <span className="text-[#6c7086] text-xs font-mono">{label}</span>
                <input type="number" step="0.1" value={val} placeholder={ph}
                  onChange={e => set(e.target.value)}
                  className="bg-[#0a0a0f] border border-[#2a2a3e] text-[#cdd6f4] text-xs rounded px-2 py-1.5 outline-none w-full" />
              </label>
            ))}
          </div>
        </div>

        {/* Run button */}
        <button onClick={run} disabled={loading || tickers.length < 1}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm bg-[#7aa2f7] text-[#0a0a0f] disabled:opacity-40 hover:bg-[#7aa2f7]/90 transition-colors">
          {loading ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />}
          {loading ? "Running backtest…" : `Run Backtest · ${tickers.length} asset · ${period}`}
        </button>
        {error && <div className="text-[#f7768e] text-xs p-3 rounded-lg bg-[#f7768e]/10 border border-[#f7768e]/30">{error}</div>}

        {/* Results */}
        {result && (
          <div className="space-y-5">

            {/* Equity curve */}
            <EquityChart
              dates={result.dates} equity={result.equity_curve}
              benchmark={result.benchmark?.equity_curve}
              initialCap={result.initial_capital}
            />

            {/* Benchmark comparison */}
            {result.benchmark && (
              <div className="bg-[#11111b] border border-[#2a2a3e] rounded-xl p-4">
                <div className="text-[#6c7086] font-mono text-xs uppercase tracking-wider mb-3">vs Equal-Weight Benchmark</div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                  {[
                    { label: "Total Return",  port: result.total_return,       bench: result.benchmark.total_return },
                    { label: "Ann. Return",   port: result.annualized_return,  bench: result.benchmark.annualized_return },
                    { label: "Sharpe",        port: result.sharpe_ratio,       bench: result.benchmark.sharpe_ratio },
                    { label: "Sortino",       port: result.sortino_ratio,      bench: result.benchmark.sortino_ratio },
                    { label: "Max Drawdown",  port: -result.max_drawdown,      bench: -result.benchmark.max_drawdown },
                  ].map(({ label, port, bench }) => {
                    const better = port > bench;
                    return (
                      <div key={label} className="bg-[#0a0a0f] border border-[#1e1e2e] rounded-lg p-2.5">
                        <div className="text-[#45475a] mb-1">{label}</div>
                        <div className="flex items-center gap-1">
                          {better ? <TrendingUp size={10} className="text-[#9ece6a]" /> : <TrendingDown size={10} className="text-[#f7768e]" />}
                          <span className="font-mono font-bold" style={{ color: better ? "#9ece6a" : "#f7768e" }}>
                            {typeof port === "number" ? port.toFixed(2) : port}
                          </span>
                        </div>
                        <div className="text-[#313244] font-mono text-[10px]">
                          BM: {typeof bench === "number" ? bench.toFixed(2) : bench}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Metrics grid */}
            <div>
              <div className="text-[#6c7086] font-mono text-xs uppercase tracking-wider mb-3">Performance Metrics</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {metrics.map(({ label, value, color, sub }) => (
                  <div key={label} className="bg-[#11111b] border border-[#2a2a3e] rounded-lg p-3">
                    <div className="text-[#6c7086] text-xs mb-0.5">{label}</div>
                    <div className="font-mono font-bold text-lg leading-tight" style={{ color }}>{value}</div>
                    {sub && <div className="text-[#313244] text-[10px] font-mono mt-0.5">{sub}</div>}
                  </div>
                ))}
              </div>
            </div>

            {/* Kelly Criterion */}
            {kelly && (
              <div className="bg-[#11111b] border border-[#e0af68]/20 rounded-xl p-5">
                <div className="text-[#e0af68] font-mono text-xs uppercase tracking-wider mb-3">
                  Kelly Criterion Position Sizing — Kelly (1956)
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs mb-3">
                  <div>
                    <div className="text-[#6c7086]">Half-Kelly (recommended)</div>
                    <div className="font-mono font-bold text-2xl text-[#e0af68]">{kelly.kelly_half}%</div>
                    <div className="text-[#45475a] text-[10px]">of total capital</div>
                  </div>
                  <div>
                    <div className="text-[#6c7086]">Full Kelly (max)</div>
                    <div className="font-mono font-bold text-xl text-[#a6adc8]">{kelly.kelly_full}%</div>
                    <div className="text-[#45475a] text-[10px]">TDS Bab 2: gunakan ½ Kelly</div>
                  </div>
                  <div>
                    <div className="text-[#6c7086]">Win Rate</div>
                    <div className="font-mono font-bold text-xl" style={{ color: kelly.win_rate >= 55 ? "#9ece6a" : "#e0af68" }}>
                      {kelly.win_rate}%
                    </div>
                  </div>
                  <div>
                    <div className="text-[#6c7086]">Gain/Loss Ratio (b)</div>
                    <div className="font-mono text-[#cdd6f4]">{kelly.gain_loss_ratio}×</div>
                  </div>
                  <div>
                    <div className="text-[#6c7086]">Avg Gain</div>
                    <div className="font-mono text-[#9ece6a]">+{kelly.avg_gain_pct}%/hari</div>
                  </div>
                  <div>
                    <div className="text-[#6c7086]">Avg Loss</div>
                    <div className="font-mono text-[#f7768e]">-{kelly.avg_loss_pct}%/hari</div>
                  </div>
                </div>
                <div className="bg-[#0a0a0f] border border-[#e0af68]/20 rounded-lg px-3 py-2 text-xs font-mono text-[#e0af68]">
                  {kelly.interpretation}
                </div>
                <div className="text-[#45475a] text-[10px] font-mono mt-2">{kelly.note}</div>
              </div>
            )}

            {/* Allocation */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AllocationChart weightsMap={result.weights} />
              <div className="bg-[#11111b] border border-[#2a2a3e] rounded-xl p-4 text-xs space-y-2">
                <div className="text-[#6c7086] font-mono text-xs uppercase tracking-wider mb-3">Transaction Cost Model (TDS Bab 1)</div>
                <div className="font-mono text-[#6c7086] text-[10px] bg-[#0a0a0f] border border-[#1e1e2e] rounded p-3 leading-loose">
                  Cost_total = γ·P_mid·Q + η·σ·P·Q·√(Q/V)
                  <br />γ = {txCost}% per transaksi (broker commission)
                  <br />Rebalans: {rebal} ({result.n_rebalances}× selama {period})
                </div>
                <div className="text-[#a6adc8] font-semibold mt-2">Referensi Akademik:</div>
                <div className="space-y-1 text-[#45475a]">
                  <div>• Sharpe (1966) — Mutual Fund Performance</div>
                  <div>• Sortino & Price (1994) — Downside Risk Framework</div>
                  <div>• Kelly (1956) — Information Rate Theory</div>
                  <div>• Calmar (1991) — Risk-adjusted return metric</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
