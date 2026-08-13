import BranchPerformanceClient from "@/components/dashboard/BranchPerformanceClient";
import { getOrders } from "@/lib/orders/data";

export const dynamic = "force-dynamic";

export default async function BranchPerformancePage() {
  const orders = await getOrders();
  return <BranchPerformanceClient orders={orders} />;
}
