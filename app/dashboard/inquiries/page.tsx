import PageHeader from "@/components/ui/PageHeader";
import InquiriesClient from "@/components/dashboard/InquiriesClient";
import { getOrders } from "@/lib/orders/data";

export const dynamic = "force-dynamic";

export default async function InquiriesPage() {
  const orders = await getOrders();

  return (
    <div>
      <PageHeader title="Inquiries" subtitle="Leads collected from the website, phone, and walk-ins." />
      <InquiriesClient orders={orders} />
    </div>
  );
}
