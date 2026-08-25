import PageHeader from "@/components/ui/PageHeader";
import BookingsClient from "@/components/dashboard/BookingsClient";
import { getOrders } from "@/lib/orders/data";
import { getPackagesData } from "@/lib/menu/data";
import { buildMockCelebrityOrders } from "@/lib/orders/mock-celebrity-orders";

export const dynamic = "force-dynamic";

export default async function BookingsPage() {
  const [orders, packages] = await Promise.all([getOrders(), getPackagesData()]);
  const mockOrders = buildMockCelebrityOrders(packages);

  return (
    <div>
      <PageHeader title="Bookings" subtitle="All events booked across Cavite, Laguna, and Metro Manila." />
      <BookingsClient orders={[...orders, ...mockOrders]} />
    </div>
  );
}
