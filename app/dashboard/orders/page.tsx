import PageHeader from "@/components/ui/PageHeader";
import OrdersClient from "@/components/dashboard/OrdersClient";
import { getOrders } from "@/lib/orders/data";
import { getPackagesData } from "@/lib/menu/data";
import { buildMockCelebrityOrders } from "@/lib/orders/mock-celebrity-orders";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const [orders, packages] = await Promise.all([getOrders(), getPackagesData()]);
  const mockOrders = buildMockCelebrityOrders(packages);

  return (
    <div>
      <PageHeader title="Orders" subtitle="Incoming orders from the storefront, live from Supabase." />
      <OrdersClient orders={[...orders, ...mockOrders]} />
    </div>
  );
}
