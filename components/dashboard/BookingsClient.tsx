"use client";

import { useMemo, useState } from "react";
import { CalendarDays, CalendarCheck, CalendarClock, Search, CalendarRange } from "lucide-react";
import StatCard from "@/components/ui/StatCard";
import Badge, { BadgeTone, BranchBadge } from "@/components/ui/Badge";
import DataTable, { Column } from "@/components/ui/DataTable";
import Link from "next/link";
import { useBranch } from "@/components/providers/BranchProvider";
import { useMockOrderStatus } from "@/components/providers/MockOrderStatusProvider";
import { ordersInBranch } from "@/lib/mt/branches";
import { toBookingRows } from "@/lib/orders/derived";
import type { OrderRecord } from "@/lib/orders/types";
import type { Booking } from "@/lib/dummy-data";

const statusTone: Record<Booking["status"], BadgeTone> = {
  Confirmed: "green",
  "Pending Deposit": "amber",
  Completed: "slate",
  Cancelled: "red",
};

const STATUS_FILTERS: Array<Booking["status"] | "All Statuses"> = [
  "All Statuses",
  "Confirmed",
  "Pending Deposit",
  "Completed",
  "Cancelled",
];

const columns: Column<Booking>[] = [
  { key: "id", header: "Booking #", render: (r) => <span className="font-medium text-brand-900">{r.id}</span> },
  { key: "client", header: "Client" },
  { key: "eventType", header: "Event Type" },
  { key: "date", header: "Date" },
  { key: "guests", header: "Guests" },
  { key: "branch", header: "Branch", render: (r) => <BranchBadge branch={r.branch} /> },
  { key: "venue", header: "Venue" },
  { key: "status", header: "Status", render: (r) => <Badge label={r.status} tone={statusTone[r.status]} /> },
];

export default function BookingsClient({
  orders: initialOrders,
}: {
  orders: OrderRecord[];
}) {
  const { selectedBranch } = useBranch();
  const { getStatus } = useMockOrderStatus();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>("All Statuses");

  // Reflects a celebrity (mock) order's status if it's been moved on the
  // Kitchen board or Orders page — see MockOrderStatusProvider. No-op for
  // real orders, whose status always comes straight from Supabase.
  const orders = useMemo(() => initialOrders.map((o) => ({ ...o, status: getStatus(o) })), [initialOrders, getStatus]);

  const scopedOrders = useMemo(() => ordersInBranch(orders, selectedBranch), [orders, selectedBranch]);

  const bookings = useMemo(() => toBookingRows(scopedOrders), [scopedOrders]);

  const filteredBookings = useMemo(() => {
    const q = search.trim().toLowerCase();
    return bookings.filter((b) => {
      if (statusFilter !== "All Statuses" && b.status !== statusFilter) return false;
      if (!q) return true;
      return [b.id, b.client, b.eventType, b.package, b.venue].some((v) => v.toLowerCase().includes(q));
    });
  }, [bookings, search, statusFilter]);

  const confirmed = bookings.filter((b) => b.status === "Confirmed").length;
  const pending = bookings.filter((b) => b.status === "Pending Deposit").length;

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total Bookings" value={String(bookings.length)} icon={<CalendarDays size={18} className="text-gold-600" />} />
        <StatCard label="Confirmed" value={String(confirmed)} icon={<CalendarCheck size={18} className="text-gold-600" />} />
        <StatCard label="Pending Deposit" value={String(pending)} icon={<CalendarClock size={18} className="text-gold-600" />} />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search bookings..."
            className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-slate-600 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
          {STATUS_FILTERS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <Link
          href="/dashboard/calendar"
          className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-gray-50"
        >
          <CalendarRange size={14} /> Open Catering Calendar
        </Link>
      </div>

      <div className="mt-4">
        <DataTable columns={columns} rows={filteredBookings} />
      </div>
    </>
  );
}
