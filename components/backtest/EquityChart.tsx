"use client";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";

interface Props {
  dates:        string[];
  equity:       number[];
  benchmark?:   number[];
  initialCap:   number;
}

const CustomTooltip = ({ active, payload, label }: {
  active?: boolean; payload?: { value: number; name: string; color: string }[]; label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#11111b] border border-[#2a2a3e] rounded-lg px-3 py-2 text-xs font-mono shadow-xl">
      <div className="text-[#45475a] mb-1">{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ color: p.color }}>
          {p.name}: ${p.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </div>
      ))}
    </div>
  );
};

export default function EquityChart({ dates, equity, benchmark, initialCap }: Props) {
  const data = dates.map((d, i) => ({
    date:      d,
    Portfolio: equity[i + 1] ?? equity[i],    // offset +1 (first point is pre-trade)
    ...(benchmark ? { Benchmark: benchmark[i + 1] ?? benchmark[i] } : {}),
  }));

  const tickEvery = Math.max(1, Math.floor(data.length / 8));

  return (
    <div>
      <div className="text-[#6c7086] font-mono text-xs uppercase tracking-wider mb-3">
        Equity Curve
      </div>
      <div className="bg-[#11111b] border border-[#2a2a3e] rounded-lg p-4">
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data} margin={{ top: 8, right: 16, bottom: 20, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
            <XAxis
              dataKey="date"
              tickFormatter={(v, i) => i % tickEvery === 0 ? v.slice(0, 7) : ""}
              tick={{ fill: "#45475a", fontSize: 9, fontFamily: "monospace" }}
              axisLine={false} tickLine={false}
            />
            <YAxis
              tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}
              tick={{ fill: "#45475a", fontSize: 9, fontFamily: "monospace" }}
              axisLine={false} tickLine={false}
              width={42}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={initialCap} stroke="#313244" strokeDasharray="4 2" />
            <Line
              type="monotone" dataKey="Portfolio"
              stroke="#7aa2f7" dot={false} strokeWidth={2}
            />
            {benchmark && (
              <Line
                type="monotone" dataKey="Benchmark"
                stroke="#45475a" dot={false} strokeWidth={1.5} strokeDasharray="4 2"
              />
            )}
          </LineChart>
        </ResponsiveContainer>
        <div className="flex gap-4 justify-center text-[10px] font-mono mt-1">
          <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 bg-[#7aa2f7] rounded" />Portfolio</span>
          {benchmark && <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 bg-[#45475a] rounded border-dashed" />EW Benchmark</span>}
          <span className="flex items-center gap-1.5"><span className="w-4 h-px bg-[#313244]" />Initial Capital</span>
        </div>
      </div>
    </div>
  );
}
