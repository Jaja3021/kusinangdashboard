"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";
import { CHART } from "@/lib/chart-colors";
import { formatPeso } from "@/lib/format";
import type { Branch } from "@/lib/mt/branches";
import type { MonthlyPoint } from "@/lib/mt/revenue";

function axisPeso(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `₱${(value / 1_000_000).toFixed(1)}M`;
  return `₱${Math.round(value / 1000)}k`;
}

function ChartTooltip({ active, payload, label }: TooltipContentProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-md">
      <p className="mb-1 text-xs text-gray-500">{label}</p>
      {payload.map((row) => (
        <p key={String(row.dataKey)} className="flex items-center gap-2 text-sm">
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: row.color }}
          />
          <span className="text-gray-600">{String(row.dataKey)}</span>
          <span className="ml-auto font-semibold text-brand-900">
            {formatPeso(Number(row.value ?? 0))}
          </span>
        </p>
      ))}
    </div>
  );
}

/**
 * Monthly confirmed revenue, one area per branch in scope.
 *
 * The legend is not optional here: series colors carry branch identity, and
 * one of the palette slots sits under 3:1 on white, so the labels are what
 * make the chart readable without relying on color (see lib/chart-colors.ts).
 */
export default function SalesOverviewChart({
  data,
  branches,
}: {
  data: MonthlyPoint[];
  branches: Branch[];
}) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
        <defs>
          {branches.map((branch) => (
            <linearGradient
              key={branch.id}
              id={`fill-${branch.id}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="5%" stopColor={branch.color} stopOpacity={0.15} />
              <stop offset="95%" stopColor={branch.color} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>

        <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 11, fill: CHART.mutedText }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={axisPeso}
          tick={{ fontSize: 11, fill: CHART.mutedText }}
          axisLine={false}
          tickLine={false}
          width={58}
        />
        <Tooltip content={ChartTooltip} cursor={{ stroke: CHART.axis, strokeDasharray: 3 }} />
        {branches.length > 1 && (
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
        )}

        {branches.map((branch) => (
          <Area
            key={branch.id}
            type="monotone"
            dataKey={branch.name}
            name={branch.name}
            stroke={branch.color}
            fill={`url(#fill-${branch.id})`}
            strokeWidth={2}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}
