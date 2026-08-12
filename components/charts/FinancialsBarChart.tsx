"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, TooltipContentProps } from "recharts";
import { CHART } from "@/lib/chart-colors";
import { formatPeso } from "@/lib/dummy-data";

function compact(value: number): string {
  if (value >= 1_000_000) return `₱${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `₱${Math.round(value / 1000)}K`;
  return `₱${value}`;
}

const SERIES = [
  { key: "revenue", label: "Revenue", color: CHART.series1 },
  { key: "expenses", label: "Expenses", color: CHART.series2 },
  { key: "profit", label: "Profit", color: CHART.series3 },
] as const;

function ChartTooltip({ active, payload, label }: TooltipContentProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-brand-200 bg-white px-3 py-2 shadow-md">
      <p className="mb-1.5 text-xs text-slate-500">{label}</p>
      <div className="space-y-1">
        {payload.map((entry: NonNullable<typeof payload>[number]) => (
          <div key={entry.dataKey as string} className="flex items-center gap-2 text-sm">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-slate-500">{entry.name}</span>
            <span className="ml-auto font-semibold text-brand-900">{formatPeso(Number(entry.value ?? 0))}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function FinancialsBarChart({
  data,
}: {
  data: { month: string; revenue: number; expenses: number; profit: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }} barGap={2}>
        <CartesianGrid vertical={false} stroke={CHART.grid} />
        <XAxis
          dataKey="month"
          tickLine={false}
          axisLine={{ stroke: CHART.axis }}
          tick={{ fill: CHART.mutedText, fontSize: 12 }}
        />
        <YAxis tickLine={false} axisLine={false} tick={{ fill: CHART.mutedText, fontSize: 12 }} tickFormatter={compact} width={52} />
        <Tooltip content={ChartTooltip} cursor={{ fill: CHART.grid, opacity: 0.4 }} />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(value) => <span className="text-xs text-slate-600">{value}</span>}
        />
        {SERIES.map((s) => (
          <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={[4, 4, 0, 0]} maxBarSize={20} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
