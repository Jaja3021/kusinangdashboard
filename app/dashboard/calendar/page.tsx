import PageHeader from "@/components/ui/PageHeader";
import CateringCalendar from "@/components/dashboard/CateringCalendar";
import { getOrdersInRange } from "@/lib/orders/data";
import { getPackagesData } from "@/lib/menu/data";
import { buildMockCelebrityOrders } from "@/lib/orders/mock-celebrity-orders";
import { getBlockedDates } from "@/lib/bookings/blocked-dates";
import { getCalendarCapacity } from "@/lib/calendar/data";
import { rangeForView, type CalendarView } from "@/lib/calendar/range";
import { todayManila } from "@/lib/mt/dates";

export const dynamic = "force-dynamic";

const VALID_VIEWS: CalendarView[] = ["month", "week", "day"];

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: { view?: string; date?: string };
}) {
  const view: CalendarView = VALID_VIEWS.includes(searchParams.view as CalendarView)
    ? (searchParams.view as CalendarView)
    : "month";
  const referenceDate = searchParams.date && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.date) ? searchParams.date : todayManila();

  const { from, to } = rangeForView(view, referenceDate);

  // req #20: only the orders inside the currently-displayed range are
  // fetched — a month view queries one month, a day view queries one day.
  const [orders, packages, blockedDates, capacities] = await Promise.all([
    getOrdersInRange(from, to),
    getPackagesData(),
    getBlockedDates(),
    getCalendarCapacity(),
  ]);

  // Same demo "celebrity" orders shown on Orders/Bookings, so an order
  // visible there is also visible here — filtered to this view's window and
  // merged in like any other order (they count toward capacity too).
  const mockOrders = buildMockCelebrityOrders(packages).filter(
    (o) => o.eventDate !== null && o.eventDate >= from && o.eventDate <= to,
  );

  return (
    <div>
      <PageHeader title="Catering Calendar" subtitle="Every confirmed and pending event, kitchen capacity, and closed dates in one view." />
      <CateringCalendar
        view={view}
        referenceDate={referenceDate}
        orders={[...orders, ...mockOrders]}
        blockedDates={blockedDates}
        capacities={capacities}
      />
    </div>
  );
}
