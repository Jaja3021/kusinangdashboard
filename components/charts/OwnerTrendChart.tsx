"use client";

import { Line, LineChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts";
import { CHART } from "@/lib/chart-colors";
import { formatPeso } from "@/lib/format";

function compact(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `₱${(value / 1_000_000).toFixed(1)}M`;
  return `₱${Math.round(value / 1000)}K`;
}

// Same slot convention as FinancialsBarChart: sales=series1, expense=series2, contribution=series3.
const SERIES = [
  { key: "sales", label: "Sales", color: CHART.series1 },
  { key: "totalExpense", label: "Total Expense", color: CHART.series2 },
  { key: "contribution", label: "Contribution", color: CHART.series3 },
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

export type OwnerTrendPoint = {
  period: string;
  sales: number;
  totalExpense: number;
  contribution: number;
};

export default function OwnerTrendChart({ data }: { data: OwnerTrendPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={CHART.grid} />
        <XAxis dataKey="period" tickLine={false} axisLine={{ stroke: CHART.axis }} tick={{ fill: CHART.mutedText, fontSize: 11 }} />
        <YAxis tickLine={false} axisLine={false} tick={{ fill: CHART.mutedText, fontSize: 12 }} tickFormatter={compact} width={56} />
        <Tooltip content={ChartTooltip} cursor={{ stroke: CHART.axis, strokeDasharray: 3 }} />
        <Legend iconType="circle" iconSize={8} formatter={(value) => <span className="text-xs text-slate-600">{value}</span>} />
        {SERIES.map((s) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={s.color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: s.color, strokeWidth: 2, stroke: "#ffffff" }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
