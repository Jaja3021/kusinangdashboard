"use client";

import { useState } from "react";
import { Check, Clock, ClipboardList, StickyNote, Utensils } from "lucide-react";
import { formatPeso } from "@/lib/format";
import type { DayDish } from "@/lib/kitchen/day";

export type KitchenTodayOrder = {
  id: string;
  orderNumber: string;
  status: string;
  customer: string;
  email: string;
  phone: string;
  address: string | null;
  eventDate: string | null;
  eventTime: string | null;
  branchName: string;
  deliveryMethod: string | null;
  pax: number | null;
  quantityLabel: string | null;
  packageName: string;
  menuName: string | null;
  total: number;
  instructions: string | null;
  dishes: DayDish[];
  readable: boolean;
  createdAt: string;
};

function hoursAgo(createdAt: string): string {
  const ms = Date.now() - new Date(createdAt).getTime();
  const hrs = Math.max(0, Math.round(ms / 3_600_000));
  if (hrs < 1) return "just now";
  if (hrs === 1) return "1 hr ago";
  if (hrs < 24) return `${hrs} hrs ago`;
  const days = Math.round(hrs / 24);
  return days === 1 ? "1 day ago" : `${days} days ago`;
}

function deliveryLabel(method: string | null): string {
  if (!method) return "—";
  return method.charAt(0).toUpperCase() + method.slice(1);
}

const FOOD_STATUSES = ["Not Started", "Preparing", "Done"] as const;

const CHECKLIST_LABELS: Record<"whiteboard" | "groceryList" | "procured", string> = {
  whiteboard: "Whiteboard",
  groceryList: "Grocery List",
  procured: "Procured",
};

const FOOD_STATUS_STYLE: Record<(typeof FOOD_STATUSES)[number], { active: string }> = {
  "Not Started": { active: "bg-gray-600 text-white" },
  Preparing: { active: "bg-amber-500 text-white" },
  Done: { active: "bg-emerald-500 text-white" },
};

