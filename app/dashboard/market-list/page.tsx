import PageHeader from "@/components/ui/PageHeader";
import KitchenDayNav, { ALL_BRANCHES_ID } from "@/components/dashboard/KitchenDayNav";
import MarketListPurchases from "@/components/dashboard/MarketListPurchases";
import { getOrdersWithMenuForDate } from "@/lib/orders/data";
import { getPackagesData } from "@/lib/menu/data";
import { buildDayOrders, buildPackageMix, buildProductionSummary } from "@/lib/kitchen/day";
import { getBranchById } from "@/lib/mt/branches";
import { todayManila } from "@/lib/mt/dates";

export const dynamic = "force-dynamic";

function longLabel(dateKey: string): string {
  const d = new Date(`${dateKey}T00:00:00`);
  return d.toLocaleDateString("en-PH", { weekday: "short", month: "short", day: "numeric" });
}

export default async function MarketListPage({
  searchParams,
}: {
  searchParams: { date?: string; branch?: string };
}) {
  const date = searchParams.date && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.date) ? searchParams.date : todayManila();
  const branch = searchParams.branch || ALL_BRANCHES_ID;

  const [orders, packages] = await Promise.all([getOrdersWithMenuForDate(date), getPackagesData()]);
  const dayOrders = buildDayOrders(orders, packages)
    .filter((o) => o.status !== "Cancelled")
    .filter((o) => branch === ALL_BRANCHES_ID || o.branch === branch);

  const production = buildProductionSummary(dayOrders);
  const packageMix = buildPackageMix(dayOrders);
  const mealsToMake = production.reduce((sum, p) => sum + p.qty, 0);
  const unreadableCount = dayOrders.filter((o) => !o.readable).length;

  const branchName = branch !== ALL_BRANCHES_ID ? getBranchById(branch)?.name ?? branch : null;

  return (
    <div>
      <PageHeader title="Market List" subtitle="What to cook for the day, and what was bought to cook it." />
      <KitchenDayNav basePath="/dashboard/market-list" date={date} branch={branch} showDateControls />

      <p className="mb-4 text-xs text-gray-400">Buy for {longLabel(date)} only</p>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm font-semibold text-brand-900">What to cook</p>
          <p className="mt-1 text-xs text-gray-400">Every order for {longLabel(date)}, with the same dish counted once.</p>

          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="font-display text-2xl font-bold text-brand-900">{dayOrders.length}</p>
              <p className="text-xs text-gray-400">Orders</p>
            </div>
            <div>
              <p className="font-display text-2xl font-bold text-brand-900">{production.length}</p>
              <p className="text-xs text-gray-400">Dishes</p>
            </div>
            <div>
              <p className="font-display text-2xl font-bold text-brand-900">{mealsToMake}</p>
              <p className="text-xs text-gray-400">Meals to make</p>
            </div>
          </div>

          <p className="mb-1.5 mt-5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Packages in this window</p>
          {packageMix.length === 0 ? (
            <p className="text-sm text-gray-400">Nothing booked yet.</p>
          ) : (
            <ul className="mb-4 divide-y divide-gray-100 text-sm">
              {packageMix.map((m) => (
                <li key={m.label} className="flex items-center justify-between py-1.5">
                  <span className="text-brand-900">{m.label}</span>
                  <span className="text-xs text-gray-400">{m.orderCount} order{m.orderCount === 1 ? "" : "s"}</span>
                </li>
              ))}
            </ul>
          )}

          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Dishes to make</p>
          {production.length === 0 ? (
            <p className="text-sm text-gray-400">Nothing to prepare for this selection.</p>
          ) : (
            <ul className="divide-y divide-gray-100 text-sm">
              {production.map((p) => (
                <li key={p.name} className="py-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-brand-900">{p.qty} {p.name}</span>
                  </div>
                  <p className="text-xs text-gray-400">
                    {p.breakdown} in {p.orderCount} order{p.orderCount === 1 ? "" : "s"}
                  </p>
                </li>
              ))}
            </ul>
          )}

          {unreadableCount > 0 && (
            <p className="mt-3 text-xs text-red-500">
              {unreadableCount} order{unreadableCount === 1 ? "" : "s"} could not be read and {unreadableCount === 1 ? "is" : "are"} not counted here.
            </p>
          )}
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <MarketListPurchases branchLabel={branchName} />
        </div>
      </div>
    </div>
  );
}
