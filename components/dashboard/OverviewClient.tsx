"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarCheck,
  ClipboardList,
  MessageCircle,
  RotateCcw,
  TrendingUp,
  Wallet,
} from "lucide-react";
import InquirySourcesChart from "@/components/charts/InquirySourcesChart";
import SalesOverviewChart from "@/components/charts/SalesOverviewChart";
import { useBranch } from "@/components/providers/BranchProvider";
import { useDateRange } from "@/components/providers/DateRangeProvider";
import { useSync } from "@/components/providers/SyncProvider";
import { BranchBadge, StatusBadge } from "@/components/ui/Badge";
import LiveBadge from "@/components/ui/LiveBadge";
import PageHeader from "@/components/ui/PageHeader";
import ScrollX from "@/components/ui/ScrollX";
import StatCard from "@/components/ui/StatCard";
import { ALL_BRANCHES } from "@/lib/mt/branches";
import { inRange, todayManila } from "@/lib/mt/dates";
import { opportunities } from "@/lib/mt/opportunities";
import { overviewStats } from "@/lib/mt/overview";
import { monthlyRevenue, revenueTotals } from "@/lib/mt/revenue";
import { inquirySources } from "@/lib/mt/sources";
import type { TodayOrder } from "@/lib/orders/today";

const STATUS_TILE_COLORS = {
  booked: "#1baf7a",
  pending: "#2a78d6",
  preparation: "#eda100",
  completed: "#9ca3af",
} as const;

