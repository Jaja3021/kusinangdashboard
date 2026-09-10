"use client";

import { useEffect, useState } from "react";
import { Printer, X } from "lucide-react";
import { getOrderSlipAction, getPackageMenuItemsAction, type PackageMenuItems } from "@/app/dashboard/orders/actions";
import { getBranchById } from "@/lib/mt/branches";
import type { OrderSlip } from "@/lib/orders/slip";
import type { OrderRecord } from "@/lib/orders/types";
import { formatPeso } from "@/lib/format";

const DATE_FORMAT = new Intl.DateTimeFormat("en-PH", {
  timeZone: "Asia/Manila",
  year: "numeric",
  month: "short",
  day: "numeric",
});

function formatEventDate(value: string | null): string {
  if (!value) return "—";
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? value : DATE_FORMAT.format(d);
}

/** One label/value line with a dotted rule filling the gap — mimics a
 * paper form field rather than a plain key-value row. */
function FormLine({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-2 border-b border-dotted border-gray-300 py-1.5 text-sm">
      <span className="flex-shrink-0 text-gray-500">{label}:</span>
      <span className="min-w-0 flex-1 truncate text-right font-medium text-brand-900">{value ?? "—"}</span>
    </div>
  );
}

/** One order's package line plus its itemized dishes — the table body unit
 * repeated once per package in the checkout. Falls back to the package's
 * own menu when there's no itemized cart to draw from — a mock/demo order,
 * or a pax-tiered checkout that never left a dish-level snapshot. That
 * fallback is either the actual combo dishes for the order's pax tier
 * (Handaan-style pax-tiered packages — shown as a plain dish list, same as
 * a real cart) or, when there's no pax-tiered menu to match, the package's
 * plain Inclusions text (Grazing/head-count packages — shown as chips). */
function PackageRows({
  order,
  slip,
  menuItems,
}: {
  order: OrderRecord;
  slip: OrderSlip | null | undefined;
  menuItems: PackageMenuItems | undefined;
}) {
  const dishes = slip?.dishes ?? [];
  const loading = slip === undefined || (dishes.length === 0 && menuItems === undefined);
  const fallback = dishes.length === 0 ? menuItems : undefined;

  return (
    <>
      <tr className="bg-gold-500/10">
        <td className="border-b border-gray-200 px-3 py-2 align-top font-semibold text-brand-900">
          {order.quantityLabel || "1"}
        </td>
        <td className="border-b border-gray-200 px-3 py-2 align-top font-semibold text-brand-900">
          {order.packageName}
          {order.pax ? <span className="font-normal text-gray-500"> · {order.pax} pax</span> : null}
        </td>
        <td className="border-b border-gray-200 px-3 py-2 text-right align-top font-semibold text-brand-900">
          {formatPeso(order.total)}
        </td>
      </tr>
      {loading ? (
        <tr>
          <td colSpan={3} className="border-b border-gray-100 px-3 py-2 text-center text-xs text-gray-400">
            Loading particulars…
          </td>
        </tr>
      ) : dishes.length > 0 ? (
        dishes.map((d, i) => (
          <tr key={`${order.id}-${i}`}>
            <td className="border-b border-gray-100 px-3 py-1.5" />
            <td className="border-b border-gray-100 px-3 py-1.5 pl-6 text-slate-600">
              {d.qty} — {d.name}
            </td>
            <td className="border-b border-gray-100 px-3 py-1.5" />
          </tr>
        ))
      ) : fallback && fallback.items.length > 0 ? (
        <>
          {fallback.comboName && (
            <tr>
              <td className="px-3 pl-6 pt-2 text-xs italic text-gray-400" colSpan={3}>
                {fallback.comboName}
              </td>
            </tr>
          )}
          {fallback.items.map((name, i) => (
            <tr key={`${order.id}-menu-${i}`}>
              <td className="border-b border-gray-100 px-3 py-1.5" />
              <td className="border-b border-gray-100 px-3 py-1.5 pl-6 text-slate-600">— {name}</td>
              <td className="border-b border-gray-100 px-3 py-1.5" />
            </tr>
          ))}
        </>
      ) : (
        <tr>
          <td colSpan={3} className="border-b border-gray-100 px-3 py-2 text-center text-xs text-gray-400">
            No itemized menu for this package.
          </td>
        </tr>
      )}
    </>
  );
}

