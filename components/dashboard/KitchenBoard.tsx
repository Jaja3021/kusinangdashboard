"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, Info, MapPin, RefreshCw, Search, Truck, Users } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { BranchBadge } from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import { useSync } from "@/components/providers/SyncProvider";
import { getBranchById } from "@/lib/mt/branches";
import { setKitchenStageAction } from "@/app/dashboard/kitchen/actions";
import { KITCHEN_STAGES, nextStage, type KitchenOrder, type KitchenStage } from "@/lib/kitchen/types";

const STAGE_STYLE: Record<KitchenStage, { border: string; dot: string }> = {
  "Upcoming Orders": { border: "border-t-red-400", dot: "bg-red-500" },
  "White Board": { border: "border-t-emerald-500", dot: "bg-emerald-500" },
  Procured: { border: "border-t-purple-500", dot: "bg-purple-500" },
  Cooking: { border: "border-t-sky-500", dot: "bg-sky-500" },
  Confirm: { border: "border-t-gold-400", dot: "bg-gold-500" },
};

function eventDateLabel(dateStr: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-PH", { weekday: "short", month: "short", day: "numeric" }).toUpperCase();
}

function branchName(id: string | null): string | undefined {
  if (!id) return undefined;
  return getBranchById(id)?.name ?? id;
}

function deliveryLabel(method: string | null): string {
  if (!method) return "—";
  return method.charAt(0).toUpperCase() + method.slice(1);
}

