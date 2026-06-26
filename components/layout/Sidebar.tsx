"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart2, Search, TrendingUp, FlaskConical, BookOpen, Bell, Zap } from "lucide-react";

const nav = [
  { href: "/",          icon: BarChart2,    label: "Dashboard"  },
  { href: "/screener",  icon: Search,       label: "Screener"   },
  { href: "/optimizer", icon: TrendingUp,   label: "Optimizer"  },
  { href: "/scenario",  icon: Zap,          label: "Day Trade"  },
  { href: "/schedule",  icon: Bell,         label: "Schedule"   },
  { href: "/models",    icon: FlaskConical, label: "Models"     },
  { href: "/research",  icon: BookOpen,     label: "Research"   },
];

export default function Sidebar() {
  const path = usePathname();

  const isActive = (href: string) =>
    path === href || (href !== "/" && path.startsWith(href));

  return (
    <>
      {/* ── Desktop sidebar (md+) ── */}
      <aside className="hidden md:flex fixed left-0 top-0 h-full w-56 bg-[#11111b] border-r border-[#2a2a3e] flex-col z-40">
        {/* Logo */}
        <div className="px-4 py-5 border-b border-[#2a2a3e]">
          <div className="text-[#7aa2f7] font-mono text-xs tracking-widest uppercase mb-0.5">Zhafir&apos;s</div>
          <div className="text-[#cdd6f4] font-bold text-sm leading-tight">Quant Investing</div>
          <div className="text-[#6c7086] text-xs font-mono mt-0.5">v2.0 · research</div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-4 space-y-0.5">
          {nav.map(({ href, icon: Icon, label }) => (
            <Link
              key={href}
              href={href}
              className={[
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                isActive(href)
                  ? "bg-[#1e2035] text-[#7aa2f7] border border-[#3d59a1]/40"
                  : "text-[#6c7086] hover:text-[#cdd6f4] hover:bg-[#1a1a2e]",
              ].join(" ")}
            >
              <Icon size={15} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-[#2a2a3e]">
          <div className="text-[#6c7086] text-xs font-mono">Math Models · Research</div>
          <div className="text-[#313244] text-xs mt-0.5">Universitas Padjadjaran</div>
        </div>
      </aside>

      {/* ── Mobile bottom nav (< md) ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#11111b] border-t border-[#2a2a3e] flex items-center justify-around px-1 py-1.5 safe-bottom">
        {nav.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className={[
              "flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-colors min-w-0 flex-1",
              isActive(href)
                ? "text-[#7aa2f7]"
                : "text-[#45475a]",
            ].join(" ")}
          >
            <Icon size={18} />
            <span className="text-[9px] font-mono leading-none truncate">{label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
