"use client";
import {
  ScatterChart, Scatter, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine, CartesianGrid,
} from "recharts";
import type { FrontierPoint, OptimizeResult } from "@/lib/types";
import { MODEL_META } from "@/lib/utils";

interface Props {
  frontier: FrontierPoint[];
  optimal?: OptimizeResult | null;
  model: string;
}

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { payload: FrontierPoint }[] }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-[#11111b] border border-[#2a2a3e] rounded-lg px-3 py-2 text-xs font-mono shadow-xl">
      <div className="text-[#7dcfff]">σ  {(d.volatility * 100).toFixed(2)}%</div>
      <div className="text-[#9ece6a]">μ  {(d.expected_return * 100).toFixed(2)}%</div>
      {d.sharpe_ratio != null && <div className="text-[#e0af68]">SR {d.sharpe_ratio.toFixed(3)}</div>}
      {d.cvar != null && <div className="text-[#f7768e]">CVaR {d.cvar.toFixed(4)}</div>}
    </div>
  );
};

export default function EfficientFrontierChart({ frontier, optimal, model }: Props) {
  if (!frontier.length) return null;

  const color = MODEL_META[model]?.color ?? "#7aa2f7";
  const frontierData = frontier.map(p => ({
    x: +(p.volatility * 100).toFixed(4),
    y: +(p.expected_return * 100).toFixed(4),
    ...p,
  }));

  const optPoint = optimal
    ? [{ x: +(optimal.volatility * 100).toFixed(4), y: +(optimal.expected_return * 100).toFixed(4) }]
    : [];

  return (
    <div>
      <div className="text-[#6c7086] font-mono text-xs uppercase tracking-wider mb-3">Efficient Frontier</div>
      <div className="bg-[#11111b] border border-[#2a2a3e] rounded-lg p-4">
        <ResponsiveContainer width="100%" height={320}>
          <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
            <XAxis
              type="number" dataKey="x" name="Volatility"
              label={{ value: "Volatility (% ann.)", position: "insideBottom", offset: -10, fill: "#6c7086", fontSize: 11 }}
              tick={{ fill: "#6c7086", fontSize: 10, fontFamily: "monospace" }}
              domain={["auto", "auto"]}
            />
            <YAxis
              type="number" dataKey="y" name="Return"
              label={{ value: "Return (% ann.)", angle: -90, position: "insideLeft", fill: "#6c7086", fontSize: 11 }}
              tick={{ fill: "#6c7086", fontSize: 10, fontFamily: "monospace" }}
              domain={["auto", "auto"]}
            />
            <Tooltip content={<CustomTooltip />} />

            {/* Frontier curve */}
            <Scatter data={frontierData} fill={color} opacity={0.7} r={3} />

            {/* Optimal portfolio */}
            {optPoint.length > 0 && (
              <Scatter data={optPoint} fill="#f7768e" r={7} shape="star" />
            )}
          </ScatterChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-4 mt-2 justify-center text-xs font-mono">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 rounded" style={{ background: color }} />
            <span className="text-[#6c7086]">Frontier ({MODEL_META[model]?.label})</span>
          </span>
          {optPoint.length > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#f7768e]" />
              <span className="text-[#6c7086]">Optimal portfolio</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
