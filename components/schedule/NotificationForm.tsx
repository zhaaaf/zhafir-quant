"use client";
import { useState, useEffect } from "react";
import { Bell, Send, Loader2, CheckCircle, XCircle, Play, ChevronDown } from "lucide-react";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const UNIVERSES = ["IDX LQ45", "IDX Kompas100", "S&P 500 Top 50", "Nasdaq 100"];
const MODELS    = [
  { value: "markowitz", label: "Markowitz MVO",      color: "#7aa2f7" },
  { value: "rmt",       label: "RMT Cleaned",        color: "#7dcfff" },
  { value: "cvar",      label: "CVaR",               color: "#9ece6a" },
  { value: "entropy",   label: "Max Entropy",        color: "#e0af68" },
  { value: "quantum",   label: "Quantum-Inspired",   color: "#bb9af7" },
];
const SCHEMAS = [
  { value: "day",   label: "⚡ Day",   color: "#f7768e", hold: "<1 hari" },
  { value: "swing", label: "📈 Swing", color: "#e0af68", hold: "2-14 hr" },
  { value: "long",  label: "🌱 Long",  color: "#9ece6a", hold: "3+ bln"  },
];
const PERIODS = ["1mo","3mo","6mo","1y","2y","3y"];

interface Config {
  ntfy_topic: string;
  notifications_enabled: boolean;
  universe: string;
  top_n: number;
  schema: string;
  model: string;
  period: string;
  use_watchlist: boolean;
  watchlist: string[];
}

const DEFAULT: Config = {
  ntfy_topic: "", notifications_enabled: false,
  universe: "IDX LQ45", top_n: 8, schema: "swing", model: "markowitz",
  period: "1y", use_watchlist: false, watchlist: [],
};

