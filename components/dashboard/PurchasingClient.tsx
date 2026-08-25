"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, PackageX, ShoppingCart, TrendingDown } from "lucide-react";
import DataTable, { type Column } from "@/components/ui/DataTable";
import Badge, { type BadgeTone } from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import StatCard from "@/components/ui/StatCard";
import { formatNumber, formatPeso } from "@/lib/format";
import { groupShortagesBySupplier, type PurchaseListRow, type PurchaseListStatus } from "@/lib/purchasing/types";

const STATUS_LABEL: Record<PurchaseListStatus, string> = {
  sufficient: "🟢 Sufficient",
  low: "🟡 Low Stock",
  insufficient: "🔴 Insufficient",
  out: "⚫ Out of Stock",
};

const STATUS_TONE: Record<PurchaseListStatus, BadgeTone> = {
  sufficient: "green",
  low: "amber",
  insufficient: "red",
  out: "slate",
};

function qty(n: number, unit: string): string {
  const rounded = Math.round(n * 100) / 100;
  return `${formatNumber(rounded)} ${unit}`;
}

export default function PurchasingClient({ rows }: { rows: PurchaseListRow[] }) {
  const [detailRow, setDetailRow] = useState<PurchaseListRow | null>(null);
  const [listModal, setListModal] = useState(false);

  const stats = useMemo(() => {
    const shortageRows = rows.filter((r) => r.shortageQty > 0);
    const totalCost = shortageRows.reduce((sum, r) => sum + r.estimatedCost, 0);
    const outOfStock = rows.filter((r) => r.status === "out").length;
    return { needed: rows.length, shortages: shortageRows.length, totalCost, outOfStock };
  }, [rows]);

  const supplierGroups = useMemo(() => groupShortagesBySupplier(rows), [rows]);

  const columns: Column<PurchaseListRow>[] = [
    {
      key: "ingredient",
      header: "Ingredient",
      render: (r) => (
        <button onClick={() => setDetailRow(r)} className="text-left font-medium text-brand-900 hover:text-gold-600">
          {r.ingredientName}
          <span className="ml-2 text-xs font-normal text-gray-400">{r.category}</span>
        </button>
      ),
    },
    { key: "required", header: "Required", className: "text-right", render: (r) => qty(r.requiredQty, r.baseUnit) },
    { key: "available", header: "Available", className: "text-right", render: (r) => qty(r.physicalStock, r.baseUnit) },
    {
      key: "shortage",
      header: "Shortage",
      className: "text-right",
      render: (r) => (r.shortageQty > 0 ? <span className="font-semibold text-red-600">{qty(r.shortageQty, r.baseUnit)}</span> : "—"),
    },
    {
      key: "purchase",
      header: "Recommended Purchase",
      className: "text-right",
      render: (r) => (r.recommendedPurchase > 0 ? qty(r.recommendedPurchase, r.baseUnit) : "—"),
    },
    { key: "supplier", header: "Supplier", render: (r) => r.supplierName ?? <span className="text-amber-600">Unassigned</span> },
    {
      key: "cost",
      header: "Est. Cost",
      className: "text-right",
      render: (r) => (r.estimatedCost > 0 ? formatPeso(r.estimatedCost) : "—"),
    },
    {
      key: "status",
      header: "Status",
      render: (r) => <Badge label={STATUS_LABEL[r.status]} tone={STATUS_TONE[r.status]} />,
    },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Ingredients Needed" value={stats.needed} icon={<ShoppingCart size={18} className="text-gold-600" />} />
        <StatCard label="Shortage Items" value={stats.shortages} icon={<TrendingDown size={18} className="text-red-500" />} valueColor={stats.shortages > 0 ? "text-red-600" : undefined} />
        <StatCard label="Out of Stock" value={stats.outOfStock} icon={<PackageX size={18} className="text-gray-500" />} />
        <StatCard label="Est. Purchase Cost" value={stats.totalCost} format="money" icon={<AlertTriangle size={18} className="text-amber-500" />} />
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {rows.length === 0
            ? "No confirmed upcoming events currently reserve any ingredient."
            : `${rows.length} ingredient${rows.length === 1 ? "" : "s"} needed for confirmed upcoming events.`}
        </p>
        <button
          onClick={() => setListModal(true)}
          disabled={stats.shortages === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-gold-500 px-4 py-2 text-sm font-semibold text-white hover:bg-gold-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ShoppingCart size={16} /> Create Purchase List
        </button>
      </div>

      {rows.length > 0 ? (
        <DataTable columns={columns} rows={rows} />
      ) : (
        <div className="rounded-lg border border-dashed border-gray-200 bg-white p-10 text-center text-sm text-gray-400">
          Nothing here yet — this fills in automatically once an order reaches Confirmed status.
        </div>
      )}

      {/* Ingredient detail — why is this reserved */}
      <Modal isOpen={detailRow !== null} onClose={() => setDetailRow(null)} title={detailRow?.ingredientName} size="md">
        {detailRow && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border border-gray-200 p-3">
                <div className="text-xs text-gray-500">Current Stock</div>
                <div className="mt-1 font-semibold text-brand-900">{qty(detailRow.physicalStock, detailRow.baseUnit)}</div>
              </div>
              <div className="rounded-lg border border-gray-200 p-3">
                <div className="text-xs text-gray-500">Required (Reserved)</div>
                <div className="mt-1 font-semibold text-brand-900">{qty(detailRow.requiredQty, detailRow.baseUnit)}</div>
              </div>
              <div className="rounded-lg border border-gray-200 p-3">
                <div className="text-xs text-gray-500">Minimum Stock</div>
                <div className="mt-1 font-semibold text-brand-900">{qty(detailRow.reorderLevel, detailRow.baseUnit)}</div>
              </div>
              <div className="rounded-lg border border-gray-200 p-3">
                <div className="text-xs text-gray-500">Supplier</div>
                <div className="mt-1 font-semibold text-brand-900">{detailRow.supplierName ?? "Unassigned"}</div>
              </div>
            </div>

            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Upcoming Requirements</div>
              <div className="divide-y divide-gray-100 rounded-lg border border-gray-200">
                {detailRow.sources.length === 0 && <div className="p-3 text-sm text-gray-400">No confirmed event currently needs this ingredient.</div>}
                {detailRow.sources.map((s) => (
                  <div key={`${s.orderId}-${s.branch}`} className="flex items-center justify-between p-3 text-sm">
                    <div>
                      <div className="font-medium text-brand-900">{s.orderNumber}</div>
                      <div className="text-xs text-gray-500">{s.eventDate ?? "No date"} · {s.branch}</div>
                    </div>
                    <div className="font-medium text-brand-900">{qty(s.qty, detailRow.baseUnit)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Create Purchase List — grouped by supplier preview */}
      <Modal isOpen={listModal} onClose={() => setListModal(false)} title="Purchase List by Supplier" size="2xl">
        <div className="space-y-4">
          {supplierGroups.map((group) => (
            <div key={group.supplierId ?? "none"} className="rounded-lg border border-gray-200">
              <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-4 py-2.5">
                <span className="text-sm font-semibold text-brand-900">{group.supplierName}</span>
                <span className="text-sm font-medium text-gold-600">{formatPeso(group.totalCost)}</span>
              </div>
              <div className="divide-y divide-gray-50">
                {group.rows.map((row) => (
                  <div key={row.id} className="flex items-center justify-between px-4 py-2 text-sm">
                    <span className="text-brand-900">{row.ingredientName}</span>
                    <span className="text-gray-500">
                      {qty(row.recommendedPurchase, row.baseUnit)} · {formatPeso(row.estimatedCost)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <p className="text-xs text-gray-400">
            This groups the current shortage by preferred supplier — creating an actual sendable Purchase Order comes next.
          </p>
        </div>
      </Modal>
    </div>
  );
}
