export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function fmt(value: number | undefined | null, decimals = 2, suffix = ""): string {
  if (value == null || isNaN(value)) return "—";
  return value.toFixed(decimals) + suffix;
}

export function fmtPct(value: number | undefined | null, decimals = 2): string {
  if (value == null || isNaN(value)) return "—";
  return (value * 100).toFixed(decimals) + "%";
}

export function fmtMcap(value: number | undefined | null): string {
  if (value == null) return "—";
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9)  return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6)  return `$${(value / 1e6).toFixed(2)}M`;
  return `$${value.toLocaleString()}`;
}

export function fmtNum(value: number | undefined | null): string {
  if (value == null) return "—";
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return value.toFixed(2);
}

export const MODEL_META: Record<string, { label: string; color: string; description: string; ref: string }> = {
  markowitz: {
    label: "Markowitz MVO",
    color: "#7aa2f7",
    description: "Mean-Variance Optimization (AIMMS). Minimizes portfolio variance for a target return.",
    ref: "Markowitz (1952). DOI: 10.2307/2975974",
  },
  cvar:      {
    label: "CVaR",
    color: "#9ece6a",
    description: "Conditional Value at Risk. Minimizes expected tail loss via linear programming.",
    ref: "Rockafellar & Uryasev (2000). DOI: 10.21314/JOR.2000.038",
  },
  rmt:       {
    label: "RMT Cleaned",
    color: "#7dcfff",
    description: "Random Matrix Theory denoising via Marchenko-Pastur law, then MVO on clean covariance.",
    ref: "Laloux et al. (1999). DOI: 10.1103/PhysRevLett.83.1467",
  },
  quantum:   {
    label: "Quantum-Inspired",
    color: "#bb9af7",
    description: "QUBO formulation solved by simulated quantum annealing (path-integral Monte Carlo).",
    ref: "Mugel et al. (2022). DOI: 10.1103/PhysRevResearch.4.013006",
  },
  entropy:   {
    label: "Max Entropy",
    color: "#e0af68",
    description: "Statistical mechanics principle: maximize portfolio Shannon entropy (maximum diversification).",
    ref: "Shore & Johnson (1980). DOI: 10.1109/TIT.1980.1056144",
  },
};
