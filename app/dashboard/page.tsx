import OverviewClient from "@/components/dashboard/OverviewClient";
import { todayManila } from "@/lib/mt/dates";
import { getOrders } from "@/lib/orders/data";
import { todaysOrders } from "@/lib/orders/today";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const orders = await getOrders();
  const todayOrders = todaysOrders(orders, todayManila());

  return <OverviewClient todayOrders={todayOrders} />;
}
