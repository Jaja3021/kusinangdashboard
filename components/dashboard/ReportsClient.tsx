"use client";

import { useMemo, useState } from "react";
import { Download, Eye, FileText } from "lucide-react";
import DataTable, { Column } from "@/components/ui/DataTable";
import Modal from "@/components/ui/Modal";
import PageHeader from "@/components/ui/PageHeader";
import { downloadCsv, toCsv, type CsvColumn } from "@/lib/csv";
import { formatPeso } from "@/lib/format";
import { useBranch } from "@/components/providers/BranchProvider";
import { useDateRange } from "@/components/providers/DateRangeProvider";
import { ALL_BRANCHES, BRANCHES } from "@/lib/mt/branches";
import { inRange } from "@/lib/mt/dates";
import { toBookingRows, toCustomerRows, toInquiryRows } from "@/lib/orders/derived";
import { branchTotals, buildMonthlySeries } from "@/lib/reports/monthly";
import type { OrderRecord } from "@/lib/orders/types";

type ReportDef<Row extends { id: string }> = {
  id: string;
  name: string;
  description: string;
  periodLabel: "This year" | "All time";
  rows: Row[];
  tableColumns: Column<Row>[];
  csvColumns: CsvColumn<Row>[];
};

function branchScoped(orders: OrderRecord[], selectedBranch: string): OrderRecord[] {
  if (selectedBranch === ALL_BRANCHES) return orders;
  const match = BRANCHES.find((b) => b.name === selectedBranch);
  return match ? orders.filter((o) => o.branch === match.id) : orders;
}

