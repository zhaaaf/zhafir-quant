"use client";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

const PALETTE = [
  "#7aa2f7", "#9ece6a", "#7dcfff", "#bb9af7", "#e0af68",
  "#f7768e", "#73daca", "#ff9e64", "#c0caf5", "#9d7cd8",
];

interface Props {
  weightsMap: Record<string, number>;
}

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { name: string; value: number }[] }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#11111b] border border-[#2a2a3e] rounded-lg px-3 py-2 text-xs font-mono shadow-xl">
      <div className="text-[#7aa2f7] font-bold">{payload[0].name}</div>
      <div className="text-[#9ece6a]">{(payload[0].value * 100).toFixed(2)}%</div>
    </div>
  );
};

export default function AllocationChart({ weightsMap }: Props) {
  const data = Object.entries(weightsMap)
    .filter(([, w]) => w > 0.005)
    .sort(([, a], [, b]) => b - a)
    .map(([ticker, weight]) => ({ name: ticker, value: weight }));

  return (
    <div>
      <div className="text-[#6c7086] font-mono text-xs uppercase tracking-wider mb-3">Allocation</div>
      <div className="bg-[#11111b] border border-[#2a2a3e] rounded-lg p-4">
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={data}
              cx="50%" cy="50%"
              innerRadius={55} outerRadius={85}
              dataKey="value"
              stroke="none"
            >
              {data.map((_, i) => (
                <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>

        {/* Legend */}
        <div className="space-y-1.5 mt-2">
          {data.map((d, i) => (
            <div key={d.name} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ background: PALETTE[i % PALETTE.length] }} />
                <span className="font-mono text-[#a6adc8]">{d.name}</span>
              </div>
              <span className="font-mono text-[#cdd6f4]">{(d.value * 100).toFixed(2)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
