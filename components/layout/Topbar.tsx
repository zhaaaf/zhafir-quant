"use client";
import { Activity } from "lucide-react";

export default function Topbar({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="h-14 border-b border-[#2a2a3e] flex items-center px-6 gap-3 bg-[#0a0a0f]/80 backdrop-blur sticky top-0 z-30">
      <Activity size={14} className="text-[#7aa2f7]" />
      <div>
        <span className="text-[#cdd6f4] font-semibold text-sm">{title}</span>
        {subtitle && <span className="text-[#6c7086] text-xs ml-2 font-mono">{subtitle}</span>}
      </div>
    </header>
  );
}
