import PageHeader from "@/components/ui/PageHeader";
import CustomersClient from "@/components/dashboard/CustomersClient";
import { getOrders } from "@/lib/orders/data";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const orders = await getOrders();

  return (
    <div>
      <PageHeader title="Customers" subtitle="Everyone who has booked with Kusinang Pamana." />
      <CustomersClient orders={orders} />
    </div>
  );
}
