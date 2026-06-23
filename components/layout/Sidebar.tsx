"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart2, Search, TrendingUp, FlaskConical, BookOpen, Bell } from "lucide-react";

const nav = [
  { href: "/",          icon: BarChart2,    label: "Dashboard"  },
  { href: "/screener",  icon: Search,       label: "Screener"   },
  { href: "/optimizer", icon: TrendingUp,   label: "Optimizer"  },
  { href: "/schedule",  icon: Bell,         label: "Schedule"   },
  { href: "/models",    icon: FlaskConical, label: "Models"     },
  { href: "/research",  icon: BookOpen,     label: "Research"   },
];

export default function Sidebar() {
  const path = usePathname();
  return (
    <aside className="fixed left-0 top-0 h-full w-56 bg-[#11111b] border-r border-[#2a2a3e] flex flex-col z-40">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-[#2a2a3e]">
        <div className="text-[#7aa2f7] font-mono text-xs tracking-widest uppercase mb-0.5">Zhafir&apos;s</div>
        <div className="text-[#cdd6f4] font-bold text-sm leading-tight">Quant Investing</div>
        <div className="text-[#6c7086] text-xs font-mono mt-0.5">v1.0 · research</div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-0.5">
        {nav.map(({ href, icon: Icon, label }) => {
          const active = path === href || (href !== "/" && path.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={[
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                active
                  ? "bg-[#1e2035] text-[#7aa2f7] border border-[#3d59a1]/40"
                  : "text-[#6c7086] hover:text-[#cdd6f4] hover:bg-[#1a1a2e]",
              ].join(" ")}
            >
              <Icon size={15} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-[#2a2a3e]">
        <div className="text-[#6c7086] text-xs font-mono">Math Models · Research</div>
        <div className="text-[#313244] text-xs mt-0.5">Universitas Padjadjaran</div>
      </div>
    </aside>
  );
}
