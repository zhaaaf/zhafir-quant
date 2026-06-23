import Topbar from "@/components/layout/Topbar";

const references = [
  {
    category: "Classical Portfolio Theory",
    papers: [
      {
        id: "[1]", authors: "Markowitz, H.", year: 1952,
        title: "Portfolio Selection",
        journal: "Journal of Finance, 7(1), 77–91",
        doi: "10.2307/2975974",
        notes: "Foundational paper introducing mean-variance optimization. Basis for the AIMMS portfolio model implemented here.",
      },
      {
        id: "[2]", authors: "Sharpe, W.F.", year: 1964,
        title: "Capital Asset Prices: A Theory of Market Equilibrium under Conditions of Risk",
        journal: "Journal of Finance, 19(3), 425–442",
        doi: "10.2307/2977928",
        notes: "CAPM and the Sharpe ratio used as optimization objective.",
      },
    ],
  },
  {
    category: "Risk Measures",
    papers: [
      {
        id: "[3]", authors: "Rockafellar, R.T. & Uryasev, S.", year: 2000,
        title: "Optimization of Conditional Value-at-Risk",
        journal: "Journal of Risk, 2(3), 21–41",
        doi: "10.21314/JOR.2000.038",
        notes: "Introduces the LP linearization of CVaR minimization. Directly implemented as the CVaR model.",
      },
    ],
  },
  {
    category: "Statistical Physics Applied to Finance",
    papers: [
      {
        id: "[4]", authors: "Laloux, L., Cizeau, P., Bouchaud, J.P., & Potters, M.", year: 1999,
        title: "Noise Dressing of Financial Correlation Matrices",
        journal: "Physical Review Letters, 83(7), 1467–1470",
        doi: "10.1103/PhysRevLett.83.1467",
        notes: "Applies Marchenko-Pastur law from random matrix theory to identify noise in empirical correlation matrices of stock returns.",
      },
      {
        id: "[5]", authors: "Plerou, V., et al.", year: 2002,
        title: "Random Matrix Approach to Cross-Correlations in Financial Data",
        journal: "Physical Review E, 65(6), 066126",
        doi: "10.1103/PhysRevE.65.066126",
        notes: "Extension of RMT analysis to S&P 500 data, validating Marchenko-Pastur bulk separates noise from market signals.",
      },
    ],
  },
  {
    category: "Quantum Computing & Finance",
    papers: [
      {
        id: "[6]", authors: "Mugel, S., et al.", year: 2022,
        title: "Dynamic portfolio optimization with real datasets using quantum processors and quantum-inspired tensor networks",
        journal: "Physical Review Research, 4(1), 013006",
        doi: "10.1103/PhysRevResearch.4.013006",
        notes: "QUBO formulation for portfolio selection, tested on real market data using quantum annealing hardware.",
      },
      {
        id: "[7]", authors: "Orús, R., Mugel, S., & Lizaso, E.", year: 2019,
        title: "Quantum computing for finance: Overview and prospects",
        journal: "Reviews in Physics, 4, 100028",
        doi: "10.1016/j.revip.2019.100028",
        notes: "Survey of quantum algorithms applicable to financial optimization problems.",
      },
    ],
  },
  {
    category: "Information Theory & Entropy",
    papers: [
      {
        id: "[8]", authors: "Shore, J.E. & Johnson, R.W.", year: 1980,
        title: "Axiomatic derivation of the principle of maximum entropy and the principle of minimum cross-entropy",
        journal: "IEEE Transactions on Information Theory, 26(1), 26–37",
        doi: "10.1109/TIT.1980.1056144",
        notes: "Axiomatic foundation for maximum entropy principle used in the entropy portfolio model.",
      },
      {
        id: "[9]", authors: "Shannon, C.E.", year: 1948,
        title: "A Mathematical Theory of Communication",
        journal: "Bell System Technical Journal, 27(3), 379–423",
        doi: "10.1002/j.1538-7305.1948.tb01338.x",
        notes: "Original definition of Shannon entropy H = −Σp log p.",
      },
    ],
  },
];

export default function ResearchPage() {
  return (
    <div className="min-h-screen">
      <Topbar title="Research Bibliography" subtitle="peer-reviewed sources" />
      <div className="p-6 max-w-4xl space-y-8">
        <div className="bg-[#11111b] border border-[#2a2a3e] rounded-lg p-4 text-sm text-[#6c7086]">
          All mathematical models in this application are based on peer-reviewed academic research.
          DOI links point to original papers. This project aims to prove that physics and OR models
          are applicable to real market portfolio optimization.
        </div>

        {references.map(cat => (
          <div key={cat.category}>
            <div className="text-[#7aa2f7] font-mono text-xs uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="flex-1 border-t border-[#2a2a3e]" />
              {cat.category}
              <span className="flex-1 border-t border-[#2a2a3e]" />
            </div>
            <div className="space-y-3">
              {cat.papers.map(p => (
                <div key={p.doi} className="bg-[#11111b] border border-[#2a2a3e] rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <span className="font-mono text-[#45475a] text-xs mt-0.5 shrink-0">{p.id}</span>
                    <div className="flex-1">
                      <div className="text-[#cdd6f4] text-sm font-semibold leading-snug">{p.title}</div>
                      <div className="text-[#7aa2f7] text-xs mt-0.5 font-mono">
                        {p.authors} ({p.year}) · {p.journal}
                      </div>
                      <a
                        href={`https://doi.org/${p.doi}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#45475a] hover:text-[#7aa2f7] font-mono text-xs transition-colors"
                      >
                        https://doi.org/{p.doi} ↗
                      </a>
                      <div className="text-[#6c7086] text-xs mt-2 leading-relaxed">{p.notes}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
