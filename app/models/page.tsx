import Topbar from "@/components/layout/Topbar";

const models = [
  {
    id: "markowitz",
    name: "Markowitz Mean-Variance Optimization",
    color: "#7aa2f7",
    field: "Operations Research / Finance",
    ref: "Markowitz, H. (1952). Portfolio Selection. Journal of Finance, 7(1), 77–91.",
    doi: "10.2307/2975974",
    formulation: [
      "Primal Problem (AIMMS formulation):",
      "  min    wᵀ Σ w",
      "  s.t.   wᵀ μ ≥ r_target",
      "         Σᵢ wᵢ = 1",
      "         wᵢ ≥ 0  (long-only)",
      "",
      "Tangency Portfolio (Max Sharpe):",
      "  max    (wᵀμ − rf) / √(wᵀΣw)",
      "",
      "Efficient Frontier: parametric sweep over r_target",
    ],
    notes: "Solved via SLSQP (Sequential Least Squares Programming). Covariance matrix Σ is annualized from log-returns.",
  },
  {
    id: "cvar",
    name: "CVaR / Expected Shortfall Optimization",
    color: "#9ece6a",
    field: "Risk Management / Operations Research",
    ref: "Rockafellar, R.T. & Uryasev, S. (2000). Optimization of Conditional Value-at-Risk. Journal of Risk, 2(3), 21–41.",
    doi: "10.21314/JOR.2000.038",
    formulation: [
      "CVaR at level α (Expected Shortfall):",
      "  CVaRα(L) = E[L | L ≥ VaRα(L)]",
      "",
      "Rockafellar-Uryasev Linearization:",
      "  min   ζ + 1/((1−α)T) Σₜ zₜ",
      "  s.t.  zₜ ≥ −rₜᵀw − ζ   ∀t",
      "        zₜ ≥ 0",
      "        Σᵢ wᵢ = 1, wᵢ ≥ 0",
      "",
      "Variables: w (weights), ζ (VaR estimate), z (auxiliary)",
    ],
    notes: "Solved via HiGHS linear programming solver. α = 0.95 means CVaR is the expected loss in the worst 5% of scenarios.",
  },
  {
    id: "rmt",
    name: "Random Matrix Theory — Covariance Denoising",
    color: "#7dcfff",
    field: "Statistical Physics / Econophysics",
    ref: "Laloux, L., Cizeau, P., Bouchaud, J.P., & Potters, M. (1999). Noise Dressing of Financial Correlation Matrices. Physical Review Letters, 83(7), 1467–1470.",
    doi: "10.1103/PhysRevLett.83.1467",
    formulation: [
      "Marchenko-Pastur bulk bounds (q = T/N):",
      "  λ± = σ²(1 ± 1/√q)²",
      "",
      "Denoising algorithm:",
      "  1. Compute empirical correlation C from returns",
      "  2. Eigendecompose: C = V Λ Vᵀ",
      "  3. Replace λᵢ ≤ λ+ with mean of noise eigenvalues",
      "  4. Reconstruct: C_clean = V Λ_clean Vᵀ",
      "  5. Convert back to covariance: Σ_clean",
      "",
      "Then run Markowitz MVO on Σ_clean",
    ],
    notes: "Physics insight: eigenvalues within [λ−, λ+] are indistinguishable from a random (Wishart) matrix — pure noise. Only eigenvalues above λ+ carry genuine market information (signal).",
  },
  {
    id: "quantum",
    name: "Quantum-Inspired Optimization (QUBO + SQA)",
    color: "#bb9af7",
    field: "Quantum Physics / Combinatorial Optimization",
    ref: "Mugel, S., et al. (2022). Dynamic portfolio optimization with real datasets using quantum processors and quantum-inspired tensor networks. Physical Review Research, 4(1), 013006.",
    doi: "10.1103/PhysRevResearch.4.013006",
    formulation: [
      "QUBO Hamiltonian (binary variables xᵢ ∈ {0,1}):",
      "  H = −μᵀx + λ_r xᵀΣx + λ_b(Σᵢxᵢ − B)²",
      "",
      "Suzuki-Trotter expansion (P replicas):",
      "  H_eff = H_cl ⊗ I + J_⊥ Σⱼ σʲzσʲ⁺¹z",
      "  J_⊥ = −(T/2)ln(tanh(Γ/PT))",
      "",
      "Simulated Quantum Annealing schedule:",
      "  Γ(t) = Γ₀(1 − t/t_max)   [transverse field → 0]",
      "  T(t) = T₀(T_f/T₀)^(t/t_max)  [classical temp]",
    ],
    notes: "The transverse field Γ enables quantum tunneling through energy barriers early in annealing. As Γ→0, the system collapses to classical SA. P=20 replicas, 2000 steps.",
  },
  {
    id: "entropy",
    name: "Maximum Entropy Portfolio",
    color: "#e0af68",
    field: "Statistical Mechanics / Information Theory",
    ref: "Shore, J.E. & Johnson, R.W. (1980). Axiomatic derivation of the principle of maximum entropy and the principle of minimum cross-entropy. IEEE Transactions on Information Theory, 26(1), 26–37.",
    doi: "10.1109/TIT.1980.1056144",
    formulation: [
      "Shannon entropy of portfolio weights:",
      "  H(w) = −Σᵢ wᵢ ln(wᵢ)",
      "",
      "Optimization problem:",
      "  max   H(w) = −Σᵢ wᵢ ln(wᵢ)",
      "  s.t.  Σᵢ wᵢ = 1",
      "         wᵢ ≥ 0",
      "         wᵀμ ≥ r_min  (optional)",
      "         wᵀΣw ≤ σ²_max  (optional)",
      "",
      "Effective N = e^H(w)  [diversification measure]",
    ],
    notes: "Physics analogy: thermodynamic equilibrium maximizes entropy subject to energy constraints. Unconstrained solution → uniform 1/N. Effective N → N means perfect diversification.",
  },
];

