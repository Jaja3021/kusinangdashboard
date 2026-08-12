"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, TooltipContentProps } from "recharts";
import { CHART } from "@/lib/chart-colors";
import { formatPeso } from "@/lib/dummy-data";

function compact(value: number): string {
  if (value >= 1_000_000) return `₱${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `₱${Math.round(value / 1000)}K`;
  return `₱${value}`;
}

function ChartTooltip({ active, payload, label }: TooltipContentProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-brand-200 bg-white px-3 py-2 shadow-md">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-sm font-semibold text-brand-900">{formatPeso(Number(payload[0].value ?? 0))}</p>
    </div>
  );
}

export default function BranchRevenueBarChart({ data }: { data: { branch: string; revenue: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={CHART.grid} />
        <XAxis
          dataKey="branch"
          tickLine={false}
          axisLine={{ stroke: CHART.axis }}
          tick={{ fill: CHART.mutedText, fontSize: 12 }}
        />
        <YAxis tickLine={false} axisLine={false} tick={{ fill: CHART.mutedText, fontSize: 12 }} tickFormatter={compact} width={52} />
        <Tooltip content={ChartTooltip} cursor={{ fill: CHART.grid, opacity: 0.4 }} />
        <Bar dataKey="revenue" fill={CHART.series1} radius={[4, 4, 0, 0]} maxBarSize={64} />
      </BarChart>
    </ResponsiveContainer>
  );
}
