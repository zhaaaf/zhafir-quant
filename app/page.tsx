"use client";
import { useState, useEffect } from "react";
import Topbar from "@/components/layout/Topbar";
import SchemaPicker from "@/components/schema/SchemaPicker";
import { getStoredSchema, SCHEMAS, type Schema } from "@/lib/schema";
import Link from "next/link";

const FLOW = [
  { step: "1", label: "Pilih Profil",  sub: "Di sini — pilih schema investor",  href: "/"          },
  { step: "2", label: "Screener",      sub: "Filter saham sesuai profil",         href: "/screener"  },
  { step: "3", label: "Optimizer",     sub: "Bandingkan 5 model, ambil terbaik",  href: "/optimizer" },
  { step: "4", label: "Schedule",      sub: "Notif otomatis 08:45 & 15:45 WIB",  href: "/schedule"  },
];

export default function DashboardPage() {
  const [schema, setSchema] = useState<Schema>("swing");

  useEffect(() => { setSchema(getStoredSchema()); }, []);

  const sc = SCHEMAS[schema];

  return (
    <div className="min-h-screen">
      <Topbar title="Dashboard" subtitle="Zhafir's Quant Investing" />

      <div className="p-4 md:p-6 max-w-4xl space-y-6">

        {/* Hero */}
        <div className="border border-[#2a2a3e] rounded-xl bg-[#11111b] p-5">
          <div className="text-[#7aa2f7] font-mono text-xs uppercase tracking-widest mb-1">
            Quant Investing Platform
          </div>
          <h1 className="text-xl font-bold text-[#cdd6f4] mb-1">
            Zhafir&apos;s Quant Investing
          </h1>
          <p className="text-[#6c7086] text-sm">
            5 model matematis berjalan paralel — data menentukan model terbaik untuk profil kamu.
          </p>
        </div>

        {/* STEP 1: Schema picker — primary action */}
        <div className="border border-[#2a2a3e] rounded-xl bg-[#11111b] p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-6 rounded-full bg-[#7aa2f7] text-[#0a0a0f] text-xs font-black flex items-center justify-center shrink-0">1</span>
            <span className="text-[#cdd6f4] font-semibold text-sm">Pilih Profil Investor</span>
            <span className="text-[#45475a] text-xs ml-1">— tersimpan otomatis, berlaku untuk semua halaman</span>
          </div>
          <SchemaPicker current={schema} onChange={setSchema} showCTA={true} />
        </div>

        {/* Flow overview */}
        <div>
          <div className="text-[#6c7086] font-mono text-xs uppercase tracking-wider mb-3">Alur Penggunaan</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {FLOW.map(f => (
              <Link key={f.step} href={f.href}
                className="p-3 bg-[#11111b] border border-[#2a2a3e] rounded-lg hover:border-[#313244] hover:bg-[#1a1a2e] transition-all group">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center shrink-0"
                    style={{ background: sc.color + "22", color: sc.color }}>
                    {f.step}
                  </span>
                  <span className="text-[#cdd6f4] text-xs font-semibold">{f.label}</span>
                </div>
                <div className="text-[#45475a] text-[10px] leading-relaxed">{f.sub}</div>
              </Link>
            ))}
          </div>
        </div>

        {/* Active schema summary */}
        <div className="border rounded-xl p-4 text-xs"
          style={{ borderColor: sc.color + "33", background: sc.color + "08" }}>
          <div className="font-mono text-[10px] uppercase tracking-wider mb-2"
            style={{ color: sc.color }}>
            Profil Aktif: {sc.icon} {sc.label}
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[#6c7086]">
            <div>Model default: <span className="text-[#cdd6f4] font-mono">{sc.defaultModel.toUpperCase()}</span></div>
            <div>Periode: <span className="text-[#cdd6f4] font-mono">{sc.defaultPeriod}</span></div>
            <div>Hold: <span className="text-[#cdd6f4]">{sc.holdPeriod}</span></div>
            <div>Notif: <span className="text-[#cdd6f4]">{sc.notifCadence}</span></div>
          </div>
          <div className="mt-2 text-[#45475a]">{sc.objective}</div>
        </div>

      </div>
    </div>
  );
}
