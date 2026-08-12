import { Users, MapPin } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { getBranchById } from "@/lib/mt/branches";
import { getOrders } from "@/lib/orders/data";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/orders/types";

export const dynamic = "force-dynamic";

const ACCENTS: Record<OrderStatus, string> = {
  "Pending Confirmation": "border-t-gold-400",
  Confirmed: "border-t-sky-400",
  Preparing: "border-t-amber-400",
  Completed: "border-t-emerald-500",
  Cancelled: "border-t-red-400",
};

export default async function KitchenPipelinePage() {
  const orders = await getOrders();

  return (
    <div>
      <PageHeader
        title="Kitchen Pipeline"
        subtitle="Every order today, tracked from confirmation to completion."
        action={
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Live
          </span>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        {ORDER_STATUSES.map((status) => {
          const items = orders.filter((o) => o.status === status);
          return (
            <div key={status} className="flex flex-col">
              <div className="mb-3 flex items-center justify-between px-1">
                <h2 className="text-sm font-semibold text-brand-900">{status}</h2>
                <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-800">{items.length}</span>
              </div>
              <div className={`space-y-3 rounded-lg border border-t-4 ${ACCENTS[status]} border-gray-200 bg-gray-50 p-3`}>
                {items.length === 0 && <p className="px-1 py-4 text-center text-xs text-slate-400">No orders</p>}
                {items.map((o) => (
                  <div key={o.id} className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-brand-900">{o.orderNumber}</p>
                      <p className="text-xs text-slate-400">{o.eventDate ?? "—"} {o.eventTime ?? ""}</p>
                    </div>
                    <p className="mt-1.5 text-sm font-medium text-slate-700">{o.firstName} {o.lastName}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{o.packageName}</p>
                    <div className="mt-2.5 flex items-center gap-3 border-t border-gray-100 pt-2 text-xs text-slate-400">
                      <span className="flex items-center gap-1"><Users size={12} /> {o.pax ?? o.quantityLabel ?? "—"}</span>
                      <span className="flex items-center gap-1"><MapPin size={12} /> {(o.branch && getBranchById(o.branch)?.name) || o.branch || "—"}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