const backtestModels = [
  {
    id: "sharpe", name: "Sharpe Ratio", color: "#7aa2f7",
    ref: "Sharpe, W.F. (1966). Mutual Fund Performance. Journal of Business, 39(1).",
    doi: "10.1086/294846",
    formulation: ["SR = (√N · E[Rp − Rf]) / σp", "", "N = 252 (trading days/year)", "Rf = risk-free rate (daily)", "σp = std dev of excess returns"],
    notes: "Standard risk-adjusted return metric. SR ≥ 1 = acceptable; SR ≥ 2 = excellent.",
  },
  {
    id: "sortino", name: "Sortino Ratio", color: "#9ece6a",
    ref: "Sortino, F. & Price, L. (1994). Journal of Investing, 3(3), 59–64.",
    doi: "10.3905/joi.3.3.59",
    formulation: ["SND = (√N · E[Rp − Rf]) / σd", "", "σd = √( mean(min(0, Rp−Rf)²) )", "← only downside returns penalised", "Upside volatility is NOT risk"],
    notes: "Preferred over Sharpe for personal traders. Upward fluctuations are gains, not risk. Sortino > Sharpe when strategy has positive skew.",
  },
  {
    id: "calmar", name: "Calmar Ratio", color: "#e0af68",
    ref: "Calmar, T. (1991). The Calmar Ratio: A Smoother Tool. Futures Magazine.",
    doi: "",
    formulation: ["Calmar = Ann. Return / Max Drawdown", "", "Max Drawdown = max(Peak − Trough) / Peak", "  = max₁≤t₁≤t₂≤T [(V(t₁)−V(t₂)) / V(t₁)]"],
    notes: "Measures return per unit of worst-case historical loss. Preferred by CTAs (Commodity Trading Advisors). Calmar > 0.5 = acceptable.",
  },
  {
    id: "kelly", name: "Kelly Criterion", color: "#bb9af7",
    ref: "Kelly, J.L. (1956). Bell System Technical Journal, 35(4), 917–926.",
    doi: "10.1002/j.1538-7305.1956.tb03809.x",
    formulation: ["f* = (b·p − q) / b", "", "b = avg_gain / avg_loss  (gain-to-loss ratio)", "p = P(winning trade)  (historical win rate)", "q = 1 − p  (loss probability)", "", "Half-Kelly (TDS Bab 2): f_half = f* / 2"],
    notes: "Maximizes logarithmic wealth growth. TDS Bab 2 uses Half-Kelly by default (scale=0.5) for conservative risk management. Full Kelly can cause ruin via volatility drag.",
  },
];

