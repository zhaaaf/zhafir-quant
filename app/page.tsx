import Topbar from "@/components/layout/Topbar";
import Link from "next/link";
import { Search, TrendingUp, FlaskConical, BookOpen, ArrowRight } from "lucide-react";

const models = [
  { name: "Markowitz MVO", color: "#7aa2f7", desc: "AIMMS Mean-Variance Optimization", doi: "10.2307/2975974" },
  { name: "CVaR",          color: "#9ece6a", desc: "Conditional Value-at-Risk (Rockafellar & Uryasev)", doi: "10.21314/JOR.2000.038" },
  { name: "RMT Cleaned",   color: "#7dcfff", desc: "Random Matrix Theory denoising (Marchenko-Pastur)", doi: "10.1103/PhysRevLett.83.1467" },
  { name: "Quantum",       color: "#bb9af7", desc: "QUBO + Simulated Quantum Annealing", doi: "10.1103/PhysRevResearch.4.013006" },
  { name: "Max Entropy",   color: "#e0af68", desc: "Statistical mechanics: maximum diversification", doi: "10.1109/TIT.1980.1056144" },
];

const quickStart = [
  { icon: Search,       label: "1. Screener",  desc: "Search any global stock or ETF",     href: "/screener" },
  { icon: TrendingUp,   label: "2. Optimizer", desc: "Run mathematical optimization model", href: "/optimizer" },
  { icon: FlaskConical, label: "3. Models",    desc: "Inspect model equations & sources",   href: "/models" },
  { icon: BookOpen,     label: "4. Research",  desc: "Academic bibliography & methodology", href: "/research" },
];

export default function DashboardPage() {
  return (
    <div className="min-h-screen">
      <Topbar title="Dashboard" subtitle="Zhafir's Quant Investing" />

      <div className="p-6 max-w-5xl">
        {/* Hero */}
        <div className="mb-8 border border-[#2a2a3e] rounded-xl bg-[#11111b] p-6">
          <div className="text-[#7aa2f7] font-mono text-xs uppercase tracking-widest mb-1">Portfolio Science</div>
          <h1 className="text-2xl font-bold text-[#cdd6f4] mb-2">Zhafir&apos;s Quant Investing</h1>
          <p className="text-[#6c7086] text-sm leading-relaxed max-w-xl">
            Apply rigorous mathematical models to portfolio selection and optimization.
            From classical Markowitz to physics-inspired quantum annealing — all backed by peer-reviewed research.
          </p>
          <div className="flex gap-3 mt-5">
            <Link href="/screener" className="flex items-center gap-2 px-4 py-2 bg-[#7aa2f7] text-[#0a0a0f] rounded-lg font-semibold text-sm hover:bg-[#7aa2f7]/90 transition-colors">
              Start Screening <ArrowRight size={14} />
            </Link>
            <Link href="/optimizer" className="flex items-center gap-2 px-4 py-2 border border-[#2a2a3e] text-[#a6adc8] rounded-lg text-sm hover:border-[#7aa2f7]/40 hover:text-[#cdd6f4] transition-colors">
              Optimize Portfolio
            </Link>
          </div>
        </div>

        {/* Quick Start */}
        <div className="mb-8">
          <div className="text-[#6c7086] font-mono text-xs uppercase tracking-wider mb-3">Workflow</div>
          <div className="grid grid-cols-2 gap-3">
            {quickStart.map(({ icon: Icon, label, desc, href }) => (
              <Link key={href} href={href}
                className="flex items-start gap-3 p-4 bg-[#11111b] border border-[#2a2a3e] rounded-lg hover:border-[#7aa2f7]/30 hover:bg-[#1a1a2e] transition-all group">
                <div className="p-2 bg-[#1a1a2e] rounded-lg group-hover:bg-[#1e2035] transition-colors shrink-0">
                  <Icon size={14} className="text-[#7aa2f7]" />
                </div>
                <div>
                  <div className="text-[#cdd6f4] text-sm font-semibold">{label}</div>
                  <div className="text-[#6c7086] text-xs mt-0.5">{desc}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Models */}
        <div>
          <div className="text-[#6c7086] font-mono text-xs uppercase tracking-wider mb-3">Implemented Models</div>
          <div className="space-y-2">
            {models.map(m => (
              <div key={m.name} className="flex items-start gap-3 p-3 bg-[#11111b] border border-[#2a2a3e] rounded-lg">
                <span className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0" style={{ background: m.color }} />
                <div className="flex-1">
                  <span className="font-mono text-sm" style={{ color: m.color }}>{m.name}</span>
                  <span className="text-[#6c7086] text-xs ml-2">{m.desc}</span>
                </div>
                <a
                  href={`https://doi.org/${m.doi}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#45475a] hover:text-[#7aa2f7] font-mono text-xs transition-colors shrink-0"
                >
                  DOI ↗
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
