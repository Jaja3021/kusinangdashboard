"use client";

import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  type TooltipContentProps,
} from "recharts";
import type { SourceSlice } from "@/lib/mt/sources";

function ChartTooltip({ active, payload }: TooltipContentProps) {
  if (!active || !payload?.length) return null;
  const slice = payload[0];
  const count = Number(slice.value ?? 0);

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-md">
      <p className="flex items-center gap-2 text-sm">
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: slice.payload?.color }}
        />
        <span className="text-gray-600">{slice.name}</span>
        <span className="ml-auto font-semibold text-brand-900">
          {count} {count === 1 ? "inquiry" : "inquiries"}
        </span>
      </p>
    </div>
  );
}

/**
 * Lead sources as a donut. Segment count is capped upstream by
 * `inquirySources()` — the palette only validates to four slots, so anything
 * past the top three folds into "Others" rather than inventing a fifth hue.
 */
export default function InquirySourcesChart({ data }: { data: SourceSlice[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-[220px] flex-col items-center justify-center px-4 text-center">
        <p className="text-sm text-gray-500">No source data yet</p>
        <p className="mt-1 text-xs leading-relaxed text-gray-400">
          Tag inquiries with where they came from — Facebook, Referral, Walk-in — and this
          fills in.
        </p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={90}
          dataKey="value"
          nameKey="name"
          // A 2px surface gap keeps adjacent segments from bleeding together.
          stroke="#ffffff"
          strokeWidth={2}
        >
          {data.map((slice) => (
            <Cell key={slice.name} fill={slice.color} />
          ))}
        </Pie>
        <Tooltip content={ChartTooltip} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
