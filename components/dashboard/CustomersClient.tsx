"use client";

import { useMemo, useState } from "react";
import { Users, Repeat, Wallet, Search } from "lucide-react";
import StatCard from "@/components/ui/StatCard";
import Badge, { BadgeTone, BranchBadge, StatusBadge } from "@/components/ui/Badge";
import DataTable, { Column } from "@/components/ui/DataTable";
import Modal from "@/components/ui/Modal";
import LiveBadge from "@/components/ui/LiveBadge";
import { useBranch } from "@/components/providers/BranchProvider";
import { useSync } from "@/components/providers/SyncProvider";
import { useMockOrderStatus } from "@/components/providers/MockOrderStatusProvider";
import { ordersInBranch } from "@/lib/mt/branches";
import { toCustomerRows } from "@/lib/orders/derived";
import type { OrderRecord } from "@/lib/orders/types";
import { Customer, formatPeso } from "@/lib/dummy-data";

const statusTone: Record<Customer["status"], BadgeTone> = {
  Active: "green",
};

function CustomerDetailModal({ customer, onClose }: { customer: Customer; onClose: () => void }) {
  const initial = customer.name.trim().charAt(0).toUpperCase() || "?";

  return (
    <Modal isOpen onClose={onClose} title="Customer Profile" size="md">
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 text-lg font-semibold text-amber-700">
            {initial}
          </div>
          <div className="min-w-0">
            <div className="truncate font-display text-base font-bold text-brand-900">{customer.name}</div>
            <div className="mt-1 flex items-center gap-1.5">
              <BranchBadge branch={customer.branch} />
              <Badge label={customer.status} tone={statusTone[customer.status]} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-gray-50 p-3 text-center">
            <div className="font-display text-lg font-bold text-brand-900">{customer.totalBookings}</div>
            <div className="mt-0.5 text-xs text-gray-500">Total Bookings</div>
          </div>
          <div className="rounded-lg bg-amber-50 p-3 text-center">
            <div className="font-display text-lg font-bold text-amber-600">{formatPeso(customer.lifetimeSpend)}</div>
            <div className="mt-0.5 text-xs text-gray-500">Total Spent</div>
          </div>
          <div className="rounded-lg bg-gray-50 p-3 text-center">
            <div className="font-display text-lg font-bold text-brand-900">{customer.lastBookingDate}</div>
            <div className="mt-0.5 text-xs text-gray-500">Last Booking</div>
          </div>
        </div>

        <div>
          <div className="mb-2 text-sm font-semibold text-brand-900">Booking History</div>
          <div className="max-h-64 space-y-2 overflow-y-auto">
            {customer.orders.map((o) => (
              <div key={o.id} className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 p-3 text-sm">
                <div className="min-w-0">
                  <div className="truncate font-semibold text-brand-900">{o.id}</div>
                  <div className="text-xs text-gray-500">{o.eventDate} · {o.eventType}</div>
                </div>
                <div className="flex-shrink-0 text-right">
                  <div className="font-semibold text-brand-900">{formatPeso(o.total)}</div>
                  <div className="mt-1"><StatusBadge status={o.paymentStatus} /></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full border-t border-gray-100 pt-3 text-center text-sm font-medium text-gray-500 hover:text-gray-700"
        >
          Close
        </button>
      </div>
    </Modal>
  );
}

export default function CustomersClient({ orders: initialOrders }: { orders: OrderRecord[] }) {
  const { selectedBranch } = useBranch();
  const { getStatus } = useMockOrderStatus();
  const { lastUpdated, loading, error, refresh } = useSync();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | Customer["status"]>("All");
  const [viewing, setViewing] = useState<Customer | null>(null);

  // Reflects a celebrity (mock) order's status if it's been moved on the
  // Kitchen board or Orders page — see MockOrderStatusProvider. No-op for
  // real orders, whose status always comes straight from Supabase.
  const orders = useMemo(() => initialOrders.map((o) => ({ ...o, status: getStatus(o) })), [initialOrders, getStatus]);

  const allCustomers = useMemo(
    () => toCustomerRows(ordersInBranch(orders, selectedBranch)),
    [orders, selectedBranch],
  );

  const customers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allCustomers.filter((c) => {
      if (statusFilter !== "All" && c.status !== statusFilter) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.contact.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q)
      );
    });
  }, [allCustomers, search, statusFilter]);

  const activeCount = allCustomers.filter((c) => c.status === "Active").length;
  const repeatCount = allCustomers.filter((c) => c.totalBookings > 1).length;
  const totalSpent = allCustomers.reduce((sum, c) => sum + c.lifetimeSpend, 0);

  const columns: Column<Customer>[] = [
    {
      key: "name",
      header: "Customer",
      render: (r) => (
        <div>
          <div className="font-medium text-brand-900">{r.name}</div>
          <div className="text-xs text-gray-400">{r.contact}</div>
        </div>
      ),
    },
    { key: "branch", header: "Branch", render: (r) => <BranchBadge branch={r.branch} /> },
    { key: "lastBookingDate", header: "Last Booking" },
    { key: "lifetimeSpend", header: "Total Spent", render: (r) => formatPeso(r.lifetimeSpend) },
    { key: "totalBookings", header: "Bookings" },
    { key: "status", header: "Status", render: (r) => <Badge label={r.status} tone={statusTone[r.status]} /> },
    {
      key: "action",
      header: "",
      render: (r) => (
        <button onClick={() => setViewing(r)} className="text-xs font-semibold text-gold-600 hover:text-gold-700">
          View
        </button>
      ),
    },
  ];

  return (
    <>
      <div className="mb-5">
        <LiveBadge lastUpdated={lastUpdated} loading={loading} error={error} onRefresh={refresh} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Customers" value={String(allCustomers.length)} icon={<Users size={18} className="text-gold-600" />} />
        <StatCard label="Active / Repeat" value={String(activeCount)} valueColor="text-emerald-600" icon={<Users size={18} className="text-gold-600" />} />
        <StatCard label="Repeat Customer" value={String(repeatCount)} valueColor="text-amber-500" icon={<Repeat size={18} className="text-gold-600" />} />
        <StatCard label="Total Spent" value={totalSpent} format="money" valueColor="text-blue-600" icon={<Wallet size={18} className="text-gold-600" />} />
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, phone…"
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-8 pr-3 text-sm text-brand-900 outline-none focus:border-gold-400"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "All" | Customer["status"])}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-brand-900 outline-none focus:border-gold-400"
        >
          <option value="All">All Statuses</option>
          <option value="Active">Active</option>
        </select>
      </div>

      <div className="mt-4">
        <DataTable columns={columns} rows={customers} />
      </div>

      {viewing && <CustomerDetailModal customer={viewing} onClose={() => setViewing(null)} />}
    </>
  );
}
