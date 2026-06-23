"use client";
import { useState, useEffect } from "react";
import { Bell, Send, Loader2, CheckCircle, XCircle, Plus, X } from "lucide-react";
import { api } from "@/lib/api";

const SCHEMA_COLORS: Record<string, string> = {
  day: "#f7768e", swing: "#e0af68", long: "#9ece6a",
};
const SCHEMA_LABELS: Record<string, string> = {
  day: "⚡ Day Trading", swing: "📈 Swing Trading", long: "🌱 Long Invest",
};

export default function NotificationForm() {
  const [topic, setTopic]   = useState("");
  const [tickers, setTickers] = useState<string[]>([]);
  const [schema, setSchema] = useState<"day"|"swing"|"long">("swing");
  const [enabled, setEnabled] = useState(false);
  const [tickerInput, setTickerInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [running, setRunning] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testResult, setTestResult] = useState<{ok: boolean; msg: string} | null>(null);
  const [signals, setSignals] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/schedule/config`)
      .then(r => r.json())
      .then(d => {
        setTopic(d.ntfy_topic ?? "");
        setTickers(d.watchlist ?? []);
        setSchema(d.schema ?? "swing");
        setEnabled(d.notifications_enabled ?? false);
      })
      .catch(() => {});
  }, []);

  const save = async () => {
    setLoading(true); setSaved(false);
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/schedule/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ntfy_topic: topic, watchlist: tickers, schema, notifications_enabled: enabled }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally { setLoading(false); }
  };

  const test = async () => {
    setTesting(true); setTestResult(null);
    try {
      const r = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/schedule/test`, { method: "POST" });
      const d = await r.json();
      setTestResult({ ok: d.success, msg: d.success ? "Notifikasi terkirim ke HP kamu!" : d.error });
    } catch { setTestResult({ ok: false, msg: "Connection error" }); }
    finally { setTesting(false); }
  };

  const runNow = async () => {
    setRunning(true);
    try {
      const r = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/schedule/run-now`, { method: "POST" });
      const d = await r.json();
      if (d.results) {
        const map: Record<string, string> = {};
        d.results.forEach((s: {ticker: string; signal: string}) => { map[s.ticker] = s.signal; });
        setSignals(map);
      }
    } finally { setRunning(false); }
  };

  const addTicker = () => {
    const t = tickerInput.trim().toUpperCase();
    if (t && !tickers.includes(t)) { setTickers(p => [...p, t]); setTickerInput(""); }
  };

  const signalColor: Record<string, string> = {
    BUY: "#9ece6a", SELL: "#f7768e", HOLD: "#e0af68", WATCH: "#7dcfff",
  };

  return (
    <div className="space-y-6">
      {/* ntfy Setup */}
      <div className="bg-[#11111b] border border-[#2a2a3e] rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Bell size={14} className="text-[#7aa2f7]" />
          <span className="text-[#cdd6f4] font-semibold text-sm">Push Notification Setup (ntfy.sh)</span>
        </div>

        {/* Instructions */}
        <div className="bg-[#0a0a0f] border border-[#1e1e2e] rounded-lg p-4 mb-4 text-xs space-y-2 text-[#6c7086]">
          <div className="text-[#7aa2f7] font-semibold mb-1 font-mono">CARA SETUP (1 menit):</div>
          <div>1. Install app <span className="text-[#cdd6f4] font-mono">ntfy</span> di HP (Android/iOS — gratis)</div>
          <div>2. Buka app → tap <span className="text-[#cdd6f4] font-mono">+</span> → ketik topic unik misal: <span className="text-[#7aa2f7] font-mono">zhafir-quant-2025</span></div>
          <div>3. Masukkan topic yang sama di bawah → Save → Test</div>
          <div className="text-[#45475a]">Topic = "channel" notifikasimu. Pakai nama unik agar tidak bentrok dengan orang lain.</div>
        </div>

        <div className="space-y-3">
          <label className="flex flex-col gap-1">
            <span className="text-[#6c7086] text-xs font-mono">ntfy Topic</span>
            <input
              className="bg-[#0a0a0f] border border-[#2a2a3e] text-[#cdd6f4] text-sm px-3 py-2 rounded-lg placeholder:text-[#45475a] outline-none focus:border-[#7aa2f7]/50"
              placeholder="contoh: zhafir-quant-2025"
              value={topic}
              onChange={e => setTopic(e.target.value)}
            />
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} className="accent-[#7aa2f7]" />
            <span className="text-[#a6adc8] text-sm">Aktifkan notifikasi otomatis 08:45 & 15:45 WIB</span>
          </label>
        </div>
      </div>

      {/* Investor Schema */}
      <div className="bg-[#11111b] border border-[#2a2a3e] rounded-xl p-5">
        <div className="text-[#6c7086] font-mono text-xs uppercase tracking-wider mb-3">Skema Investor</div>
        <div className="grid grid-cols-3 gap-2">
          {(["day","swing","long"] as const).map(s => (
            <button
              key={s}
              onClick={() => setSchema(s)}
              className={[
                "p-3 rounded-lg border text-left transition-all text-xs",
                schema === s
                  ? "border-[#7aa2f7]/40 bg-[#1e2035]"
                  : "border-[#2a2a3e] hover:border-[#313244] hover:bg-[#1a1a2e]",
              ].join(" ")}
            >
              <div className="font-semibold mb-0.5" style={{ color: SCHEMA_COLORS[s] }}>
                {SCHEMA_LABELS[s]}
              </div>
              <div className="text-[#45475a]">
                {s === "day" ? "< 1 hari" : s === "swing" ? "2–14 hari" : "3+ bulan"}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Watchlist */}
      <div className="bg-[#11111b] border border-[#2a2a3e] rounded-xl p-5">
        <div className="text-[#6c7086] font-mono text-xs uppercase tracking-wider mb-3">Watchlist (maks 10)</div>
        <div className="flex gap-2 mb-3">
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
        <div className="flex flex-wrap gap-2">
          {tickers.map(t => (
            <span key={t} className="flex items-center gap-1.5 px-2.5 py-1 bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg font-mono text-xs">
              <span className="text-[#7aa2f7]">{t}</span>
              {signals[t] && (
                <span className="font-bold" style={{ color: signalColor[signals[t]] ?? "#6c7086" }}>
                  {signals[t]}
                </span>
              )}
              <button onClick={() => setTickers(p => p.filter(x => x !== t))} className="text-[#45475a] hover:text-[#f7768e]">
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button onClick={save} disabled={loading}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#7aa2f7] text-[#0a0a0f] rounded-lg font-semibold text-sm hover:bg-[#7aa2f7]/90 transition-colors disabled:opacity-40">
          {loading ? <Loader2 size={14} className="animate-spin" /> : saved ? <CheckCircle size={14} /> : null}
          {saved ? "Tersimpan!" : "Simpan Konfigurasi"}
        </button>

        <button onClick={test} disabled={testing || !topic}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#1e2035] border border-[#3d59a1]/40 text-[#7aa2f7] rounded-lg text-sm hover:bg-[#252545] transition-colors disabled:opacity-40">
          {testing ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
          Test Notif
        </button>

        <button onClick={runNow} disabled={running || !tickers.length}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#1a1a2e] border border-[#2a2a3e] text-[#e0af68] rounded-lg text-sm hover:bg-[#1e2035] transition-colors disabled:opacity-40">
          {running ? <Loader2 size={13} className="animate-spin" /> : <Bell size={13} />}
          Run Now
        </button>
      </div>

      {testResult && (
        <div className={`flex items-center gap-2 p-3 rounded-lg text-sm border ${
          testResult.ok
            ? "bg-[#9ece6a]/10 border-[#9ece6a]/30 text-[#9ece6a]"
            : "bg-[#f7768e]/10 border-[#f7768e]/30 text-[#f7768e]"
        }`}>
          {testResult.ok ? <CheckCircle size={14} /> : <XCircle size={14} />}
          {testResult.msg}
        </div>
      )}
    </div>
  );
}
