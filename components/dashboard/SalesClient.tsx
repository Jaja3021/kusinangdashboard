"use client";

import { useMemo } from "react";
import { TrendingUp, Wallet, MessageCircle, XCircle, Package } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import DataTable, { Column } from "@/components/ui/DataTable";
import Badge, { BadgeTone, BranchBadge } from "@/components/ui/Badge";
import SalesOverviewChart from "@/components/charts/SalesOverviewChart";
import BranchMetricsBarChart, { type BranchMetricPoint } from "@/components/charts/BranchMetricsBarChart";
import { useBranch } from "@/components/providers/BranchProvider";
import { useDateRange } from "@/components/providers/DateRangeProvider";
import { formatPeso } from "@/lib/format";
import { ordersInBranch, getBranchById } from "@/lib/mt/branches";
import { inRange } from "@/lib/mt/dates";
import { branchTotals, buildMonthlySeries, salesKpis, topPackagesByOrders } from "@/lib/reports/monthly";
import type { OrderRecord } from "@/lib/orders/types";
import type { PaymentQueueRow, OrderPaymentStatus } from "@/lib/payments/types";

const PAYMENT_STATUS_TONE: Record<OrderPaymentStatus, BadgeTone> = {
  Unpaid: "slate",
  "Awaiting Verification": "amber",
  "Partially Paid": "amber",
  "Deposit Paid": "blue",
  Paid: "green",
};

type PackageRow = { id: string; packageName: string; orders: number; revenue: number };

const packageColumns: Column<PackageRow>[] = [
  { key: "packageName", header: "Package", render: (r) => <span className="font-medium text-brand-900">{r.packageName}</span> },
  { key: "orders", header: "Orders" },
  { key: "revenue", header: "Total Revenue", render: (r) => formatPeso(r.revenue) },
  {
    key: "avg",
    header: "Avg Price / Order",
    render: (r) => formatPeso(r.orders > 0 ? Math.round(r.revenue / r.orders) : 0),
  },
];

type PaymentRow = PaymentQueueRow;

const paymentColumns: Column<PaymentRow>[] = [
  { key: "customerName", header: "Customer", render: (r) => <span className="font-medium text-brand-900">{r.customerName}</span> },
  { key: "branch", header: "Branch", render: (r) => <BranchBadge branch={r.branch ? getBranchById(r.branch)?.name : undefined} /> },
  { key: "amount", header: "Amount", render: (r) => formatPeso(r.amount) },
  {
    key: "orderPaymentStatus",
    header: "Payment Stage",
    render: (r) => <Badge label={r.orderPaymentStatus} tone={PAYMENT_STATUS_TONE[r.orderPaymentStatus]} />,
  },
  { key: "eventDate", header: "Event Date", render: (r) => r.eventDate || "—" },
  { key: "orderNumber", header: "Order #", render: (r) => <span className="font-mono text-xs">{r.orderNumber}</span> },
];

