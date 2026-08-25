import KitchenBoard from "@/components/dashboard/KitchenBoard";
import { getKitchenBoard } from "@/lib/kitchen/data";
import { KITCHEN_STAGES, orderToKitchenOrder } from "@/lib/kitchen/types";
import { getPackagesData } from "@/lib/menu/data";
import { buildMockCelebrityOrders } from "@/lib/orders/mock-celebrity-orders";

export const dynamic = "force-dynamic";

const KITCHEN_STATUSES = new Set<string>(KITCHEN_STAGES);

export default async function KitchenPage() {
  const [orders, packages] = await Promise.all([getKitchenBoard(), getPackagesData()]);
  const mockCelebrityOrders = buildMockCelebrityOrders(packages);

  // Same rule real orders already follow: only statuses that are one of the
  // 5 board columns show up here (mostly "Confirmed" — celebrity orders
  // seeded as "Pending Confirmation" or "Cancelled" don't appear).
  const mockKitchenOrders = mockCelebrityOrders
    .filter((o) => KITCHEN_STATUSES.has(o.status))
    .map((o) => orderToKitchenOrder(o, o.status));

  const merged = [...orders, ...mockKitchenOrders].sort((a, b) => {
    const dateDiff = (a.eventDate ?? "").localeCompare(b.eventDate ?? "");
    if (dateDiff !== 0) return dateDiff;
    return (a.eventTime ?? "").localeCompare(b.eventTime ?? "");
  });

  return <KitchenBoard orders={merged} />;
}