export default function EventProductionSheetModal({ orders, onClose }: { orders: OrderRecord[]; onClose: () => void }) {
  const [slips, setSlips] = useState<Record<string, OrderSlip | null>>({});
  const [menuItemsByPackage, setMenuItemsByPackage] = useState<Record<string, PackageMenuItems>>({});

  useEffect(() => {
    let cancelled = false;
    Promise.all(orders.map((o) => getOrderSlipAction(o.id).then((slip) => [o.id, slip] as const))).then((entries) => {
      if (!cancelled) setSlips(Object.fromEntries(entries));
    });
    return () => {
      cancelled = true;
    };
    // Only re-fetch when the order set actually changes, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders.map((o) => o.id).join(",")]);

  // Once slips are in, fetch each package's real menu for the order's pax —
  // but only for packages whose slip came back with no itemized dishes (a
  // real cart already has the real thing; no need to ask twice). Keyed by
  // package+pax since Handaan-style packages serve a different combo per
  // pax tier.
  useEffect(() => {
    const needed = new Map<string, { name: string; pax: number | null }>();
    for (const o of orders) {
      if (slips[o.id] === undefined || (slips[o.id]?.dishes.length ?? 0) > 0) continue;
      const key = `${o.packageName}::${o.pax ?? ""}`;
      if (!needed.has(key)) needed.set(key, { name: o.packageName, pax: o.pax });
    }
    if (needed.size === 0) return;

    let cancelled = false;
    Promise.all(
      [...needed.entries()].map(([key, { name, pax }]) => getPackageMenuItemsAction(name, pax).then((result) => [key, result] as const)),
    ).then((entries) => {
      if (!cancelled) setMenuItemsByPackage((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders.map((o) => o.id).join(","), Object.keys(slips).join(",")]);

  if (orders.length === 0) return null;

  const primary = orders.reduce((earliest, o) => (Date.parse(o.createdAt) < Date.parse(earliest.createdAt) ? o : earliest));
  const branch = primary.branch ? getBranchById(primary.branch) : undefined;
  const customer = `${primary.firstName} ${primary.lastName}`.trim();

  const totalAmount = orders.reduce((sum, o) => sum + o.total, 0);
  const anyLoading = orders.some((o) => slips[o.id] === undefined);
  const totalPaid = anyLoading ? 0 : orders.reduce((sum, o) => sum + (slips[o.id]?.amountPaid ?? 0), 0);
  const balance = Math.max(totalAmount - totalPaid, 0);
  const fullyPaid = !anyLoading && balance <= 0;

  const note = orders.map((o) => slips[o.id]?.instructions).find(Boolean) ?? null;
  const deliveryMethod = orders.map((o) => slips[o.id]?.deliveryMethod).find(Boolean) ?? null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-brand-950/40 print:hidden" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Event Production Sheet"
        className="relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl"
      >
        <div className="flex flex-shrink-0 items-center justify-between gap-3 border-b border-gray-100 px-5 py-3 print:hidden">
          <div className="min-w-0">
            <h2 className="truncate font-display text-sm font-bold text-brand-900">Event Production Sheet</h2>
            <p className="truncate text-xs text-gray-400">
              {primary.orderNumber} · {customer}
            </p>
          </div>
          <div className="flex flex-shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gold-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gold-600"
            >
              <Printer size={14} /> Print
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div id="production-sheet-print" className="overflow-y-auto p-5">
          <div className="text-center">
            <h1 className="font-display text-xl font-bold uppercase tracking-wide text-brand-900">Kusinang Pamana</h1>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Event Production Sheet</p>
            {branch && <p className="mt-0.5 text-xs text-gray-400">{branch.name}</p>}
          </div>

          <div className="my-4 border-t-2 border-brand-900" />

          <div className="grid gap-x-6 gap-y-0 sm:grid-cols-2">
            <section>
              <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-gray-400">Customer Details</h3>
              <FormLine label="Name" value={customer || "—"} />
              <FormLine label="Contact" value={primary.phone || "—"} />
              <FormLine label="Address" value={primary.venue || "—"} />
              <FormLine label="C/O" value="—" />
            </section>
            <section>
              <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-gray-400">Event Details</h3>
              <FormLine label="Event date" value={formatEventDate(primary.eventDate)} />
              <FormLine label="Event time" value={primary.eventTime || "—"} />
              <FormLine label="Note" value={deliveryMethod || note || "—"} />
              <FormLine label="Kitchen" value={branch?.name || primary.branch || "—"} />
            </section>
          </div>

          <table className="mt-5 w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="w-16 border-b-2 border-gray-300 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Qty</th>
                <th className="border-b-2 border-gray-300 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Orders / Particulars</th>
                <th className="border-b-2 border-gray-300 px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Amount</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <PackageRows
                  key={o.id}
                  order={o}
                  slip={slips[o.id]}
                  menuItems={menuItemsByPackage[`${o.packageName}::${o.pax ?? ""}`]}
                />
              ))}
            </tbody>
          </table>

          <div className="mt-4 space-y-1.5 border-t-2 border-brand-900 pt-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Total Amount</span>
              <span className="font-bold text-brand-900">{formatPeso(totalAmount)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Amount Paid</span>
              <span className="font-medium text-brand-900">{anyLoading ? "…" : formatPeso(totalPaid)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-gray-500">
                Balance
                {!anyLoading && (
                  <span className={`text-xs font-semibold ${fullyPaid ? "text-emerald-600" : "text-amber-600"}`}>
                    — {fullyPaid ? "FULLY PAID" : "BALANCE DUE"}
                  </span>
                )}
              </span>
              <span className="font-bold text-brand-900">{anyLoading ? "…" : formatPeso(balance)}</span>
            </div>
          </div>

          <div className="mt-5">
            <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-gray-400">Sales Note</h3>
            <div className="h-16 rounded-lg border border-gray-200" />
          </div>

          <div className="mt-4 flex items-baseline gap-2 border-b border-dotted border-gray-300 pb-1.5 text-xs text-gray-500">
            <span>Date Entered:</span>
            <span className="flex-1 text-right font-medium text-brand-900">
              {new Date(primary.createdAt).toLocaleDateString("en-PH", { timeZone: "Asia/Manila", year: "numeric", month: "short", day: "numeric" })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