export default function ReportsClient({ orders }: { orders: OrderRecord[] }) {
  const { selectedBranch, scope } = useBranch();
  const { range, label: periodLabel } = useDateRange();
  const [openReportId, setOpenReportId] = useState<string | null>(null);

  const allTimeOrders = branchScoped(orders, selectedBranch);
  const periodOrders = allTimeOrders.filter((o) => inRange(o.eventDate || o.createdAt.slice(0, 10), range));

  const bookingReport = useMemo(
    () => toBookingRows(allTimeOrders).map((r) => ({ ...r, id: r.id })),
    [allTimeOrders],
  );
  const customerReport = useMemo(() => toCustomerRows(allTimeOrders), [allTimeOrders]);
  const inquiryReport = useMemo(() => toInquiryRows(periodOrders), [periodOrders]);

  const monthlySales = useMemo(() => {
    const series = buildMonthlySeries(periodOrders, scope);
    return series.flatMap((point) =>
      scope.map((b) => ({
        id: `${point.monthKey}-${b.id}`,
        month: point.month,
        branch: b.name,
        revenue: Number(point[b.name] ?? 0),
      })),
    );
  }, [periodOrders, scope]);

  const branchComparison = useMemo(
    () => BRANCHES.map((b) => ({ id: b.id, ...branchTotals(periodOrders, b, range) })),
    [periodOrders, range],
  );

  const serviceType = useMemo(() => {
    const groups = new Map<string, { orders: number; revenue: number }>();
    for (const o of periodOrders) {
      if (o.status === "Cancelled") continue;
      const key = o.packageName || "Unspecified";
      const g = groups.get(key) ?? { orders: 0, revenue: 0 };
      g.orders += 1;
      g.revenue += o.total;
      groups.set(key, g);
    }
    return [...groups.entries()]
      .map(([packageName, g]) => ({ id: packageName, packageName, ...g }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [periodOrders]);

  const reports: ReportDef<any>[] = [
    {
      id: "monthly-sales",
      name: "Monthly Sales Report",
      description: "Revenue breakdown by branch and month.",
      periodLabel: "This year",
      rows: monthlySales,
      tableColumns: [
        { key: "month", header: "Month" },
        { key: "branch", header: "Branch" },
        { key: "revenue", header: "Revenue", render: (r) => formatPeso(r.revenue) },
      ],
      csvColumns: [
        { key: "month", header: "Month" },
        { key: "branch", header: "Branch" },
        { key: "revenue", header: "Revenue" },
      ],
    },
    {
      id: "branch-comparison",
      name: "Branch Comparison",
      description: "Performance side by side across every branch.",
      periodLabel: "This year",
      rows: branchComparison,
      tableColumns: [
        { key: "branch", header: "Branch", render: (r) => r.branch.name },
        { key: "totalRevenue", header: "Revenue", render: (r) => formatPeso(r.totalRevenue) },
        { key: "totalBookings", header: "Bookings" },
        { key: "totalInquiries", header: "Inquiries" },
        { key: "conversionRate", header: "Conversion", render: (r) => `${r.conversionRate}%` },
        { key: "lostCancelled", header: "Lost/Cancelled", render: (r) => formatPeso(r.lostCancelled) },
        { key: "pendingPayments", header: "Pending", render: (r) => formatPeso(r.pendingPayments) },
      ],
      csvColumns: [
        { key: "branch", header: "Branch", value: (r) => r.branch.name },
        { key: "totalRevenue", header: "Revenue" },
        { key: "totalBookings", header: "Bookings" },
        { key: "totalInquiries", header: "Inquiries" },
        { key: "conversionRate", header: "Conversion %" },
        { key: "lostCancelled", header: "Lost/Cancelled" },
        { key: "pendingPayments", header: "Pending" },
      ],
    },
    {
      id: "booking-report",
      name: "Booking Report",
      description: "Every booking with payment state and event details.",
      periodLabel: "All time",
      rows: bookingReport,
      tableColumns: [
        { key: "id", header: "Booking #" },
        { key: "client", header: "Client" },
        { key: "eventType", header: "Event Type" },
        { key: "date", header: "Date" },
        { key: "branch", header: "Branch" },
        { key: "venue", header: "Venue" },
        { key: "status", header: "Status" },
      ],
      csvColumns: [
        { key: "id", header: "Booking #" },
        { key: "client", header: "Client" },
        { key: "eventType", header: "Event Type" },
        { key: "date", header: "Date" },
        { key: "branch", header: "Branch" },
        { key: "venue", header: "Venue" },
        { key: "status", header: "Status" },
      ],
    },
    {
      id: "customer-report",
      name: "Customer Report",
      description: "Everyone who has ordered, with spend and order counts.",
      periodLabel: "All time",
      rows: customerReport,
      tableColumns: [
        { key: "name", header: "Name" },
        { key: "contact", header: "Contact" },
        { key: "totalBookings", header: "Bookings" },
        { key: "lifetimeSpend", header: "Lifetime Spend", render: (r) => formatPeso(r.lifetimeSpend) },
        { key: "tier", header: "Tier" },
      ],
      csvColumns: [
        { key: "name", header: "Name" },
        { key: "contact", header: "Contact" },
        { key: "totalBookings", header: "Bookings" },
        { key: "lifetimeSpend", header: "Lifetime Spend" },
        { key: "tier", header: "Tier" },
      ],
    },
    {
      id: "service-type",
      name: "Service Type Report",
      description: "How each package performs.",
      periodLabel: "This year",
      rows: serviceType,
      tableColumns: [
        { key: "packageName", header: "Package" },
        { key: "orders", header: "Orders" },
        { key: "revenue", header: "Revenue", render: (r) => formatPeso(r.revenue) },
      ],
      csvColumns: [
        { key: "packageName", header: "Package" },
        { key: "orders", header: "Orders" },
        { key: "revenue", header: "Revenue" },
      ],
    },
    {
      id: "new-inquiry",
      name: "New Inquiry Report",
      description: "Inquiries still waiting on follow-up or confirmation.",
      periodLabel: "This year",
      rows: inquiryReport.filter((r) => r.status === "New"),
      tableColumns: [
        { key: "id", header: "Ref" },
        { key: "name", header: "Name" },
        { key: "eventType", header: "Event Type" },
        { key: "eventDate", header: "Event Date" },
        { key: "phone", header: "Phone" },
        { key: "receivedAt", header: "Received" },
      ],
      csvColumns: [
        { key: "id", header: "Ref" },
        { key: "name", header: "Name" },
        { key: "eventType", header: "Event Type" },
        { key: "eventDate", header: "Event Date" },
        { key: "phone", header: "Phone" },
        { key: "receivedAt", header: "Received" },
      ],
    },
  ];

  const openReport = reports.find((r) => r.id === openReportId);

  return (
    <div>
      <PageHeader title="Reports" subtitle="Standardised reports, downloadable as CSV for Excel." />
      <p className="mb-4 text-xs text-gray-400">
        Period: <span className="font-medium text-gray-600">{periodLabel}</span> · Branch:{" "}
        <span className="font-medium text-gray-600">{selectedBranch}</span> — set both in the top bar. All-time reports ignore the period.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {reports.map((r) => (
          <div key={r.id} className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="mb-3 flex items-start gap-3">
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-gold-500/10 text-gold-600">
                <FileText size={16} />
              </span>
              <div className="min-w-0">
                <p className="font-medium text-brand-900">{r.name}</p>
                <p className="text-xs text-gray-500">{r.description}</p>
                <p className="mt-0.5 text-[11px] text-gray-400">{r.periodLabel}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setOpenReportId(r.id)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
              >
                <Eye size={13} /> View
              </button>
              <button
                onClick={() => downloadCsv(`${r.id}.csv`, toCsv(r.rows, r.csvColumns))}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-gold-500 py-1.5 text-xs font-semibold text-white hover:bg-gold-600"
              >
                <Download size={13} /> CSV
              </button>
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={!!openReport} onClose={() => setOpenReportId(null)} title={openReport?.name} size="2xl">
        {openReport && openReport.rows.length > 0 ? (
          <DataTable columns={openReport.tableColumns} rows={openReport.rows} />
        ) : (
          <p className="py-6 text-center text-sm text-gray-400">No data for this report yet.</p>
        )}
      </Modal>
    </div>
  );
}
