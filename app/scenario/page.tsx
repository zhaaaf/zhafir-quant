"use client";
import { useState } from "react";
import Topbar from "@/components/layout/Topbar";
import { Loader2, Plus, X, Play, Clock, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Info } from "lucide-react";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const GRADE_COLOR: Record<string, string> = {
  A: "#9ece6a", B: "#7aa2f7", C: "#e0af68", F: "#f7768e",
};
const ACTION_COLOR: Record<string, string> = {
  "BELI DI OPEN": "#9ece6a", "HATI-HATI": "#e0af68", "SKIP HARI INI": "#f7768e",
};

interface TickerStat {
  mean_daily: number; std_daily: number; win_rate: number;
  avg_win: number; avg_loss: number; max_drawdown: number;
  best_day: number; sharpe_daily: number; sharpe_annual: number;
  positive_days: number; total_days: number; recent_trend: string;
}

interface IntradayResult {
  tickers: string[];
  weights_map: Record<string, number>;
  expected_daily_pct: number;
  daily_vol_pct: number;
  daily_sharpe: number;
  annual_sharpe_equiv: number;
  ticker_stats: Record<string, TickerStat>;
  stop_loss: { stop_loss_pct: number; take_profit_pct: number; risk_reward_ratio: number; note: string };
  interpretation: { grade: string; action: string; action_detail: string; messages: string[]; warnings: string[]; suggestions: string[] };
  days_analyzed: number;
  note: string;
}

