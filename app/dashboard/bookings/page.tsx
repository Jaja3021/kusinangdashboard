import PageHeader from "@/components/ui/PageHeader";
import BookingsClient from "@/components/dashboard/BookingsClient";
import { getOrders } from "@/lib/orders/data";
import { getBlockedDates } from "@/lib/bookings/blocked-dates";

export const dynamic = "force-dynamic";

export default async function BookingsPage() {
  const [orders, blockedDates] = await Promise.all([getOrders(), getBlockedDates()]);

  return (
    <div>
      <PageHeader title="Bookings" subtitle="All events booked across Cavite, Laguna, and Metro Manila." />
      <BookingsClient orders={orders} blockedDates={blockedDates} />
    </div>
  );
}
