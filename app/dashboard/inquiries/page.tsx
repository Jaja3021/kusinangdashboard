import PageHeader from "@/components/ui/PageHeader";
import InquiriesClient from "@/components/dashboard/InquiriesClient";
import { getOrders } from "@/lib/orders/data";
import { getPackagesData } from "@/lib/menu/data";
import { buildMockCelebrityOrders } from "@/lib/orders/mock-celebrity-orders";

export const dynamic = "force-dynamic";

export default async function InquiriesPage() {
  const [orders, packages] = await Promise.all([getOrders(), getPackagesData()]);
  const mockOrders = buildMockCelebrityOrders(packages);

  return (
    <div>
      <PageHeader title="Inquiries" subtitle="Lead management and conversion tracking." />
      <InquiriesClient orders={[...orders, ...mockOrders]} />
    </div>
  );
}
