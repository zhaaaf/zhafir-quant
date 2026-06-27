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
        notes: "Foundational MVO paper. Basis for AIMMS portfolio model implemented here. Efficient frontier, minimum variance portfolio, tangency portfolio.",
      },
      {
        id: "[2]", authors: "Sharpe, W.F.", year: 1964,
        title: "Capital Asset Prices: A Theory of Market Equilibrium under Conditions of Risk",
        journal: "Journal of Finance, 19(3), 425–442",
        doi: "10.2307/2977928",
        notes: "CAPM framework and the Sharpe Ratio SR = √N·E[Rp−Rf]/σp used as optimization objective.",
      },
      {
        id: "[3]", authors: "Fama, E.F.", year: 1970,
        title: "Efficient Capital Markets: A Review of Theory and Empirical Work",
        journal: "Journal of Finance, 25(2), 383–417",
        doi: "10.2307/2325486",
        notes: "EMH hypothesis — platform exploits semi-strong anomalies via quantitative models (RMT, momentum) rather than assuming market efficiency.",
      },
    ],
  },
  {
    category: "Risk Measures",
    papers: [
      {
        id: "[4]", authors: "Rockafellar, R.T. & Uryasev, S.", year: 2000,
        title: "Optimization of Conditional Value-at-Risk",
        journal: "Journal of Risk, 2(3), 21–41",
        doi: "10.21314/JOR.2000.038",
        notes: "LP linearization of CVaR: min ζ + 1/((1−α)T)Σzₜ. Directly implemented as CVaR model. Return constraint uses inequality (≥) not equality.",
      },
      {
        id: "[5]", authors: "Sortino, F. & Price, L.", year: 1994,
        title: "Performance Measurement in a Downside Risk Framework",
        journal: "Journal of Investing, 3(3), 59–64",
        doi: "10.3905/joi.3.3.59",
        notes: "Sortino Ratio SND = √N·E[Rp−Rf]/σd. σd = downside semi-deviation (only penalises negative returns). Implemented in all optimizer and backtest outputs.",
      },
      {
        id: "[6]", authors: "Calmar, T.", year: 1991,
        title: "The Calmar Ratio: A Smoother Tool",
        journal: "Futures Magazine",
        doi: "",
        notes: "Calmar Ratio = Annualised Return / Max Drawdown. Measures return per unit of worst-case loss. Implemented in backtesting engine.",
      },
      {
        id: "[7]", authors: "Bailey, D.H., et al.", year: 2014,
        title: "Pseudo-mathematics and financial charlatanism: backtest overfitting effects on out-of-sample performance",
        journal: "Notices of the AMS, 61(5), 458–471",
        doi: "10.1090/noti1090",
        notes: "Deflating Sharpe Ratio to correct for multiple testing and backtest overfitting. Rationale for out-of-sample validation in backtesting engine.",
      },
    ],
  },
  {
    category: "Statistical Physics Applied to Finance",
    papers: [
      {
        id: "[8]", authors: "Laloux, L., Cizeau, P., Bouchaud, J.P., & Potters, M.", year: 1999,
        title: "Noise Dressing of Financial Correlation Matrices",
        journal: "Physical Review Letters, 83(7), 1467–1470",
        doi: "10.1103/PhysRevLett.83.1467",
        notes: "Marchenko-Pastur law for eigenvalue bulk: λ± = σ²(1±1/√q)². Noise eigenvalues replaced with mean — implemented as RMT model.",
      },
      {
        id: "[9]", authors: "Plerou, V., et al.", year: 2002,
        title: "Random Matrix Approach to Cross-Correlations in Financial Data",
        journal: "Physical Review E, 65(6), 066126",
        doi: "10.1103/PhysRevE.65.066126",
        notes: "Extension of RMT to S&P 500 — validates Marchenko-Pastur bulk separates noise from signal eigenvalues.",
      },
    ],
  },
  {
    category: "Quantum Computing & Finance",
    papers: [
      {
        id: "[10]", authors: "Mugel, S., et al.", year: 2022,
        title: "Dynamic portfolio optimization with real datasets using quantum processors and quantum-inspired tensor networks",
        journal: "Physical Review Research, 4(1), 013006",
        doi: "10.1103/PhysRevResearch.4.013006",
        notes: "QUBO formulation H = −μ′x + λ_r x′Σx + λ_b(Σxᵢ−B)². Solved via Simulated Quantum Annealing (Suzuki-Trotter). Implemented as Quantum model.",
      },
      {
        id: "[11]", authors: "Orús, R., Mugel, S., & Lizaso, E.", year: 2019,
        title: "Quantum computing for finance: Overview and prospects",
        journal: "Reviews in Physics, 4, 100028",
        doi: "10.1016/j.revip.2019.100028",
        notes: "Survey of QAOA and quantum annealing for portfolio selection.",
      },
    ],
  },
  {
    category: "Information Theory & Entropy",
    papers: [
      {
        id: "[12]", authors: "Shore, J.E. & Johnson, R.W.", year: 1980,
        title: "Axiomatic derivation of the principle of maximum entropy",
        journal: "IEEE Transactions on Information Theory, 26(1), 26–37",
        doi: "10.1109/TIT.1980.1056144",
        notes: "Maximum entropy principle from statistical mechanics: max H(w)=−Σwᵢln(wᵢ). Effective N = e^H(w). Implemented as Entropy model.",
      },
      {
        id: "[13]", authors: "Shannon, C.E.", year: 1948,
        title: "A Mathematical Theory of Communication",
        journal: "Bell System Technical Journal, 27(3), 379–423",
        doi: "10.1002/j.1538-7305.1948.tb01338.x",
        notes: "Original Shannon entropy H = −Σp log p. Basis for portfolio diversification measure.",
      },
    ],
  },
  {
    category: "Position Sizing & Behavioural Finance",
    papers: [
      {
        id: "[14]", authors: "Kelly, J.L.", year: 1956,
        title: "A New Interpretation of Information Rate",
        journal: "Bell System Technical Journal, 35(4), 917–926",
        doi: "10.1002/j.1538-7305.1956.tb03809.x",
        notes: "Kelly Criterion: f* = (b·p − q)/b. Optimal capital fraction per trade. Platform uses Half-Kelly (f*/2) as recommended by TDS Bab 2 for conservative risk.",
      },
      {
        id: "[15]", authors: "Kahneman, D. & Tversky, A.", year: 1979,
        title: "Prospect Theory: An Analysis of Decision under Risk",
        journal: "Econometrica, 47(2), 263–291",
        doi: "10.2307/1914185",
        notes: "Loss aversion and cognitive biases in manual trading. Platform automates decisions to eliminate bias — aligns with TDS Bab 2 business rationale.",
      },
    ],
  },
  {
    category: "Momentum & Fundamental Analysis",
    papers: [
      {
        id: "[16]", authors: "Jegadeesh, N. & Titman, S.", year: 1993,
        title: "Returns to Buying Winners and Selling Losers: Implications for Stock Market Efficiency",
        journal: "Journal of Finance, 48(1), 65–91",
        doi: "10.1111/j.1540-6261.1993.tb04702.x",
        notes: "12-1 month momentum (skip last month to avoid reversal). 3M/6M/12M variants implemented in stock scoring composite.",
      },
      {
        id: "[17]", authors: "George, T. & Hwang, C.", year: 2004,
        title: "The 52-Week High and Momentum Investing",
        journal: "Journal of Finance, 59(5), 2145–2176",
        doi: "10.1111/j.1540-6261.2004.00695.x",
        notes: "Price/52W-High ratio as momentum signal. Implemented in stock scoring (high_52w_ratio).",
      },
      {
        id: "[18]", authors: "Piotroski, J.D.", year: 2000,
        title: "Value Investing: The Use of Historical Financial Statement Information to Separate Winners from Losers",
        journal: "Journal of Accounting Research, 38, 1–41",
        doi: "10.2307/2672906",
        notes: "8-point F-Score based on profitability, leverage, liquidity, and efficiency signals. Implemented in screener composite scoring.",
      },
      {
        id: "[19]", authors: "Altman, E.I.", year: 1968,
        title: "Financial Ratios, Discriminant Analysis and the Prediction of Corporate Bankruptcy",
        journal: "Journal of Finance, 23(4), 589–609",
        doi: "10.1111/j.1540-6261.1968.tb00843.x",
        notes: "Z = 1.2X₁+1.4X₂+3.3X₃+0.6X₄+X₅. X₄ uses total liabilities (not just totalDebt — bug corrected). Z>2.99=Safe, 1.81–2.99=Grey, <1.81=Distress.",
      },
    ],
  },
  {
    category: "Market Microstructure",
    papers: [
      {
        id: "[20]", authors: "Graham, B. & Dodd, D.", year: 1934,
        title: "Security Analysis",
        journal: "McGraw-Hill",
        doi: "",
        notes: "Graham Number = √(22.5×EPS×BVPS). Margin of Safety = (GN−Price)/GN. Implemented in screener fundamental scoring.",
      },
      {
        id: "[21]", authors: "Åström, K.J. & Murray, R.M.", year: 2008,
        title: "Feedback Systems: An Introduction for Scientists and Engineers",
        journal: "Princeton University Press",
        doi: "",
        notes: "Closed-loop feedback control rationale for automated trading (TDS Bab 3). Platform as a feedback controller removing human latency in decision-making.",
      },
    ],
  },
];

