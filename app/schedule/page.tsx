import Topbar from "@/components/layout/Topbar";
import NotificationForm from "@/components/schedule/NotificationForm";
import { Clock, Smartphone } from "lucide-react";

const SCHEDULE = [
  { time: "08:45 WIB", label: "Morning Signal", desc: "15 menit sebelum IDX buka (09:00 WIB). Signal buy/hold untuk hari ini.", icon: "🌅" },
  { time: "15:45 WIB", label: "Closing Signal", desc: "15 menit sebelum IDX tutup (16:00 WIB). Signal exit atau hold malam.", icon: "🌆" },
];

export default function SchedulePage() {
  return (
    <div className="min-h-screen">
      <Topbar title="Notification Schedule" subtitle="08:45 & 15:45 WIB" />

      <div className="p-6 grid grid-cols-[1fr_340px] gap-6 max-w-5xl">
        {/* Left: form */}
        <NotificationForm />

        {/* Right: info */}
        <div className="space-y-5">
          {/* Schedule info */}
          <div className="bg-[#11111b] border border-[#2a2a3e] rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Clock size={14} className="text-[#7aa2f7]" />
              <span className="text-[#cdd6f4] font-semibold text-sm">Jadwal Notifikasi</span>
            </div>
            <div className="space-y-3">
              {SCHEDULE.map(s => (
                <div key={s.time} className="flex gap-3 p-3 bg-[#0a0a0f] border border-[#1e1e2e] rounded-lg">
                  <span className="text-xl">{s.icon}</span>
                  <div>
                    <div className="text-[#7aa2f7] font-mono font-bold text-sm">{s.time}</div>
                    <div className="text-[#cdd6f4] text-xs font-semibold">{s.label}</div>
                    <div className="text-[#6c7086] text-xs mt-0.5">{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ntfy info */}
          <div className="bg-[#11111b] border border-[#2a2a3e] rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Smartphone size={14} className="text-[#7aa2f7]" />
              <span className="text-[#cdd6f4] font-semibold text-sm">Tentang ntfy.sh</span>
            </div>
            <div className="space-y-2 text-xs text-[#6c7086]">
              <div>✓ Gratis, open source, no account</div>
              <div>✓ Android (Play Store) & iOS (App Store)</div>
              <div>✓ Notif muncul meski app di-background</div>
              <div>✓ Tidak perlu port forward — backend kirim HTTPS</div>
              <div className="text-[#45475a] pt-1">
                Agar notif jalan dari mana saja (bukan hanya lokal), deploy backend ke Railway — app otomatis jalan 24/7.
              </div>
            </div>
          </div>

          {/* Signal legend */}
          <div className="bg-[#11111b] border border-[#2a2a3e] rounded-xl p-5">
            <div className="text-[#6c7086] font-mono text-xs uppercase tracking-wider mb-3">Legenda Signal</div>
            <div className="space-y-2 text-xs">
              {[
                { signal: "BUY",   color: "#9ece6a", desc: "Kondisi entry optimal berdasarkan skema" },
                { signal: "HOLD",  color: "#e0af68", desc: "Pertahankan posisi, tidak ada aksi" },
                { signal: "WATCH", color: "#7dcfff", desc: "Potensi entry, tunggu konfirmasi" },
                { signal: "SELL",  color: "#f7768e", desc: "Signal exit / cut loss" },
              ].map(({ signal, color, desc }) => (
                <div key={signal} className="flex items-center gap-2">
                  <span className="font-mono font-bold w-10" style={{ color }}>{signal}</span>
                  <span className="text-[#6c7086]">{desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