export default function KitchenBoard({ orders: initialOrders }: { orders: KitchenOrder[] }) {
  const router = useRouter();
  const { lastUpdated, loading, refresh } = useSync();
  const [orders, setOrders] = useState(initialOrders);
  const [search, setSearch] = useState("");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [moving, setMoving] = useState(false);

  const detail = orders.find((o) => o.id === detailId) ?? null;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter((o) => {
      if (o.customer.toLowerCase().includes(q)) return true;
      if (o.packageName.toLowerCase().includes(q)) return true;
      return o.dishes.some((d) => d.name.toLowerCase().includes(q));
    });
  }, [orders, search]);

  async function move(order: KitchenOrder, stage: KitchenStage) {
    setMoving(true);
    const prior = orders;
    setOrders((cur) => cur.map((o) => (o.id === order.id ? { ...o, stage } : o)));
    try {
      await setKitchenStageAction(order.id, stage);
      setDetailId(null);
    } catch {
      setOrders(prior);
    } finally {
      setMoving(false);
    }
  }

  function doRefresh() {
    refresh();
    router.refresh();
  }

  return (
    <div>
      <PageHeader title="Kitchen" subtitle="Every order tracked from booking to kitchen confirmation.">
        <button
          onClick={doRefresh}
          className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700"
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          Live from MT · {lastUpdated ? lastUpdated.toLocaleTimeString("en-PH") : "…"}
        </button>
      </PageHeader>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="relative max-w-sm flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customer, package or dish"
            className="w-full rounded-lg border border-gray-200 bg-white py-1.5 pl-9 pr-3 text-sm text-brand-900 outline-none focus:border-gold-400"
          />
        </div>
        <span className="flex items-center gap-1 text-xs text-gray-400">
          <Info size={12} /> Live board · ignores the period
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        {KITCHEN_STAGES.map((stage) => {
          const items = filtered.filter((o) => o.stage === stage);
          const style = STAGE_STYLE[stage];
          return (
            <div key={stage} className={`rounded-lg border border-t-4 ${style.border} border-gray-200 bg-white`}>
              <div className="flex items-center justify-between px-3 py-2.5">
                <span className="flex items-center gap-1.5 text-sm font-semibold text-brand-900">
                  <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                  {stage}
                </span>
                <span className="text-xs font-medium text-gray-400">{items.length}</span>
              </div>
              <div className="space-y-2 px-2 pb-2">
                {items.length === 0 && (
                  <div className="flex h-16 items-center justify-center rounded-lg border border-dashed border-gray-200 text-xs text-gray-300">Empty</div>
                )}
                {items.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => setDetailId(o.id)}
                    className="w-full rounded-lg border border-gray-200 bg-white p-3 text-left shadow-sm hover:border-gold-300"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium text-brand-900">{o.customer || o.orderNumber}</span>
                      <span className="flex-shrink-0 text-[10px] font-semibold uppercase text-gray-400">{eventDateLabel(o.eventDate)}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><Clock size={11} /> {o.eventTime ?? "—"}</span>
                      <span className="flex items-center gap-1"><Users size={11} /> {o.pax ?? o.quantityLabel ?? "—"}</span>
                    </div>
                    <p className="mt-1 truncate text-xs text-gray-500">{o.packageName || "—"}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <BranchBadge branch={branchName(o.branch)} />
                      <span className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-0.5 text-[10px] font-medium uppercase text-gray-600">
                        <Truck size={10} /> {deliveryLabel(o.deliveryMethod)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <Modal isOpen={detail !== null} onClose={() => setDetailId(null)} size="md">
        {detail && (
          <div>
            <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-red-500">
              <span className={`h-1.5 w-1.5 rounded-full ${STAGE_STYLE[detail.stage].dot}`} />
              {detail.stage} · {eventDateLabel(detail.eventDate)}
            </p>
            <h2 className="font-display text-lg font-bold text-brand-900">{detail.customer || detail.orderNumber}</h2>
            {detail.quantityLabel && <p className="text-sm text-gray-400">{detail.quantityLabel}</p>}

            <div className="mt-4 grid grid-cols-2 gap-4 border-y border-gray-100 py-4">
              <div>
                <p className="flex items-center gap-1 text-xs font-medium uppercase text-gray-400"><Clock size={12} /> Time</p>
                <p className="mt-0.5 text-sm font-medium text-brand-900">{detail.eventTime ?? "—"}</p>
              </div>
              <div>
                <p className="flex items-center gap-1 text-xs font-medium uppercase text-gray-400"><Users size={12} /> Pax</p>
                <p className="mt-0.5 text-sm font-medium text-brand-900">{detail.pax ?? detail.quantityLabel ?? "—"}</p>
              </div>
              <div>
                <p className="flex items-center gap-1 text-xs font-medium uppercase text-gray-400"><MapPin size={12} /> Service</p>
                <p className="mt-0.5 text-sm font-medium text-brand-900">{detail.packageName || "—"}</p>
              </div>
              <div>
                <p className="flex items-center gap-1 text-xs font-medium uppercase text-gray-400"><Truck size={12} /> Receive</p>
                <p className="mt-0.5 text-sm font-medium text-brand-900">{deliveryLabel(detail.deliveryMethod)}</p>
              </div>
            </div>

            {detail.instructions && (
              <div className="mt-4">
                <p className="text-xs font-medium uppercase text-gray-400">Notes</p>
                <p className="mt-1 rounded-lg bg-gray-50 p-3 text-sm text-gray-600">{detail.instructions}</p>
              </div>
            )}

            <div className="mt-4">
              <p className="text-xs font-medium uppercase text-gray-400">Dishes ({detail.dishes.length})</p>
              {detail.dishes.length === 0 ? (
                <p className="mt-1 text-sm text-gray-400">No dish details available.</p>
              ) : (
                <p className="mt-1 rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
                  {detail.dishes.map((d) => `${d.qty} ${d.name}`).join("; ")}
                </p>
              )}
            </div>

            <div className="mt-5 flex items-center justify-between gap-3">
              {(() => {
                const i = KITCHEN_STAGES.indexOf(detail.stage);
                const prev = i > 0 ? KITCHEN_STAGES[i - 1] : null;
                return prev ? (
                  <button onClick={() => move(detail, prev)} disabled={moving} className="text-xs font-medium text-gray-400 hover:text-gray-600">
                    ← Move back to {prev}
                  </button>
                ) : <span />;
              })()}
              {nextStage(detail.stage) ? (
                <button
                  onClick={() => move(detail, nextStage(detail.stage)!)}
                  disabled={moving}
                  className="rounded-lg bg-brand-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-900 disabled:opacity-50"
                >
                  {moving ? "Moving…" : `Move to ${nextStage(detail.stage)} →`}
                </button>
              ) : (
                <span className="text-sm font-medium text-emerald-600">✓ Confirmed</span>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
