import OverviewClient from "@/components/dashboard/OverviewClient";
import { todayManila } from "@/lib/mt/dates";
import { getOrders } from "@/lib/orders/data";
import { todaysOrders } from "@/lib/orders/today";
import { buildTodaysMockOrders } from "@/lib/orders/mock-celebrity-orders";
import { getPackagesData } from "@/lib/menu/data";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const today = todayManila();
  const [orders, packages] = await Promise.all([getOrders(), getPackagesData()]);
  // A few walk-in mock orders forced onto today's date so this widget (and
  // the Payments dashboard, which builds demo payments for these same
  // clients) never sit empty in a fresh environment — see
  // lib/orders/mock-celebrity-orders.ts's buildTodaysMockOrders.
  const mockToday = buildTodaysMockOrders(packages);
  const todayOrders = todaysOrders([...orders, ...mockToday], today);

  return <OverviewClient todayOrders={todayOrders} />;
}