export default function SalesClient({ orders, payments }: { orders: OrderRecord[]; payments: PaymentQueueRow[] }) {
  const { selectedBranch, scope } = useBranch();
  const { range, label: periodLabel } = useDateRange();

  const scopedOrders = useMemo(() => ordersInBranch(orders, selectedBranch), [orders, selectedBranch]);
  const periodOrders = useMemo(
    () => scopedOrders.filter((o) => inRange(o.eventDate || o.createdAt.slice(0, 10), range)),
    [scopedOrders, range],
  );

  const scopedPayments = useMemo(() => ordersInBranch(payments, selectedBranch), [payments, selectedBranch]);
  const periodPayments = useMemo(
    () => scopedPayments.filter((p) => inRange(p.eventDate || p.createdAt.slice(0, 10), range)),
    [scopedPayments, range],
  );

  const kpis = useMemo(() => salesKpis(periodOrders, periodPayments), [periodOrders, periodPayments]);

  const branchCards = useMemo(() => scope.map((b) => branchTotals(orders, b, range)), [orders, scope, range]);

  const monthly = useMemo(() => buildMonthlySeries(orders, scope), [orders, scope]);

  const comparisonData: BranchMetricPoint[] = useMemo(() => {
    const defs: { label: string; key: "totalRevenue" | "totalBookings" | "pendingPayments" }[] = [
      { label: "Revenue", key: "totalRevenue" },
      { label: "Bookings", key: "totalBookings" },
      { label: "Pending", key: "pendingPayments" },
    ];
    return defs.map((d) => {
      const point: BranchMetricPoint = { metric: d.label };
      for (const t of branchCards) point[t.branch.name] = t[d.key];
      return point;
    });
  }, [branchCards]);

  const topPackages: PackageRow[] = useMemo(
    () =>
      topPackagesByOrders(periodOrders)
        .sort((a, b) => b.orders - a.orders)
        .slice(0, 8)
        .map((p) => ({ id: p.packageName, ...p })),
    [periodOrders],
  );

  const recentPayments: PaymentRow[] = useMemo(() => scopedPayments.slice(0, 8), [scopedPayments]);

  const branchSuffix = scope.length === 1 ? scope[0].name : "All branches";

  return (
    <div>
      <PageHeader title="Sales" subtitle={`Revenue analytics · ${branchSuffix}`} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Confirmed Revenue"
          format="money"
          value={kpis.confirmedRevenue}
          sub={periodLabel}
          icon={<TrendingUp size={18} className="text-gold-600" />}
          iconBg="bg-gold-500/10"
          valueColor="text-gold-600"
          tone="gold"
        />
        <StatCard
          label="In Pipeline (Partial Payment)"
          format="money"
          value={kpis.pipelineValue}
          sub={periodLabel}
          icon={<Wallet size={18} className="text-blue-500" />}
          iconBg="bg-blue-50"
          valueColor="text-blue-600"
          tone="blue"
        />
        <StatCard
          label="New Inquiries Value"
          format="money"
          value={kpis.newInquiryValue}
          sub={periodLabel}
          icon={<MessageCircle size={18} className="text-purple-500" />}
          iconBg="bg-purple-50"
          valueColor="text-purple-600"
          tone="purple"
        />
        <StatCard
          label="Lost / Cancelled"
          format="money"
          value={kpis.lostCancelled}
          sub={periodLabel}
          icon={<XCircle size={18} className="text-red-500" />}
          iconBg="bg-red-50"
          valueColor="text-red-600"
          tone="red"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {branchCards.map((t) => (
          <div key={t.branch.id} className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="mb-3 flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${t.branch.dot}`} />
              <h3 className="font-display text-base font-semibold text-brand-900">{t.branch.name} Branch</h3>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
              <div>
                <p className="text-gray-500">Revenue</p>
                <p className="font-semibold text-gold-700">{formatPeso(t.totalRevenue)}</p>
              </div>
              <div>
                <p className="text-gray-500">Bookings</p>
                <p className="font-semibold text-brand-900">{t.totalBookings}</p>
              </div>
              <div>
                <p className="text-gray-500">Conversion</p>
                <p className="font-semibold text-brand-900">{t.conversionRate}%</p>
              </div>
              <div>
                <p className="text-gray-500">Pending</p>
                <p className="font-semibold text-brand-900">{formatPeso(t.pendingPayments)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="mb-1 font-display text-base font-semibold text-brand-900">Monthly Revenue Trend</h2>
          <p className="mb-4 text-xs text-gray-400">Last 3 months · by branch · nationwide, not the selected period</p>
          <SalesOverviewChart data={monthly} branches={scope} />
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="mb-1 font-display text-base font-semibold text-brand-900">Branch Comparison</h2>
          <p className="mb-4 text-xs text-gray-400">Key metrics side by side · {periodLabel}</p>
          <BranchMetricsBarChart data={comparisonData} branches={scope} />
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-5">
        <div className="mb-4 flex items-center gap-2">
          <Package size={16} className="text-gold-600" />
          <div>
            <h2 className="font-display text-base font-semibold text-brand-900">Top Packages by Orders</h2>
            <p className="text-xs text-gray-400">{periodLabel} · all branches in scope</p>
          </div>
        </div>
        {topPackages.length > 0 ? (
          <DataTable columns={packageColumns} rows={topPackages} />
        ) : (
          <p className="py-6 text-center text-sm text-gray-400">No booked packages yet for this period.</p>
        )}
      </div>

      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-5">
        <div className="mb-4">
          <h2 className="font-display text-base font-semibold text-brand-900">Recent Payments</h2>
          <p className="text-xs text-gray-400">{recentPayments.length} most recent · {branchSuffix}</p>
        </div>
        {recentPayments.length > 0 ? (
          <DataTable columns={paymentColumns} rows={recentPayments} />
        ) : (
          <p className="py-6 text-center text-sm text-gray-400">No payments recorded yet.</p>
        )}
      </div>
    </div>
  );
}
