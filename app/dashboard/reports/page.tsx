import ReportsClient from "@/components/dashboard/ReportsClient";
import { getOrders } from "@/lib/orders/data";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const orders = await getOrders();
  return <ReportsClient orders={orders} />;
}