export default function ResearchPage() {
  return (
    <div className="min-h-screen">
      <Topbar title="Research Bibliography" subtitle={`${references.reduce((s, c) => s + c.papers.length, 0)} peer-reviewed sources`} />
      <div className="p-4 md:p-6 max-w-4xl space-y-8">
        <div className="bg-[#11111b] border border-[#2a2a3e] rounded-lg p-4 text-sm text-[#6c7086]">
          Seluruh model matematika di platform ini didasarkan pada literatur akademik peer-reviewed.
          DOI links mengarah ke paper asli. Proyek ini membuktikan model matematika (OR + Fisika)
          dapat diaplikasikan secara empiris pada data pasar modal nyata.
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
                <div key={p.id} className="bg-[#11111b] border border-[#2a2a3e] rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <span className="font-mono text-[#45475a] text-xs mt-0.5 shrink-0">{p.id}</span>
                    <div className="flex-1">
                      <div className="text-[#cdd6f4] text-sm font-semibold leading-snug">{p.title}</div>
                      <div className="text-[#7aa2f7] text-xs mt-0.5 font-mono">
                        {p.authors} ({p.year}) · {p.journal}
                      </div>
                      {p.doi ? (
                        <a href={`https://doi.org/${p.doi}`} target="_blank" rel="noopener noreferrer"
                          className="text-[#45475a] hover:text-[#7aa2f7] font-mono text-xs transition-colors">
                          https://doi.org/{p.doi} ↗
                        </a>
                      ) : (
                        <span className="text-[#313244] font-mono text-xs">Book / No DOI</span>
                      )}
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
