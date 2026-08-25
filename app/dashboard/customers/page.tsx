import PageHeader from "@/components/ui/PageHeader";
import CustomersClient from "@/components/dashboard/CustomersClient";
import { getOrders } from "@/lib/orders/data";
import { getPackagesData } from "@/lib/menu/data";
import { buildMockCelebrityOrders } from "@/lib/orders/mock-celebrity-orders";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const [orders, packages] = await Promise.all([getOrders(), getPackagesData()]);
  const mockOrders = buildMockCelebrityOrders(packages);

  return (
    <div>
      <PageHeader title="Customers" subtitle="Everyone who has booked with Kusinang Pamana." />
      <CustomersClient orders={[...orders, ...mockOrders]} />
    </div>
  );
}
