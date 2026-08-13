import PageHeader from "@/components/ui/PageHeader";
import OrdersClient from "@/components/dashboard/OrdersClient";
import { getOrders } from "@/lib/orders/data";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const orders = await getOrders();

  return (
    <div>
      <PageHeader title="Orders" subtitle="Incoming orders from the storefront, live from Supabase." />
      <OrdersClient orders={orders} />
    </div>
  );
}