export default function NotificationForm() {
  const [cfg, setCfg]         = useState<Config>(DEFAULT);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [testing, setTesting] = useState(false);
  const [running, setRunning] = useState(false);
  const [testRes, setTestRes] = useState<{ ok: boolean; msg: string } | null>(null);
  const [preview, setPreview] = useState<{ title: string; body: string } | null>(null);

  useEffect(() => {
    fetch(`${BASE}/api/schedule/config`).then(r => r.json()).then(d => setCfg({ ...DEFAULT, ...d })).catch(() => {});
  }, []);

  const set = <K extends keyof Config>(k: K) => (v: Config[K]) =>
    setCfg(p => ({ ...p, [k]: v }));

  const save = async () => {
    setSaving(true); setSaved(false);
    try {
      await fetch(`${BASE}/api/schedule/config`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cfg),
      });
      setSaved(true); setTimeout(() => setSaved(false), 3000);
    } finally { setSaving(false); }
  };

  const test = async () => {
    setTesting(true); setTestRes(null);
    try {
      const r = await fetch(`${BASE}/api/schedule/test`, { method: "POST" });
      const d = await r.json();
      setTestRes({ ok: d.success, msg: d.success ? "Notifikasi terkirim ke HP!" : (d.error ?? "Failed") });
    } catch { setTestRes({ ok: false, msg: "Connection error" }); }
    finally { setTesting(false); }
  };

  const runNow = async (session: "morning" | "closing") => {
    setRunning(true); setPreview(null);
    try {
      const r = await fetch(`${BASE}/api/schedule/run-now?session=${session}`, { method: "POST" });
      const d = await r.json();
      if (d.success) setPreview({ title: d.title, body: d.body });
      else setTestRes({ ok: false, msg: d.error ?? "Pipeline failed" });
    } catch { setTestRes({ ok: false, msg: "Connection error" }); }
    finally { setRunning(false); }
  };

  return (
    <div className="space-y-5">
      {/* ntfy topic */}
      <div className="bg-[#11111b] border border-[#2a2a3e] rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Bell size={14} className="text-[#7aa2f7]" />
          <span className="text-[#cdd6f4] font-semibold text-sm">Push Notification (ntfy.sh)</span>
        </div>

        <div className="bg-[#0a0a0f] border border-[#1e1e2e] rounded-lg p-3 text-xs text-[#6c7086] space-y-1">
          <div className="text-[#7aa2f7] font-mono font-semibold mb-1">Setup (1 menit):</div>
          <div>1. Install app <span className="text-[#cdd6f4] font-mono">ntfy</span> di HP (Android / iOS — gratis)</div>
          <div>2. Buka app → tap <span className="text-[#cdd6f4] font-mono">+</span> → ketik nama topic unik</div>
          <div>3. Masukkan nama yang sama di bawah → Simpan → Test</div>
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-[#6c7086] text-xs font-mono">ntfy Topic</span>
          <input
            className="bg-[#0a0a0f] border border-[#2a2a3e] text-[#cdd6f4] text-sm px-3 py-2 rounded-lg placeholder:text-[#45475a] outline-none focus:border-[#7aa2f7]/50"
            placeholder="contoh: zhafir-quant-2025"
            value={cfg.ntfy_topic}
            onChange={e => set("ntfy_topic")(e.target.value)}
          />
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={cfg.notifications_enabled}
            onChange={e => set("notifications_enabled")(e.target.checked)} className="accent-[#7aa2f7]" />
          <span className="text-[#a6adc8] text-sm">Aktifkan notifikasi 08:45 & 15:45 WIB</span>
        </label>
      </div>

      {/* Auto Pipeline Config */}
      <div className="bg-[#11111b] border border-[#2a2a3e] rounded-xl p-5 space-y-4">
        <div className="text-[#cdd6f4] font-semibold text-sm mb-1">⚙️ Auto Pipeline</div>
        <div className="text-[#6c7086] text-xs">Otomatis: Screen → Score → Optimize → Push ntfy. Tidak perlu buka web.</div>

        {/* Universe */}
        <div>
          <label className="text-[#6c7086] text-xs font-mono uppercase tracking-wider block mb-1.5">Universe Saham</label>
          <div className="grid grid-cols-2 gap-1.5">
            {UNIVERSES.map(u => (
              <button key={u} onClick={() => set("universe")(u)}
                className={["px-2 py-1.5 rounded text-xs font-mono text-left transition-colors border",
                  cfg.universe === u ? "bg-[#1e2035] text-[#7aa2f7] border-[#3d59a1]/40" : "text-[#6c7086] border-[#2a2a3e] hover:text-[#a6adc8]"].join(" ")}>
                {u}
              </button>
            ))}
          </div>
        </div>

        {/* Top N */}
        <div>
          <label className="text-[#6c7086] text-xs font-mono uppercase tracking-wider block mb-1.5">
            Top N Saham: <span className="text-[#7aa2f7]">{cfg.top_n}</span>
          </label>
          <input type="range" min={3} max={15} step={1} value={cfg.top_n}
            onChange={e => set("top_n")(+e.target.value)}
            className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
            style={{ background: `linear-gradient(to right, #7aa2f7 ${(cfg.top_n - 3) / 12 * 100}%, #2a2a3e ${(cfg.top_n - 3) / 12 * 100}%)` }}
          />
          <div className="flex justify-between text-[10px] text-[#45475a] font-mono mt-1">
            <span>3</span><span>diversified</span><span>15</span>
          </div>
        </div>

        {/* Schema */}
        <div>
          <label className="text-[#6c7086] text-xs font-mono uppercase tracking-wider block mb-1.5">Skema Signal</label>
          <div className="grid grid-cols-3 gap-1.5">
            {SCHEMAS.map(s => (
              <button key={s.value} onClick={() => set("schema")(s.value)}
                className={["p-2 rounded-lg border text-left text-xs transition-all",
                  cfg.schema === s.value ? "bg-[#1e2035] border-[#7aa2f7]/30" : "border-[#2a2a3e] hover:border-[#313244]"].join(" ")}>
                <div className="font-semibold" style={{ color: s.color }}>{s.label}</div>
                <div className="text-[#45475a] text-[10px]">{s.hold}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Model */}
        <div>
          <label className="text-[#6c7086] text-xs font-mono uppercase tracking-wider block mb-1.5">Optimization Model</label>
          <div className="space-y-1">
            {MODELS.map(m => (
              <button key={m.value} onClick={() => set("model")(m.value)}
                className={["w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-xs text-left transition-all",
                  cfg.model === m.value ? "bg-[#1e2035] border-[#3d59a1]/40" : "border-[#2a2a3e] hover:border-[#313244]"].join(" ")}>
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: m.color }} />
                <span style={{ color: cfg.model === m.value ? m.color : "#6c7086" }}>{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Period */}
        <div>
          <label className="text-[#6c7086] text-xs font-mono uppercase tracking-wider block mb-1.5">Periode Data</label>
          <div className="grid grid-cols-6 gap-1">
            {PERIODS.map(p => (
              <button key={p} onClick={() => set("period")(p)}
                className={["py-1 rounded text-xs font-mono transition-colors border",
                  cfg.period === p ? "bg-[#1e2035] text-[#7aa2f7] border-[#3d59a1]/40" : "text-[#6c7086] border-[#2a2a3e] hover:text-[#a6adc8]"].join(" ")}>
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-2">
        <button onClick={save} disabled={saving}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#7aa2f7] text-[#0a0a0f] rounded-lg font-bold text-sm hover:bg-[#7aa2f7]/90 transition-colors disabled:opacity-40">
          {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <CheckCircle size={14} /> : <Bell size={14} />}
          {saved ? "Tersimpan!" : "Simpan Konfigurasi"}
        </button>

        <div className="grid grid-cols-3 gap-2">
          <button onClick={test} disabled={testing || !cfg.ntfy_topic}
            className="flex items-center justify-center gap-1.5 py-2 bg-[#1e2035] border border-[#3d59a1]/40 text-[#7aa2f7] rounded-lg text-xs hover:bg-[#252545] transition-colors disabled:opacity-40">
            {testing ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
            Test Notif
          </button>
          <button onClick={() => runNow("morning")} disabled={running || !cfg.ntfy_topic}
            className="flex items-center justify-center gap-1.5 py-2 bg-[#1a1a2e] border border-[#2a2a3e] text-[#9ece6a] rounded-lg text-xs hover:bg-[#1e2035] transition-colors disabled:opacity-40">
            {running ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
            Run Morning
          </button>
          <button onClick={() => runNow("closing")} disabled={running || !cfg.ntfy_topic}
            className="flex items-center justify-center gap-1.5 py-2 bg-[#1a1a2e] border border-[#2a2a3e] text-[#e0af68] rounded-lg text-xs hover:bg-[#1e2035] transition-colors disabled:opacity-40">
            {running ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
            Run Closing
          </button>
        </div>
      </div>

      {/* Feedback */}
      {testRes && (
        <div className={`flex items-center gap-2 p-3 rounded-lg text-sm border ${testRes.ok ? "bg-[#9ece6a]/10 border-[#9ece6a]/30 text-[#9ece6a]" : "bg-[#f7768e]/10 border-[#f7768e]/30 text-[#f7768e]"}`}>
          {testRes.ok ? <CheckCircle size={14} /> : <XCircle size={14} />}
          {testRes.msg}
        </div>
      )}

      {/* Preview of last notification */}
      {preview && (
        <div className="bg-[#0a0a0f] border border-[#2a2a3e] rounded-xl overflow-hidden">
          <div className="px-3 py-2 border-b border-[#1e1e2e] flex items-center gap-2">
            <span className="text-[#7aa2f7] text-xs font-mono font-bold">Preview Notifikasi</span>
            <span className="text-[#45475a] text-xs">{preview.title}</span>
          </div>
          <pre className="px-3 py-3 text-[10px] font-mono text-[#a6adc8] whitespace-pre-wrap leading-relaxed overflow-x-auto">
            {preview.body}
          </pre>
        </div>
      )}
    </div>
  );
}
