import PageHeader from "@/components/ui/PageHeader";
import KitchenDayNav, { ALL_BRANCHES_ID } from "@/components/dashboard/KitchenDayNav";
import KitchenTodayOrderCard from "@/components/dashboard/KitchenTodayOrderCard";
import { getOrdersWithMenuForDate } from "@/lib/orders/data";
import { getPackagesData } from "@/lib/menu/data";
import { buildDayOrders } from "@/lib/kitchen/day";
import { todayManila } from "@/lib/mt/dates";

export const dynamic = "force-dynamic";

function longLabel(dateKey: string): string {
  const d = new Date(`${dateKey}T00:00:00`);
  return d.toLocaleDateString("en-PH", { weekday: "long", month: "short", day: "numeric" });
}

export default async function KitchenTodayPage({
  searchParams,
}: {
  searchParams: { date?: string; branch?: string };
}) {
  const date = searchParams.date && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.date) ? searchParams.date : todayManila();
  const branch = searchParams.branch || ALL_BRANCHES_ID;

  const [orders, packages] = await Promise.all([getOrdersWithMenuForDate(date), getPackagesData()]);
  const dayOrders = buildDayOrders(orders, packages)
    .filter((o) => o.status !== "Cancelled")
    .filter((o) => branch === ALL_BRANCHES_ID || o.branch === branch)
    .sort((a, b) => (a.eventTime ?? "zz").localeCompare(b.eventTime ?? "zz"));

  const dishLineCount = new Set(dayOrders.flatMap((o) => o.dishes.map((d) => d.name))).size;
  const unreadableCount = dayOrders.filter((o) => !o.readable).length;
  const noTimeCount = dayOrders.filter((o) => !o.eventTime).length;
  const times = [...new Set(dayOrders.filter((o) => o.eventTime).map((o) => o.eventTime as string))];

  return (
    <div>
      <PageHeader title="Kitchen Today" subtitle={longLabel(date)} />
      <KitchenDayNav basePath="/dashboard/kitchen-today" date={date} branch={branch} />

      {times.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold uppercase tracking-wide text-gray-400">Jump to</span>
          {times.map((t) => {
            const target = dayOrders.find((o) => o.eventTime === t);
            return (
              <a
                key={t}
                href={target ? `#order-${target.id}` : undefined}
                className="rounded-full border border-gray-200 px-2.5 py-1 font-medium text-gray-600 hover:border-gold-300 hover:text-gold-600"
              >
                {t}
              </a>
            );
          })}
        </div>
      )}

      <p className="mb-5 text-sm text-gray-500">
        {dayOrders.length} order{dayOrders.length === 1 ? "" : "s"}
        {times.length > 0 && ` · ${times[0]}${times.length > 1 ? `–${times[times.length - 1]}` : ""}`}
        {dishLineCount > 0 && ` · ${dishLineCount} different dishes`}
        {unreadableCount > 0 && ` · ${unreadableCount} order${unreadableCount === 1 ? "" : "s"} not counted`}
      </p>
      {noTimeCount > 0 && <p className="-mt-3 mb-4 text-xs text-amber-600">{noTimeCount} order{noTimeCount === 1 ? " has" : "s have"} no readable pickup time</p>}
      {unreadableCount > 0 && <p className="-mt-3 mb-4 text-xs text-red-500">{unreadableCount} order{unreadableCount === 1 ? "" : "s"} could not be read</p>}

      {dayOrders.length === 0 ? (
        <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-gray-200 text-sm text-gray-400">
          No orders for this day{branch !== ALL_BRANCHES_ID ? " at this branch" : ""}.
        </div>
      ) : (
        <div className="space-y-4">
          {dayOrders.map((o) => (
            <KitchenTodayOrderCard
              key={o.id}
              order={{
                id: o.id,
                orderNumber: o.orderNumber,
                status: o.status,
                customer: o.customer,
                email: o.email,
                phone: o.phone,
                address: o.address ?? null,
                eventDate: o.eventDate,
                eventTime: o.eventTime,
                branchName: o.branchName,
                deliveryMethod: o.deliveryMethod,
                pax: o.pax,
                quantityLabel: o.quantityLabel,
                packageName: o.packageName,
                menuName: o.menuName,
                total: o.total,
                instructions: o.instructions,
                dishes: o.dishes,
                readable: o.readable,
                createdAt: o.createdAt,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
