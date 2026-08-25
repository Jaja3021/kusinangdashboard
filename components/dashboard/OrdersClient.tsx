"use client";

import { useMemo } from "react";
import { ClipboardList, Hourglass, PackageCheck } from "lucide-react";
import StatCard from "@/components/ui/StatCard";
import DataTable, { Column } from "@/components/ui/DataTable";
import { useBranch } from "@/components/providers/BranchProvider";
import { useMockOrderStatus } from "@/components/providers/MockOrderStatusProvider";
import { getBranchById, ordersInBranch } from "@/lib/mt/branches";
import { ORDER_STATUSES, type OrderRecord, type OrderStatus } from "@/lib/orders/types";
import { isMockOrder } from "@/lib/orders/mock-celebrity-orders";
import StatusSelect from "@/app/dashboard/orders/StatusSelect";

export default function OrdersClient({ orders: initialOrders }: { orders: OrderRecord[] }) {
  const { selectedBranch } = useBranch();
  const { getStatus, setStatus } = useMockOrderStatus();

  // Mock (celebrity) orders aren't in Supabase, so their status can't go
  // through the real updateOrderStatusAction — a status change there would
  // affect zero rows, then the next revalidatePath() would snap the row back
  // to its seeded status. Their status is tracked in the shared
  // MockOrderStatusProvider instead (same override the Kitchen board reads
  // and writes), so a drag in Kitchen shows up here too. Real orders keep
  // using <StatusSelect>, which still hits Supabase as normal.
  const orders = useMemo(
    () => initialOrders.map((o) => (isMockOrder(o) ? { ...o, status: getStatus(o) } : o)),
    [initialOrders, getStatus],
  );

  const columns: Column<OrderRecord>[] = useMemo(
    () => [
      { key: "orderNumber", header: "Order #", render: (r) => <span className="font-mono text-xs font-medium text-brand-900">{r.orderNumber}</span> },
      { key: "client", header: "Client", render: (r) => (
        <div>
          <div className="font-medium text-brand-900">{r.firstName} {r.lastName}</div>
          <div className="text-xs text-gray-400">{r.email}</div>
        </div>
      ) },
      { key: "packageName", header: "Package", render: (r) => (
        <div>
          <div>{r.packageName}</div>
          {(r.packageGroup || r.quantityLabel) && (
            <div className="text-xs text-gray-400">
              {r.packageGroup && r.quantityLabel
                ? `${r.packageGroup} · ${r.quantityLabel}`
                : r.packageGroup || r.quantityLabel}
            </div>
          )}
        </div>
      ) },
      { key: "branch", header: "Branch", render: (r) => (r.branch && getBranchById(r.branch)?.name) || r.branch || "—" },
      { key: "eventDate", header: "Event Date", render: (r) => r.eventDate || "—" },
      {
        key: "status",
        header: "Status",
        render: (r) =>
          isMockOrder(r) ? (
            <select
              value={r.status}
              onChange={(e) => setStatus(r.id, e.target.value as OrderStatus)}
              className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-medium text-gray-700 outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-500/20"
            >
              {ORDER_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          ) : (
            <StatusSelect id={r.id} status={r.status} />
          ),
      },
    ],
    [setStatus],
  );

  const scoped = useMemo(() => ordersInBranch(orders, selectedBranch), [orders, selectedBranch]);

  const pending = scoped.filter((o) => o.status === "Pending Confirmation").length;
  const preparing = scoped.filter((o) => o.status === "Preparing").length;
  const completed = scoped.filter((o) => o.status === "Completed").length;

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Pending Confirmation" value={String(pending)} icon={<Hourglass size={18} className="text-gold-600" />} />
        <StatCard label="Preparing" value={String(preparing)} icon={<ClipboardList size={18} className="text-gold-600" />} />
        <StatCard label="Completed" value={String(completed)} icon={<PackageCheck size={18} className="text-gold-600" />} />
      </div>
      <div className="mt-6">
        {scoped.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-200 p-8 text-center text-sm text-gray-400">
            No orders yet.
          </p>
        ) : (
          <DataTable columns={columns} rows={scoped} />
        )}
      </div>
    </>
  );
}
