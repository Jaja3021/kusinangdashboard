"use client";

import { useMemo } from "react";
import { ClipboardList, Hourglass, PackageCheck } from "lucide-react";
import StatCard from "@/components/ui/StatCard";
import DataTable, { Column } from "@/components/ui/DataTable";
import { useBranch } from "@/components/providers/BranchProvider";
import { getBranchById, ordersInBranch } from "@/lib/mt/branches";
import type { OrderRecord } from "@/lib/orders/types";
import StatusSelect from "@/app/dashboard/orders/StatusSelect";

const columns: Column<OrderRecord>[] = [
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
      {r.quantityLabel && <div className="text-xs text-gray-400">{r.quantityLabel}</div>}
    </div>
  ) },
  { key: "branch", header: "Branch", render: (r) => (r.branch && getBranchById(r.branch)?.name) || r.branch || "—" },
  { key: "eventDate", header: "Event Date", render: (r) => r.eventDate || "—" },
  { key: "status", header: "Status", render: (r) => <StatusSelect id={r.id} status={r.status} /> },
];

export default function OrdersClient({ orders }: { orders: OrderRecord[] }) {
  const { selectedBranch } = useBranch();

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
