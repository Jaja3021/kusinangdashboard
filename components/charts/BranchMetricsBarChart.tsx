"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts";
import { CHART } from "@/lib/chart-colors";
import type { Branch } from "@/lib/mt/branches";

function ChartTooltip({ active, payload, label }: TooltipContentProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-brand-200 bg-white px-3 py-2 shadow-md">
      <p className="mb-1 text-xs text-slate-500">{label}</p>
      {payload.map((row) => (
        <p key={String(row.dataKey)} className="flex items-center gap-2 text-sm">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: row.color }} />
          <span className="text-gray-600">{String(row.dataKey)}</span>
          <span className="ml-auto font-semibold text-brand-900">{Number(row.value ?? 0).toLocaleString("en-PH")}</span>
        </p>
      ))}
    </div>
  );
}

export type BranchMetricPoint = { metric: string } & Record<string, number | string>;

export default function BranchMetricsBarChart({ data, branches }: { data: BranchMetricPoint[]; branches: Branch[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={CHART.grid} />
        <XAxis dataKey="metric" tickLine={false} axisLine={{ stroke: CHART.axis }} tick={{ fill: CHART.mutedText, fontSize: 11 }} />
        <YAxis tickLine={false} axisLine={false} tick={{ fill: CHART.mutedText, fontSize: 12 }} width={40} />
        <Tooltip content={ChartTooltip} cursor={{ fill: CHART.grid, opacity: 0.4 }} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
        {branches.map((b) => (
          <Bar key={b.id} dataKey={b.name} name={b.name} fill={b.color} radius={[4, 4, 0, 0]} maxBarSize={36} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
