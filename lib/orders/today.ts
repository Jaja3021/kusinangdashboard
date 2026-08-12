import { getBranchById } from "@/lib/mt/branches";
import type { OrderRecord } from "./types";

export type TodayOrder = {
  id: string;
  customer: string;
  branch: string;
  type: string;
  package: string;
  pax: number | string;
  status: string;
};

/** Today's real orders (by event date), shaped to match lib/mt/overview.ts's
 * TodayOrder so BranchBadge/StatusBadge keep working unchanged. */
export function todaysOrders(orders: OrderRecord[], today: string): TodayOrder[] {
  return orders
    .filter((o) => o.eventDate === today && o.status !== "Cancelled")
    .map((o) => ({
      id: o.id,
      customer: `${o.firstName} ${o.lastName}`.trim(),
      branch: (o.branch && getBranchById(o.branch)?.name) || o.branch || "—",
      type: o.eventType || "—",
      package: o.packageName || "—",
      pax: o.pax ?? o.quantityLabel ?? "—",
      status: o.status,
    }));
}