export default function ScenarioPage() {
  const [tickers, setTickers]       = useState<string[]>(["BBCA.JK", "TLKM.JK", "BMRI.JK"]);
  const [tickerInput, setTickerInput] = useState("");
  const [days, setDays]             = useState(60);
  const [rfRate, setRfRate]         = useState("5.75");
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [result, setResult]         = useState<IntradayResult | null>(null);

  const addTicker = () => {
    const t = tickerInput.trim().toUpperCase();
    if (t && !tickers.includes(t) && tickers.length < 10) {
      setTickers(p => [...p, t]);
      setTickerInput("");
    }
  };

  const run = async () => {
    if (tickers.length < 2) { setError("Minimal 2 ticker"); return; }
    setLoading(true); setError(null); setResult(null);
    try {
      const r = await fetch(`${BASE}/api/optimizer/intraday`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tickers, days, risk_free_rate: parseFloat(rfRate) / 100 }),
      });
      if (!r.ok) { const e = await r.json(); throw new Error(e.detail || "Error"); }
      setResult(await r.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally { setLoading(false); }
  };

  const interp = result?.interpretation;
  const sl     = result?.stop_loss;

  return (
    <div className="min-h-screen pb-6">
      <Topbar title="Day Trade Scenario" subtitle="Beli Open 09:00 · Jual Close 15:45 WIB" />

      <div className="p-4 md:p-6 max-w-5xl space-y-5">

        {/* Explainer */}
        <div className="bg-[#11111b] border border-[#2a2a3e] rounded-xl p-4">
          <div className="text-[#7aa2f7] font-semibold text-sm mb-2">Apa itu Day Trade Scenario?</div>
          <div className="text-[#6c7086] text-xs space-y-1 leading-relaxed">
            <div>→ Model menganalisis <strong className="text-[#cdd6f4]">open-to-close return</strong> (harga buka vs harga tutup) dari {days} hari terakhir.</div>
            <div>→ Berbeda dengan optimisasi biasa yang pakai <em>close-to-close</em> — untuk day trader, yang penting adalah pergerakan harga <strong className="text-[#cdd6f4]">di dalam satu hari</strong>.</div>
            <div>→ Output: alokasi optimal + stop loss/take profit + sinyal beli/skip hari ini.</div>
          </div>
        </div>

        {/* Setup */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_200px] gap-4">
          {/* Tickers */}
          <div className="bg-[#11111b] border border-[#2a2a3e] rounded-xl p-4 space-y-3">
            <div className="text-[#a6adc8] font-semibold text-sm">Pilih Saham</div>
            <div className="flex gap-2">
              <input
                className="flex-1 bg-[#0a0a0f] border border-[#2a2a3e] text-[#cdd6f4] text-sm px-3 py-2 rounded-lg placeholder:text-[#45475a] outline-none focus:border-[#7aa2f7]/50"
                placeholder="BBCA.JK, AAPL…"
                value={tickerInput}
                onChange={e => setTickerInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addTicker()}
              />
              <button onClick={addTicker} className="px-3 py-2 bg-[#1e2035] border border-[#2a2a3e] text-[#7aa2f7] rounded-lg hover:bg-[#252545]">
                <Plus size={14} />
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {tickers.map(t => (
                <span key={t} className="flex items-center gap-1 px-2 py-0.5 bg-[#1e2035] border border-[#3d59a1]/40 rounded text-[#7aa2f7] font-mono text-xs">
                  {t}
                  <button onClick={() => setTickers(p => p.filter(x => x !== t))} className="text-[#45475a] hover:text-[#f7768e]"><X size={9} /></button>
                </span>
              ))}
            </div>
            <div className="text-[#45475a] text-xs">Untuk IDX tambahkan .JK · Contoh: BBCA.JK, TLKM.JK, BMRI.JK</div>
          </div>

          {/* Config */}
          <div className="bg-[#11111b] border border-[#2a2a3e] rounded-xl p-4 space-y-3">
            <div className="text-[#a6adc8] font-semibold text-sm">Konfigurasi</div>
            <label className="flex flex-col gap-1">
              <span className="text-[#6c7086] text-xs font-mono">Hari Analisis: <span className="text-[#7aa2f7]">{days}</span></span>
              <input type="range" min={20} max={90} step={5} value={days} onChange={e => setDays(+e.target.value)}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                style={{ background: `linear-gradient(to right, #7aa2f7 ${(days-20)/70*100}%, #2a2a3e ${(days-20)/70*100}%)` }} />
              <div className="flex justify-between text-[10px] text-[#45475a]"><span>20</span><span>60 (standar)</span><span>90</span></div>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[#6c7086] text-xs font-mono">Risk-Free Rate %</span>
              <input type="number" step="0.1" value={rfRate} onChange={e => setRfRate(e.target.value)}
                className="bg-[#0a0a0f] border border-[#2a2a3e] text-[#cdd6f4] text-xs rounded px-2 py-1.5 outline-none w-full" />
              <span className="text-[#45475a] text-[10px]">BI Rate: 5.75%</span>
            </label>
          </div>
        </div>

        {/* Run button */}
        <button onClick={run} disabled={loading || tickers.length < 2}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm bg-[#f7768e] text-[#0a0a0f] disabled:opacity-40 hover:bg-[#f7768e]/90 transition-colors">
          {loading ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />}
          {loading ? "Menganalisis data intraday…" : `⚡ Analisis Day Trade · ${tickers.length} Saham`}
        </button>

        {error && <div className="text-[#f7768e] text-xs p-3 rounded-lg bg-[#f7768e]/10 border border-[#f7768e]/30">{error}</div>}

        {/* Results */}
        {result && (
          <div className="space-y-5">

            {/* Verdict */}
            <div className={`border rounded-xl p-5 space-y-3 ${
              interp?.grade === "A" ? "border-[#9ece6a]/30 bg-[#9ece6a]/5"
            : interp?.grade === "B" ? "border-[#7aa2f7]/30 bg-[#7aa2f7]/5"
            : interp?.grade === "C" ? "border-[#e0af68]/30 bg-[#e0af68]/5"
            : "border-[#f7768e]/30 bg-[#f7768e]/5"}`}>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center font-black text-2xl shrink-0"
                  style={{ background: GRADE_COLOR[interp?.grade ?? "F"] + "22", color: GRADE_COLOR[interp?.grade ?? "F"] }}>
                  {interp?.grade}
                </div>
                <div>
                  <div className="font-bold text-base" style={{ color: ACTION_COLOR[interp?.action ?? ""] ?? "#6c7086" }}>
                    {interp?.action}
                  </div>
                  <div className="text-[#6c7086] text-xs mt-0.5">{interp?.action_detail}</div>
                </div>
              </div>

              {interp?.messages.map((m, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-[#a6adc8]">
                  <Info size={11} className="text-[#7aa2f7] mt-0.5 shrink-0" />
                  <span>{m}</span>
                </div>
              ))}
              {interp?.warnings.map((w, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-[#f7768e]">
                  <AlertTriangle size={11} className="mt-0.5 shrink-0" />
                  <span>{w}</span>
                </div>
              ))}
              {(interp?.suggestions ?? []).length > 0 && (
                <div className="border-t border-[#2a2a3e] pt-3 space-y-1">
                  {interp?.suggestions.map((s, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-[#a6adc8]">
                      <CheckCircle size={11} className="text-[#e0af68] mt-0.5 shrink-0" />
                      <span>{s}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Timeline */}
            <div className="bg-[#11111b] border border-[#2a2a3e] rounded-xl p-5">
              <div className="text-[#6c7086] font-mono text-xs uppercase tracking-wider mb-4">Rencana Trading Hari Ini</div>
              <div className="space-y-3">
                {[
                  { time: "08:45 WIB", icon: "🔔", label: "Notifikasi Signal", desc: "Terima sinyal otomatis via ntfy", color: "#7aa2f7" },
                  { time: "09:00 WIB", icon: "📈", label: "BELI di Open", desc: `Alokasi: ${Object.entries(result.weights_map).filter(([,w])=>w>0.01).map(([t,w])=>`${t} ${(w*100).toFixed(0)}%`).join(" · ")}`, color: ACTION_COLOR[interp?.action ?? ""] ?? "#9ece6a" },
                  { time: "Sepanjang hari", icon: "👁", label: "Monitor", desc: `Stop Loss: ${sl?.stop_loss_pct}%  ·  Take Profit: ${sl?.take_profit_pct}%`, color: "#e0af68" },
                  { time: "15:45 WIB", icon: "💰", label: "JUAL di Close", desc: `Expected return: ${result.expected_daily_pct > 0 ? "+" : ""}${result.expected_daily_pct}% hari ini`, color: "#9ece6a" },
                ].map(({ time, icon, label, desc, color }) => (
                  <div key={time} className="flex items-start gap-3">
                    <div className="text-center shrink-0 w-20">
                      <div className="flex items-center gap-1 text-[#6c7086] text-[10px] font-mono justify-center">
                        <Clock size={9} />
                        {time}
                      </div>
                    </div>
                    <div className="flex-1 flex items-start gap-2 pb-3 border-b border-[#1e1e2e] last:border-0 last:pb-0">
                      <span className="text-lg shrink-0">{icon}</span>
                      <div>
                        <div className="font-semibold text-sm" style={{ color }}>{label}</div>
                        <div className="text-[#6c7086] text-xs mt-0.5">{desc}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Key metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Expected Return",   value: `${result.expected_daily_pct > 0 ? "+" : ""}${result.expected_daily_pct}%`, sub: "per hari", color: result.expected_daily_pct > 0 ? "#9ece6a" : "#f7768e" },
                { label: "Volatilitas Harian", value: `${result.daily_vol_pct}%`,       sub: "std dev",     color: "#7aa2f7" },
                { label: "Daily Sharpe",       value: result.daily_sharpe.toFixed(2),    sub: "≈ Annual SR " + result.annual_sharpe_equiv.toFixed(1), color: "#e0af68" },
                { label: "Risk/Reward",        value: `${sl?.risk_reward_ratio}:1`,      sub: sl?.note?.split("—")[0], color: (sl?.risk_reward_ratio ?? 0) >= 1.5 ? "#9ece6a" : "#f7768e" },
              ].map(({ label, value, sub, color }) => (
                <div key={label} className="bg-[#11111b] border border-[#2a2a3e] rounded-lg p-3">
                  <div className="text-[#6c7086] text-xs mb-1">{label}</div>
                  <div className="font-mono font-bold text-xl" style={{ color }}>{value}</div>
                  <div className="text-[#45475a] text-[10px] mt-0.5">{sub}</div>
                </div>
              ))}
            </div>

            {/* Stop loss panel */}
            <div className="bg-[#11111b] border border-[#f7768e]/20 rounded-xl p-4">
              <div className="text-[#f7768e] font-mono text-xs uppercase tracking-wider mb-3">Risk Management</div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-[#f7768e] font-mono font-bold text-xl">{sl?.stop_loss_pct}%</div>
                  <div className="text-[#6c7086] text-xs mt-0.5">Stop Loss</div>
                  <div className="text-[#45475a] text-[10px]">Jual SEMUA jika rugi segini</div>
                </div>
                <div>
                  <div className="text-[#e0af68] font-mono font-bold text-xl">{sl?.risk_reward_ratio}:1</div>
                  <div className="text-[#6c7086] text-xs mt-0.5">Risk/Reward</div>
                  <div className="text-[#45475a] text-[10px]">{(sl?.risk_reward_ratio ?? 0) >= 1.5 ? "✓ Layak" : "✗ Kurang ideal"}</div>
                </div>
                <div>
                  <div className="text-[#9ece6a] font-mono font-bold text-xl">+{sl?.take_profit_pct}%</div>
                  <div className="text-[#6c7086] text-xs mt-0.5">Take Profit</div>
                  <div className="text-[#45475a] text-[10px]">Jual jika sudah profit segini</div>
                </div>
              </div>
            </div>

            {/* Per-ticker stats */}
            <div className="bg-[#11111b] border border-[#2a2a3e] rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-[#2a2a3e] text-[#6c7086] font-mono text-xs uppercase tracking-wider">
                Statistik Per Saham ({result.days_analyzed} hari terakhir)
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[#1e1e2e] bg-[#0a0a0f]">
                      {["Ticker","Bobot","Avg Return/hari","Win Rate","Avg Gain","Avg Loss","Best Day","Worst Day","Trend"].map(h => (
                        <th key={h} className="px-3 py-2 text-left text-[#45475a] font-mono">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.tickers.map(t => {
                      const s  = result.ticker_stats[t];
                      const w  = result.weights_map[t] ?? 0;
                      if (!s) return null;
                      const avgRet = s.mean_daily * 100;
                      return (
                        <tr key={t} className="border-b border-[#1e1e2e] hover:bg-[#1a1a2e]/50">
                          <td className="px-3 py-2.5 font-mono font-bold text-[#7aa2f7]">{t}</td>
                          <td className="px-3 py-2.5 font-mono text-[#cdd6f4]">{(w*100).toFixed(1)}%</td>
                          <td className="px-3 py-2.5 font-mono" style={{ color: avgRet >= 0 ? "#9ece6a" : "#f7768e" }}>
                            {avgRet > 0 ? "+" : ""}{avgRet.toFixed(3)}%
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-1">
                              <div className="w-16 h-1.5 bg-[#2a2a3e] rounded-full overflow-hidden">
                                <div className="h-full bg-[#9ece6a] rounded-full" style={{ width: `${s.win_rate*100}%` }} />
                              </div>
                              <span className="font-mono" style={{ color: s.win_rate >= 0.5 ? "#9ece6a" : "#f7768e" }}>
                                {(s.win_rate*100).toFixed(0)}%
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 font-mono text-[#9ece6a]">+{(s.avg_win*100).toFixed(2)}%</td>
                          <td className="px-3 py-2.5 font-mono text-[#f7768e]">{(s.avg_loss*100).toFixed(2)}%</td>
                          <td className="px-3 py-2.5 font-mono text-[#9ece6a]">+{(s.best_day*100).toFixed(2)}%</td>
                          <td className="px-3 py-2.5 font-mono text-[#f7768e]">{(s.max_drawdown*100).toFixed(2)}%</td>
                          <td className="px-3 py-2.5 text-xs font-mono" style={{
                            color: s.recent_trend === "Momentum Naik" ? "#9ece6a"
                                 : s.recent_trend === "Momentum Turun" ? "#f7768e" : "#6c7086"
                          }}>{s.recent_trend}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="text-[#313244] text-xs font-mono">{result.note}</div>
          </div>
        )}
      </div>
    </div>
  );
}
