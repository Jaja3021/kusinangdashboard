import KitchenBoard from "@/components/dashboard/KitchenBoard";
import { getKitchenBoard } from "@/lib/kitchen/data";

export const dynamic = "force-dynamic";

export default async function KitchenPage() {
  const orders = await getKitchenBoard();
  return <KitchenBoard orders={orders} />;
}
