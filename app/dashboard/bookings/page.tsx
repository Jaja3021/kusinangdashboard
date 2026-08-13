import PageHeader from "@/components/ui/PageHeader";
import BookingsClient from "@/components/dashboard/BookingsClient";
import { getOrders } from "@/lib/orders/data";

export const dynamic = "force-dynamic";

export default async function BookingsPage() {
  const orders = await getOrders();

  return (
    <div>
      <PageHeader title="Bookings" subtitle="All events booked across Cavite, Laguna, and Metro Manila." />
      <BookingsClient orders={orders} />
    </div>
  );
}
