import SalesClient from "@/components/dashboard/SalesClient";
import { getOrders } from "@/lib/orders/data";
import { getPaymentQueue } from "@/lib/payments/data";

export const dynamic = "force-dynamic";

export default async function SalesPage() {
  const [orders, payments] = await Promise.all([getOrders(), getPaymentQueue()]);
  return <SalesClient orders={orders} payments={payments} />;
}
