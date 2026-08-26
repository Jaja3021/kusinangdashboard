"use client";

import { useMemo, useState } from "react";
import { MessageCircle, CheckCircle2, XCircle, TrendingUp, Search } from "lucide-react";
import StatCard from "@/components/ui/StatCard";
import Badge, { BadgeTone, BranchBadge } from "@/components/ui/Badge";
import DataTable, { Column } from "@/components/ui/DataTable";
import LiveBadge from "@/components/ui/LiveBadge";
import { useBranch } from "@/components/providers/BranchProvider";
import { useSync } from "@/components/providers/SyncProvider";
import { useMockOrderStatus } from "@/components/providers/MockOrderStatusProvider";
import { ordersInBranch } from "@/lib/mt/branches";
import { toInquiryRows } from "@/lib/orders/derived";
import type { OrderRecord } from "@/lib/orders/types";
import { formatPeso, type Inquiry } from "@/lib/dummy-data";

const STATUS_FILTERS: Array<Inquiry["status"] | "All Statuses"> = [
  "All Statuses",
  "New",
  "In Progress",
  "Converted",
  "Lost",
];

const statusTone: Record<Inquiry["status"], BadgeTone> = {
  New: "blue",
  "In Progress": "amber",
  Converted: "green",
  Lost: "slate",
};

const columns: Column<Inquiry>[] = [
  {
    key: "name",
    header: "Lead",
    render: (r) => (
      <div>
        <div className="font-medium text-brand-900">{r.name}</div>
        {r.phone && <div className="text-xs text-gray-400">{r.phone}</div>}
      </div>
    ),
  },
  { key: "branch", header: "Branch", render: (r) => <BranchBadge branch={r.branch} /> },
  { key: "eventType", header: "Event Type" },
  { key: "eventDate", header: "Event Date" },
  { key: "guests", header: "PAX" },
  { key: "status", header: "Status", render: (r) => <Badge label={r.status} tone={statusTone[r.status]} /> },
  { key: "amount", header: "Amount", render: (r) => formatPeso(r.amount) },
  { key: "receivedAt", header: "Received" },
];

export default function InquiriesClient({ orders: initialOrders }: { orders: OrderRecord[] }) {
  const { selectedBranch } = useBranch();
  const { getStatus } = useMockOrderStatus();
  const { lastUpdated, loading, error, refresh } = useSync();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>("All Statuses");

  // Reflects a celebrity (mock) order's status if it's been moved on the
  // Kitchen board or Orders page — see MockOrderStatusProvider. No-op for
  // real orders, whose status always comes straight from Supabase.
  const orders = useMemo(() => initialOrders.map((o) => ({ ...o, status: getStatus(o) })), [initialOrders, getStatus]);

  const allInquiries = useMemo(
    () => toInquiryRows(ordersInBranch(orders, selectedBranch)),
    [orders, selectedBranch],
  );

  const inquiries = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allInquiries.filter((i) => {
      if (statusFilter !== "All Statuses" && i.status !== statusFilter) return false;
      if (!q) return true;
      return (
        i.name.toLowerCase().includes(q) ||
        i.eventType.toLowerCase().includes(q) ||
        i.email.toLowerCase().includes(q)
      );
    });
  }, [allInquiries, search, statusFilter]);

  const bookedCount = allInquiries.filter((i) => i.status === "Converted").length;
  const lostCount = allInquiries.filter((i) => i.status === "Lost").length;
  const conversionRate = allInquiries.length === 0 ? 0 : (bookedCount / allInquiries.length) * 100;

  return (
    <>
      <div className="mb-5">
        <LiveBadge lastUpdated={lastUpdated} loading={loading} error={error} onRefresh={refresh} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Inquiries" value={String(allInquiries.length)} icon={<MessageCircle size={18} className="text-gold-600" />} />
        <StatCard label="Booked" value={String(bookedCount)} valueColor="text-emerald-600" icon={<CheckCircle2 size={18} className="text-gold-600" />} />
        <StatCard label="Lost" value={String(lostCount)} valueColor="text-red-500" icon={<XCircle size={18} className="text-gold-600" />} />
        <StatCard label="Conversion Rate" value={`${conversionRate.toFixed(1)}%`} valueColor="text-red-500" icon={<TrendingUp size={18} className="text-gold-600" />} />
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, event type, email…"
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-8 pr-3 text-sm text-brand-900 outline-none focus:border-gold-400"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as (typeof STATUS_FILTERS)[number])}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-brand-900 outline-none focus:border-gold-400"
        >
          {STATUS_FILTERS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="mt-4">
        <DataTable columns={columns} rows={inquiries} />
      </div>
    </>
  );
}
