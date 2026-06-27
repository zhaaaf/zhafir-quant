"use client";
import { useState, useEffect } from "react";
import { Bell, Send, Loader2, CheckCircle, XCircle, Play, ChevronDown, Shield, StopCircle } from "lucide-react";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const UNIVERSES = ["IDX LQ45", "IDX Kompas100", "S&P 500 Top 50", "Nasdaq 100"];
const SCHEMAS = [
  { value: "day",      label: "⚡ Day",      color: "#f7768e", hold: "<1 hari"  },
  { value: "swing",   label: "📈 Swing",   color: "#e0af68", hold: "2-14 hr"  },
  { value: "position", label: "📊 Position", color: "#7dcfff", hold: "mgg-bln"  },
  { value: "long",    label: "🌱 Long",    color: "#9ece6a", hold: "3+ bln"   },
];
const PERIODS = ["1mo","3mo","6mo","1y","2y","3y"];

interface Config {
  ntfy_topic:           string;
  notifications_enabled: boolean;
  telegram_bot_token:   string;
  telegram_chat_id:     string;
  telegram_enabled:     boolean;
  universe:             string;
  top_n:                number;
  schema:               string;
  model:                string;
  period:               string;
  use_watchlist:        boolean;
  watchlist:            string[];
}

const DEFAULT: Config = {
  ntfy_topic: "", notifications_enabled: false,
  telegram_bot_token: "", telegram_chat_id: "", telegram_enabled: false,
  universe: "IDX LQ45", top_n: 8, schema: "swing", model: "markowitz",
  period: "1y", use_watchlist: false, watchlist: [],
};

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

