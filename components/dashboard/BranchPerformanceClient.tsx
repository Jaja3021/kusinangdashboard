"use client";

import { useMemo } from "react";
import { Package, Trophy } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import BranchMetricsBarChart, { type BranchMetricPoint } from "@/components/charts/BranchMetricsBarChart";
import SalesOverviewChart from "@/components/charts/SalesOverviewChart";
import { useDateRange } from "@/components/providers/DateRangeProvider";
import { formatPeso } from "@/lib/format";
import { BRANCHES } from "@/lib/mt/branches";
import { branchTotals, buildMonthlySeries, type BranchTotals } from "@/lib/reports/monthly";
import type { OrderRecord } from "@/lib/orders/types";

type MetricDef = { key: keyof BranchTotals; label: string; format: (v: number) => string; lowerIsBetter?: boolean };

const METRICS: MetricDef[] = [
  { key: "totalRevenue", label: "Total Revenue", format: formatPeso },
  { key: "totalBookings", label: "Total Bookings", format: (v) => String(v) },
  { key: "totalInquiries", label: "Total Inquiries", format: (v) => String(v) },
  { key: "conversionRate", label: "Conversion Rate", format: (v) => `${v}%` },
  { key: "lostCancelled", label: "Lost / Cancelled", format: formatPeso, lowerIsBetter: true },
  { key: "pendingPayments", label: "Pending Payments", format: formatPeso, lowerIsBetter: true },
];

export default function BranchPerformanceClient({ orders }: { orders: OrderRecord[] }) {
  const { range, label: periodLabel } = useDateRange();

  const totals = useMemo(() => BRANCHES.map((b) => branchTotals(orders, b, range)), [orders, range]);
  const monthly = useMemo(() => buildMonthlySeries(orders, BRANCHES), [orders]);

  const metricsChartData: BranchMetricPoint[] = METRICS.slice(0, 4).map((m) => {
    const point: BranchMetricPoint = { metric: m.label };
    for (const t of totals) point[t.branch.name] = t[m.key] as number;
    return point;
  });

  function winnerFor(m: MetricDef): string {
    const values = totals.map((t) => Number(t[m.key]));
    if (values.every((v) => v === values[0])) return "Tie";
    const best = m.lowerIsBetter ? Math.min(...values) : Math.max(...values);
    const winners = totals.filter((t) => Number(t[m.key]) === best);
    return winners.length > 1 ? "Tie" : winners[0].branch.name;
  }

  return (
    <div>
      <PageHeader title="Branch Performance" subtitle={`Compare every branch · ${periodLabel}`} />

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        {totals.map((t) => (
          <div key={t.branch.id} className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="mb-3 flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${t.branch.dot}`} />
              <h3 className="font-display text-base font-semibold text-brand-900">{t.branch.name}</h3>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-md bg-gold-500/10 p-2">
                <p className="text-gray-500">Total Revenue</p>
                <p className="font-semibold text-gold-700">{formatPeso(t.totalRevenue)}</p>
              </div>
              <div className="rounded-md bg-gray-50 p-2">
                <p className="text-gray-500">Total Bookings</p>
                <p className="font-semibold text-brand-900">{t.totalBookings}</p>
              </div>
              <div className="rounded-md bg-gray-50 p-2">
                <p className="text-gray-500">Total Inquiries</p>
                <p className="font-semibold text-brand-900">{t.totalInquiries}</p>
              </div>
              <div className="rounded-md bg-gray-50 p-2">
                <p className="text-gray-500">Conversion Rate</p>
                <p className="font-semibold text-brand-900">{t.conversionRate}%</p>
              </div>
              <div className="rounded-md bg-gray-50 p-2">
                <p className="text-gray-500">Lost / Cancelled</p>
                <p className="font-semibold text-brand-900">{formatPeso(t.lostCancelled)}</p>
              </div>
              <div className="rounded-md bg-gray-50 p-2">
                <p className="text-gray-500">Pending Payments</p>
                <p className="font-semibold text-brand-900">{formatPeso(t.pendingPayments)}</p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1.5 border-t border-gray-100 pt-2 text-xs text-gray-500">
              <Package size={12} /> Top package: <span className="font-medium text-brand-900">{t.topPackage}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="mb-1 font-display text-base font-semibold text-brand-900">Revenue Trend</h2>
          <p className="mb-4 text-xs text-gray-400">Last 3 months · 2 seeded + this month live</p>
          <SalesOverviewChart data={monthly} branches={BRANCHES} />
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="mb-1 font-display text-base font-semibold text-brand-900">Key Metrics Comparison</h2>
          <p className="mb-4 text-xs text-gray-400">Side-by-side performance</p>
          <BranchMetricsBarChart data={metricsChartData} branches={BRANCHES} />
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="mb-1 font-display text-base font-semibold text-brand-900">Performance Snapshot</h2>
        <p className="mb-4 text-xs text-gray-400">All metrics at a glance</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs uppercase text-gray-500">
                <th className="pb-2 text-left font-medium">Metric</th>
                {totals.map((t) => (
                  <th key={t.branch.id} className="pb-2 text-left font-medium">
                    {t.branch.name}
                  </th>
                ))}
                <th className="pb-2 text-left font-medium">Winner</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {METRICS.map((m) => {
                const winner = winnerFor(m);
                return (
                  <tr key={String(m.key)}>
                    <td className="py-2.5 font-medium text-brand-900">{m.label}</td>
                    {totals.map((t) => (
                      <td key={t.branch.id} className="py-2.5 text-gray-700">
                        {m.format(Number(t[m.key]))}
                      </td>
                    ))}
                    <td className="py-2.5">
                      {winner === "Tie" ? (
                        <span className="text-xs text-gray-400">Tie</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded bg-gold-500/10 px-2 py-0.5 text-xs font-medium text-gold-700">
                          <Trophy size={11} /> {winner}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
