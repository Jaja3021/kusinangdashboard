"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";
import { CHART } from "@/lib/chart-colors";
import { formatPeso } from "@/lib/format";

function compact(value: number): string {
  if (value >= 1_000_000) return `₱${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `₱${Math.round(value / 1000)}K`;
  return `₱${value}`;
}

function ChartTooltip({ active, payload, label }: TooltipContentProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-brand-200 bg-white px-3 py-2 shadow-md">
      <p className="mb-1 text-xs text-slate-500">{label} events/month</p>
      {payload.map((row) => (
        <p key={String(row.dataKey)} className="flex items-center gap-2 text-sm">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: row.color }} />
          <span className="text-gray-600">{String(row.dataKey)}</span>
          <span className="ml-auto font-semibold text-brand-900">{formatPeso(Number(row.value ?? 0))}</span>
        </p>
      ))}
    </div>
  );
}

export type BreakEvenChartPoint = { events: number; "Fixed Costs": number; Revenue: number; "Total Costs": number };

export default function BreakEvenChart({ data, breakEvenPoint }: { data: BreakEvenChartPoint[]; breakEvenPoint: number }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={CHART.grid} />
        <XAxis
          dataKey="events"
          tickLine={false}
          axisLine={{ stroke: CHART.axis }}
          tick={{ fill: CHART.mutedText, fontSize: 12 }}
        />
        <YAxis tickLine={false} axisLine={false} tick={{ fill: CHART.mutedText, fontSize: 12 }} tickFormatter={compact} width={52} />
        <Tooltip content={ChartTooltip} cursor={{ stroke: CHART.axis, strokeDasharray: 3 }} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
        {Number.isFinite(breakEvenPoint) && (
          <ReferenceLine x={breakEvenPoint} stroke={CHART.mutedText} strokeDasharray="4 4" label={{ value: "Break-even", position: "top", fontSize: 11, fill: CHART.mutedText }} />
        )}
        <Line type="monotone" dataKey="Fixed Costs" stroke={CHART.mutedText} strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="Total Costs" stroke={CHART.series2} strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="Revenue" stroke={CHART.series3} strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