export default function NotificationForm() {
  const [cfg, setCfg]         = useState<Config>(DEFAULT);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [testing, setTesting] = useState(false);
  const [running, setRunning] = useState(false);
  const [killing, setKilling] = useState(false);
  const [testRes, setTestRes] = useState<{ ok: boolean; msg: string } | null>(null);
  const [preview, setPreview] = useState<{ title: string; body: string } | null>(null);

  useEffect(() => {
    fetch(`${BASE}/api/schedule/config`)
      .then(r => r.json())
      .then(d => setCfg({ ...DEFAULT, ...d }))
      .catch(() => {});
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

  // TDS Bab 3 — Kill-Switch
  const killSwitch = async () => {
    if (!confirm("⚠️ Kill-Switch akan menonaktifkan semua notifikasi dan membersihkan watchlist. Lanjutkan?")) return;
    setKilling(true);
    try {
      const r = await fetch(`${BASE}/api/control/kill-switch`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope: "ALL", reason: "Manual trigger from UI" }),
      });
      const d = await r.json();
      setTestRes({ ok: true, msg: `Kill-Switch: ${d.status} — ${d.actions?.join(", ")}` });
      setCfg(p => ({ ...p, notifications_enabled: false, watchlist: [] }));
    } catch { setTestRes({ ok: false, msg: "Kill-Switch error" }); }
    finally { setKilling(false); }
  };

  return (
    <div className="space-y-4">

      {/* ── KILL-SWITCH (TDS Bab 3) ─────────────────────────────── */}
      <div className="border border-[#f7768e]/30 rounded-xl p-4 bg-[#f7768e]/5">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Shield size={14} className="text-[#f7768e]" />
              <span className="text-[#f7768e] font-semibold text-sm">Kill-Switch Darurat</span>
            </div>
            <div className="text-[#6c7086] text-xs">TDS Bab 3 — hentikan semua aktivitas platform seketika</div>
          </div>
          <button onClick={killSwitch} disabled={killing}
            className="flex items-center gap-2 px-4 py-2 bg-[#f7768e]/10 hover:bg-[#f7768e]/20 border border-[#f7768e]/40 text-[#f7768e] rounded-lg text-sm font-bold transition-colors disabled:opacity-40">
            {killing ? <Loader2 size={13} className="animate-spin" /> : <StopCircle size={13} />}
            STOP ALL
          </button>
        </div>
      </div>

      {/* ── ntfy.sh ─────────────────────────────────────────────── */}
      <Section title="📱 ntfy.sh — Push Notification">
        <div className="bg-[#0a0a0f] border border-[#1e1e2e] rounded-lg p-3 text-xs text-[#6c7086] space-y-1">
          <div className="text-[#7aa2f7] font-mono font-semibold mb-1">Setup (1 menit):</div>
          <div>1. Install app <span className="text-[#cdd6f4] font-mono">ntfy</span> di HP (Android / iOS — gratis)</div>
          <div>2. Tap <span className="font-mono text-[#cdd6f4]">+</span> → ketik nama topic unik (contoh: zhafir-quant-2025)</div>
          <div>3. Masukkan nama yang sama di bawah → Simpan → Test</div>
        </div>
        <label className="flex flex-col gap-1">
          <span className="text-[#6c7086] text-xs font-mono">ntfy Topic</span>
          <input className="bg-[#0a0a0f] border border-[#2a2a3e] text-[#cdd6f4] text-sm px-3 py-2 rounded-lg placeholder:text-[#45475a] outline-none focus:border-[#7aa2f7]/50"
            placeholder="contoh: zhafir-quant-2025" value={cfg.ntfy_topic}
            onChange={e => set("ntfy_topic")(e.target.value)} />
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={cfg.notifications_enabled}
            onChange={e => set("notifications_enabled")(e.target.checked)} className="accent-[#7aa2f7]" />
          <span className="text-[#a6adc8] text-sm">Aktifkan notifikasi 08:45 & 15:45 WIB</span>
        </label>
      </Section>

      {/* ── Telegram (TDS Bab 3) ─────────────────────────────────── */}
      <Section title="✈️ Telegram Bot (TDS Bab 3)" defaultOpen={false}>
        <div className="bg-[#0a0a0f] border border-[#1e1e2e] rounded-lg p-3 text-xs text-[#6c7086] space-y-1">
          <div className="text-[#7aa2f7] font-mono font-semibold mb-1">Setup Telegram Bot:</div>
          <div>1. Buka <span className="text-[#cdd6f4] font-mono">@BotFather</span> di Telegram → /newbot</div>
          <div>2. Simpan <span className="text-[#cdd6f4] font-mono">Bot Token</span> yang diberikan</div>
          <div>3. Kirim pesan ke bot → buka <span className="text-[#cdd6f4] font-mono">api.telegram.org/bot{"{TOKEN}"}/getUpdates</span></div>
          <div>4. Salin <span className="text-[#cdd6f4] font-mono">chat.id</span> dari response JSON</div>
        </div>
        <label className="flex flex-col gap-1">
          <span className="text-[#6c7086] text-xs font-mono">Bot Token</span>
          <input type="password" className="bg-[#0a0a0f] border border-[#2a2a3e] text-[#cdd6f4] text-sm px-3 py-2 rounded-lg placeholder:text-[#45475a] outline-none focus:border-[#7aa2f7]/50"
            placeholder="123456789:AABBcc..." value={cfg.telegram_bot_token}
            onChange={e => set("telegram_bot_token")(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[#6c7086] text-xs font-mono">Chat ID</span>
          <input className="bg-[#0a0a0f] border border-[#2a2a3e] text-[#cdd6f4] text-sm px-3 py-2 rounded-lg placeholder:text-[#45475a] outline-none focus:border-[#7aa2f7]/50"
            placeholder="contoh: 1234567890" value={cfg.telegram_chat_id}
            onChange={e => set("telegram_chat_id")(e.target.value)} />
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={cfg.telegram_enabled}
            onChange={e => set("telegram_enabled")(e.target.checked)} className="accent-[#7aa2f7]" />
          <span className="text-[#a6adc8] text-sm">Aktifkan notifikasi via Telegram</span>
        </label>
        <div className="text-[#45475a] text-xs">ntfy.sh dan Telegram dapat aktif bersamaan.</div>
      </Section>

      {/* ── Auto Pipeline Config ─────────────────────────────────── */}
      <Section title="⚙️ Auto Pipeline Config">
        <div className="text-[#45475a] text-xs">Otomatis: Screen → Score → Optimize 5 Model → Push notif. Tidak perlu buka web.</div>

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

        {/* Schema — 4 styles including Position (TDS Bab 8) */}
        <div>
          <label className="text-[#6c7086] text-xs font-mono uppercase tracking-wider block mb-1.5">Skema Investor</label>
          <div className="grid grid-cols-2 gap-1.5">
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

        {/* Period */}
        <div>
          <label className="text-[#6c7086] text-xs font-mono uppercase tracking-wider block mb-1.5">Periode Data</label>
          <div className="flex flex-wrap gap-1.5">
            {PERIODS.map(p => (
              <button key={p} onClick={() => set("period")(p)}
                className={["px-3 py-1 rounded text-xs font-mono border transition-colors",
                  cfg.period === p ? "bg-[#1e2035] text-[#7aa2f7] border-[#3d59a1]/40" : "text-[#6c7086] border-[#2a2a3e]"].join(" ")}>
                {p}
              </button>
            ))}
          </div>
        </div>
      </Section>

      {/* ── Actions ──────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <button onClick={save} disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#7aa2f7] text-[#0a0a0f] rounded-lg font-bold text-sm disabled:opacity-40 hover:bg-[#7aa2f7]/90">
            {saving ? <Loader2 size={13} className="animate-spin" /> : saved ? <CheckCircle size={13} /> : <Bell size={13} />}
            {saved ? "Tersimpan!" : "Simpan Konfigurasi"}
          </button>
          <button onClick={test} disabled={testing || (!cfg.ntfy_topic && !cfg.telegram_chat_id)}
            className="px-4 py-2.5 bg-[#1e2035] border border-[#3d59a1]/40 text-[#7aa2f7] rounded-lg text-sm disabled:opacity-40 hover:bg-[#252545]">
            {testing ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => runNow("morning")} disabled={running}
            className="py-2 bg-[#9ece6a]/10 border border-[#9ece6a]/30 text-[#9ece6a] rounded-lg text-xs font-semibold disabled:opacity-40 hover:bg-[#9ece6a]/20">
            {running ? <Loader2 size={11} className="animate-spin inline" /> : "🌅"} Run Morning
          </button>
          <button onClick={() => runNow("closing")} disabled={running}
            className="py-2 bg-[#7aa2f7]/10 border border-[#7aa2f7]/30 text-[#7aa2f7] rounded-lg text-xs font-semibold disabled:opacity-40 hover:bg-[#7aa2f7]/20">
            {running ? <Loader2 size={11} className="animate-spin inline" /> : "🌆"} Run Closing
          </button>
        </div>
      </div>

      {testRes && (
        <div className={`flex items-center gap-2 p-3 rounded-lg text-sm border ${
          testRes.ok ? "bg-[#9ece6a]/10 border-[#9ece6a]/30 text-[#9ece6a]"
                     : "bg-[#f7768e]/10 border-[#f7768e]/30 text-[#f7768e]"}`}>
          {testRes.ok ? <CheckCircle size={14} /> : <XCircle size={14} />}
          {testRes.msg}
        </div>
      )}

      {preview && (
        <div className="bg-[#0a0a0f] border border-[#2a2a3e] rounded-xl p-4 space-y-2">
          <div className="text-[#7aa2f7] font-semibold text-xs font-mono">{preview.title}</div>
          <pre className="text-[#6c7086] text-xs font-mono whitespace-pre-wrap leading-relaxed">{preview.body}</pre>
        </div>
      )}
    </div>
  );
}