export default function ModelsPage() {
  return (
    <div className="min-h-screen">
      <Topbar title="Mathematical Models" subtitle="equations & references" />
      <div className="p-4 md:p-6 max-w-4xl space-y-6">

        {/* Section: Backtesting / Performance Metrics (TDS Bab 6) */}
        <div>
          <div className="text-[#e0af68] font-mono text-xs uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="flex-1 border-t border-[#2a2a3e]" />
            Backtesting & Performance Metrics — TDS Bab 6
            <span className="flex-1 border-t border-[#2a2a3e]" />
          </div>
          <div className="space-y-3">
            {backtestModels.map(m => (
              <div key={m.id} className="bg-[#11111b] border border-[#2a2a3e] rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-[#2a2a3e]" style={{ borderLeftWidth: 3, borderLeftColor: m.color }}>
                  <h2 className="font-bold text-sm" style={{ color: m.color }}>{m.name}</h2>
                </div>
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <pre className="bg-[#0a0a0f] border border-[#1e1e2e] rounded-lg p-3 text-xs font-mono text-[#a6adc8] leading-relaxed overflow-x-auto whitespace-pre">
                    {m.formulation.join("\n")}
                  </pre>
                  <div className="space-y-3">
                    <div className="text-[#6c7086] text-xs">{m.notes}</div>
                    <div className="text-[#a6adc8] text-xs">{m.ref}</div>
                    {m.doi && (
                      <a href={`https://doi.org/${m.doi}`} target="_blank" rel="noopener noreferrer"
                        className="text-[#45475a] hover:text-[#7aa2f7] font-mono text-xs transition-colors block">
                        DOI: {m.doi} ↗
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-[#7aa2f7] font-mono text-xs uppercase tracking-wider mb-3 flex items-center gap-2">
          <span className="flex-1 border-t border-[#2a2a3e]" />
          Portfolio Optimization Models
          <span className="flex-1 border-t border-[#2a2a3e]" />
        </div>
        {models.map(m => (
          <div key={m.id} className="bg-[#11111b] border border-[#2a2a3e] rounded-xl overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-[#2a2a3e]" style={{ borderLeftWidth: 3, borderLeftColor: m.color }}>
              <div className="text-[#6c7086] font-mono text-xs uppercase tracking-wider mb-0.5">{m.field}</div>
              <h2 className="font-bold text-[#cdd6f4]" style={{ color: m.color }}>{m.name}</h2>
            </div>

            <div className="p-4 md:p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Formulation */}
              <div>
                <div className="text-[#6c7086] font-mono text-xs uppercase tracking-wider mb-2">Formulation</div>
                <pre className="bg-[#0a0a0f] border border-[#1e1e2e] rounded-lg p-3 text-xs font-mono text-[#a6adc8] leading-relaxed overflow-x-auto whitespace-pre">
                  {m.formulation.join("\n")}
                </pre>
              </div>

              {/* Reference & notes */}
              <div className="space-y-4">
                <div>
                  <div className="text-[#6c7086] font-mono text-xs uppercase tracking-wider mb-2">Reference</div>
                  <div className="text-[#a6adc8] text-xs leading-relaxed">{m.ref}</div>
                  <a
                    href={`https://doi.org/${m.doi}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-1 text-[#7aa2f7] font-mono text-xs hover:underline"
                  >
                    DOI: {m.doi} ↗
                  </a>
                </div>
                <div>
                  <div className="text-[#6c7086] font-mono text-xs uppercase tracking-wider mb-2">Implementation Notes</div>
                  <div className="text-[#6c7086] text-xs leading-relaxed">{m.notes}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
