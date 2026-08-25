"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts";
import { CATEGORICAL, CHART } from "@/lib/chart-colors";
import { formatPeso } from "@/lib/format";

function compact(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `₱${(value / 1_000_000).toFixed(1)}M`;
  return `₱${Math.round(value / 1000)}K`;
}

// Exactly four series — CATEGORICAL_MAX in lib/chart-colors.ts — assigned by
// fixed slot order, never hand-picked. The legend below is required by the
// palette's relief rule (see the header comment in lib/chart-colors.ts).
const SERIES = [
  { key: "operational", label: "Operational", color: CATEGORICAL[0] },
  { key: "salary", label: "Salary", color: CATEGORICAL[1] },
  { key: "commissions", label: "Commissions", color: CATEGORICAL[2] },
  { key: "bonuses", label: "Bonuses", color: CATEGORICAL[3] },
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

export type ExpenseBreakdownPoint = {
  period: string;
  operational: number;
  salary: number;
  commissions: number;
  bonuses: number;
};

export default function ExpenseBreakdownChart({ data }: { data: ExpenseBreakdownPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={CHART.grid} />
        <XAxis dataKey="period" tickLine={false} axisLine={{ stroke: CHART.axis }} tick={{ fill: CHART.mutedText, fontSize: 11 }} />
        <YAxis tickLine={false} axisLine={false} tick={{ fill: CHART.mutedText, fontSize: 12 }} tickFormatter={compact} width={56} />
        <Tooltip content={ChartTooltip} cursor={{ fill: CHART.grid, opacity: 0.4 }} />
        <Legend iconType="circle" iconSize={8} formatter={(value) => <span className="text-xs text-slate-600">{value}</span>} />
        {SERIES.map((s) => (
          <Bar key={s.key} dataKey={s.key} name={s.label} stackId="expense" fill={s.color} maxBarSize={28} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