// "Today's Orders" (the tile + table below) is real, live from Supabase —
// see app/dashboard/page.tsx. Every other number here (revenue, inquiries,
// bookings, refunds) is still the demo CRM pipeline in lib/mt/opportunities.ts;
// nothing in Supabase backs those yet.
export default function OverviewClient({ todayOrders }: { todayOrders: TodayOrder[] }) {
  const router = useRouter();
  const { selectedBranch, scope } = useBranch();
  const { range, label: periodLabel } = useDateRange();
  const { lastUpdated, loading, error, refresh } = useSync();

  const today = todayManila();
  const allBranches = selectedBranch === ALL_BRANCHES;
  const scopeNames = useMemo(() => scope.map((b) => b.name), [scope]);

  // Events are scoped by event date; inquiries by when they came in.
  const byEventDate = useMemo(
    () => opportunities.filter((o) => inRange(o.eventDate, range)),
    [range],
  );
  const byCreatedDate = useMemo(
    () => opportunities.filter((o) => inRange(o.createdDate, range)),
    [range],
  );

  const totals = useMemo(
    () => revenueTotals(byEventDate, selectedBranch),
    [byEventDate, selectedBranch],
  );

  const stats = useMemo(
    () =>
      overviewStats({
        periodScoped: byCreatedDate,
        allTime: opportunities,
        branch: selectedBranch,
        today,
      }),
    [byCreatedDate, selectedBranch, today],
  );

  const monthly = useMemo(
    () => monthlyRevenue(opportunities, scopeNames),
    [scopeNames],
  );

  const sources = useMemo(
    () =>
      inquirySources(
        selectedBranch === ALL_BRANCHES
          ? byCreatedDate
          : byCreatedDate.filter((o) => o.branch === selectedBranch),
      ),
    [byCreatedDate, selectedBranch],
  );

  const branchSuffix = allBranches ? "All branches" : selectedBranch;

  const statusTiles = [
    { label: "Booked", value: stats.booked, dot: STATUS_TILE_COLORS.booked },
    { label: "Pending / New", value: stats.pending, dot: STATUS_TILE_COLORS.pending },
    {
      label: "For Preparation",
      value: stats.forPreparation,
      dot: STATUS_TILE_COLORS.preparation,
    },
    { label: "Completed", value: stats.completed, dot: STATUS_TILE_COLORS.completed },
  ];

  return (
    <div>
      <PageHeader title="Overview" subtitle={`${selectedBranch} · Live from CRM`} />

      <div className="mb-5">
        <LiveBadge
          lastUpdated={lastUpdated}
          loading={loading}
          error={error}
          onRefresh={refresh}
        />
        <span className="ml-3 text-xs text-gray-400">
          {opportunities.length} opportunities in the pipeline
        </span>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div onClick={() => router.push("/dashboard/sales")} className="cursor-pointer">
          <StatCard
            label="CONFIRMED REVENUE"
            format="money"
            value={totals.confirmedRevenue}
            sub={`${periodLabel} · ${branchSuffix}`}
            trend="+12.4%"
            trendLabel="vs last month"
            icon={<TrendingUp size={18} className="text-gold-600" />}
            iconBg="bg-gold-500/10"
            valueColor="text-gold-600"
          />
        </div>

        <div onClick={() => router.push("/dashboard/inquiries")} className="cursor-pointer">
          <StatCard
            label="NEW INQUIRIES"
            value={stats.total}
            sub={`${periodLabel} · ${branchSuffix}`}
            trend={`${stats.total} total`}
            trendLabel="in this period"
            icon={<MessageCircle size={18} className="text-blue-500" />}
            iconBg="bg-blue-50"
            valueColor="text-blue-600"
          />
        </div>

        <div onClick={() => router.push("/dashboard/bookings")} className="cursor-pointer">
          <StatCard
            label="CONFIRMED BOOKINGS"
            value={stats.booked}
            sub={`${periodLabel} · won in pipeline`}
            trend="Live"
            trendLabel="from the pipeline"
            icon={<CalendarCheck size={18} className="text-emerald-500" />}
            iconBg="bg-emerald-50"
            valueColor="text-emerald-600"
          />
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div onClick={() => router.push("/dashboard/orders")} className="cursor-pointer">
          <StatCard
            label="TODAY'S ORDERS"
            value={todayOrders.length}
            sub="Today only · live from Supabase"
            trend={0}
            icon={<ClipboardList size={18} className="text-purple-500" />}
            iconBg="bg-purple-50"
          />
        </div>

        <StatCard
          label="REFUNDED / LOST"
          format="money"
          value={stats.refunded}
          sub="Total refund value"
          trend="-8.2%"
          trendLabel="vs last month"
          icon={<RotateCcw size={18} className="text-pink-500" />}
          iconBg="bg-pink-50"
        />

        <div onClick={() => router.push("/dashboard/payments")} className="cursor-pointer">
          <StatCard
            label="IN PIPELINE"
            format="money"
            value={totals.pipelineValue}
            sub={`${periodLabel} · Partial Payment`}
            trend="-5.1%"
            trendLabel="vs last month"
            icon={<Wallet size={18} className="text-gray-400" />}
            iconBg="bg-gray-100"
          />
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-5 xl:col-span-2">
          <div className="mb-4">
            <div className="font-semibold text-brand-900">Sales Overview</div>
            <div className="text-xs text-gray-500">
              Monthly confirmed revenue · Last 12 months
              {!allBranches && ` · ${selectedBranch} only`}
            </div>
          </div>
          <SalesOverviewChart data={monthly} branches={scope} />
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <div className="mb-4">
            <div className="font-semibold text-brand-900">Inquiry Sources</div>
            <div className="text-xs text-gray-500">Where leads come from</div>
          </div>
          <InquirySourcesChart data={sources} />
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-5 xl:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div className="font-semibold text-brand-900">
              Today&apos;s Orders
              <span className="ml-2 text-xs font-normal text-gray-400">
                {todayOrders.length} events
              </span>
            </div>
            <button
              onClick={() => router.push("/dashboard/orders")}
              className="text-xs text-gold-600 hover:underline"
            >
              View all
            </button>
          </div>

          {todayOrders.length > 0 ? (
            <ScrollX>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-xs uppercase text-gray-500">
                    <th className="pb-2 text-left font-medium">Customer</th>
                    <th className="pb-2 text-left font-medium">Branch</th>
                    <th className="pb-2 text-left font-medium">Event Type</th>
                    <th className="pb-2 text-left font-medium">Pax</th>
                    <th className="pb-2 text-left font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {todayOrders.map((order) => (
                    <tr key={order.id}>
                      <td className="py-2.5">
                        <div className="text-sm font-medium text-gray-900">
                          {order.customer}
                        </div>
                      </td>
                      <td className="py-2.5">
                        <BranchBadge branch={order.branch} />
                      </td>
                      <td className="py-2.5 text-sm text-gray-700">{order.type}</td>
                      <td className="py-2.5 text-sm text-gray-700">{order.pax || "—"}</td>
                      <td className="py-2.5">
                        <StatusBadge status={order.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollX>
          ) : (
            <p className="py-6 text-center text-sm text-gray-400">
              No orders for {selectedBranch} today.
            </p>
          )}
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="font-semibold text-brand-900">New Inquiries</div>
            <span className="text-xs text-gray-400">
              {stats.recentNew.length} pending
            </span>
          </div>

          <div className="space-y-3">
            {stats.recentNew.length > 0 ? (
              stats.recentNew.map((inquiry) => (
                <div key={inquiry.id} className="flex gap-2">
                  <MessageCircle
                    size={15}
                    className="mt-0.5 flex-shrink-0 text-gold-500"
                  />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-sm font-medium text-gray-800">
                        New Inquiry — {inquiry.name}
                      </span>
                      <BranchBadge branch={inquiry.branch} />
                    </div>
                    <div className="mt-0.5 truncate text-xs leading-snug text-gray-500">
                      {inquiry.type}
                      {inquiry.date && ` · ${inquiry.date}`}
                      {inquiry.note && ` · ${inquiry.note}`}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="py-4 text-center text-sm text-gray-400">
                No new inquiries for {selectedBranch}.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <div className="mb-4">
          <div className="font-semibold text-brand-900">Booking Status Overview</div>
          <div className="text-xs text-gray-500">
            {allBranches ? "All branches" : `${selectedBranch} branch`} · {periodLabel}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {statusTiles.map((tile) => (
            <button
              key={tile.label}
              onClick={() => router.push("/dashboard/bookings")}
              className="flex items-center gap-3 rounded-lg bg-gray-50 p-3 text-left transition-colors hover:bg-gray-100"
            >
              <span
                className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                style={{ backgroundColor: tile.dot }}
              />
              <span className="min-w-0">
                <span className="block truncate font-display text-lg font-bold text-brand-900">
                  {tile.value}
                </span>
                <span className="block truncate text-xs text-gray-500">{tile.label}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