export default function KitchenTodayOrderCard({ order }: { order: KitchenTodayOrder }) {
  const [checklist, setChecklist] = useState({ whiteboard: false, groceryList: false, procured: false });
  const [foodStatus, setFoodStatus] = useState<(typeof FOOD_STATUSES)[number]>("Not Started");
  const [notes, setNotes] = useState("");

  return (
    <div id={`order-${order.id}`} className="scroll-mt-24 overflow-hidden rounded-lg border border-gray-200 bg-white">
      <div className="border-b border-gray-100 bg-gray-50/60 px-4 py-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="flex items-center gap-2 font-display text-lg font-bold text-brand-900">
            <Clock size={16} className="text-gold-500" />
            {order.eventTime ?? "No pickup time"}
          </h3>
          <span className="text-xs text-gray-400">{hoursAgo(order.createdAt)}</span>
        </div>
        <p className="mt-1 text-base font-semibold text-brand-900">{order.customer}</p>
        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
          {deliveryLabel(order.deliveryMethod)} · {order.branchName} · {order.pax ?? order.quantityLabel ?? "—"} pax
        </p>
      </div>

      {!order.readable && (
        <div className="mx-4 mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
          Could not read this order's dishes — showing the order details we do have.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 px-4 py-4 md:grid-cols-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gold-600">Customer Details</p>
          <dl className="mt-1.5 space-y-1 text-sm">
            <div><dt className="inline text-xs text-gray-400">Name </dt><dd className="inline text-brand-900">{order.customer}</dd></div>
            <div><dt className="inline text-xs text-gray-400">Contact </dt><dd className="inline text-brand-900">{order.phone || "—"}</dd></div>
            <div><dt className="inline text-xs text-gray-400">Address </dt><dd className="inline text-brand-900">{order.address || "—"}</dd></div>
          </dl>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gold-600">Event Details</p>
          <dl className="mt-1.5 space-y-1 text-sm">
            <div><dt className="inline text-xs text-gray-400">Event date </dt><dd className="inline text-brand-900">{order.eventDate ?? "—"}</dd></div>
            <div><dt className="inline text-xs text-gray-400">Event time </dt><dd className="inline text-brand-900">{order.eventTime ?? "—"}</dd></div>
            <div><dt className="inline text-xs text-gray-400">Method </dt><dd className="inline text-brand-900">{deliveryLabel(order.deliveryMethod)}</dd></div>
            <div><dt className="inline text-xs text-gray-400">Kitchen </dt><dd className="inline text-brand-900">{order.branchName}</dd></div>
          </dl>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gold-600">Order Details</p>
          <dl className="mt-1.5 space-y-1 text-sm">
            <div><dt className="inline text-xs text-gray-400">Package </dt><dd className="inline text-brand-900">{order.packageName}</dd></div>
            {order.menuName && <div><dt className="inline text-xs text-gray-400">Service </dt><dd className="inline text-brand-900">{order.menuName}</dd></div>}
            <div><dt className="inline text-xs text-gray-400">Pax </dt><dd className="inline text-brand-900">{order.pax ?? order.quantityLabel ?? "—"}</dd></div>
            <div><dt className="inline text-xs text-gray-400">Amount </dt><dd className="inline text-brand-900">{formatPeso(order.total)}</dd></div>
            <div><dt className="inline text-xs text-gray-400">Reference </dt><dd className="inline text-brand-900">{order.orderNumber}</dd></div>
          </dl>
        </div>
      </div>

      {order.instructions && (
        <div className="mx-4 mb-4 rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Notes &amp; Special Instructions</p>
          {order.instructions}
        </div>
      )}

      <div className="overflow-x-auto border-t border-gray-100">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              <th className="px-4 py-2">Qty</th>
              <th className="px-4 py-2">Tray</th>
              <th className="px-4 py-2">Orders / Particulars</th>
            </tr>
          </thead>
          <tbody>
            {order.dishes.length === 0 ? (
              <tr><td colSpan={3} className="px-4 py-3 text-gray-400">No dish details available.</td></tr>
            ) : (
              order.dishes.map((d, i) => (
                <tr key={i} className="border-t border-gray-100">
                  <td className="px-4 py-2 text-brand-900">{d.qty}</td>
                  <td className="px-4 py-2 text-gray-500">{d.size}</td>
                  <td className="px-4 py-2 text-brand-900">{d.name}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 gap-4 border-t border-gray-100 bg-gray-50/40 px-4 py-4 md:grid-cols-3">
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            <ClipboardList size={12} /> Kitchen Checklist
          </p>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(checklist) as (keyof typeof checklist)[]).map((key) => {
              const done = checklist[key];
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setChecklist((c) => ({ ...c, [key]: !c[key] }))}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                    done
                      ? "border-gold-500 bg-gold-500 text-white"
                      : "border-gray-200 bg-white text-gray-500 hover:border-gold-300 hover:text-gold-600"
                  }`}
                >
                  <span
                    className={`flex h-3.5 w-3.5 items-center justify-center rounded-full border ${
                      done ? "border-white/70" : "border-gray-300"
                    }`}
                  >
                    {done && <Check size={9} strokeWidth={3} />}
                  </span>
                  {CHECKLIST_LABELS[key]}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            <Utensils size={12} /> Food Status
          </p>
          <div className="inline-flex rounded-full border border-gray-200 bg-white p-1">
            {FOOD_STATUSES.map((s) => {
              const active = foodStatus === s;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setFoodStatus(s)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    active ? FOOD_STATUS_STYLE[s].active : "text-gray-500 hover:text-brand-900"
                  }`}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            <StickyNote size={12} /> Kitchen Notes
          </p>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes for this order…"
            rows={3}
            className="w-full rounded-lg border border-gray-200 bg-white p-2.5 text-sm text-brand-900 outline-none focus:border-gold-400"
          />
        </div>
      </div>
    </div>
  );
}
