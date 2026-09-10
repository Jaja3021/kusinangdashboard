import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import KitchenDayNav, { ALL_BRANCHES_ID } from "@/components/dashboard/KitchenDayNav";
import { getOrdersWithMenuForDate } from "@/lib/orders/data";
import { getPackagesData } from "@/lib/menu/data";
import { buildDayOrders, buildPackageMix, buildProductionSummary } from "@/lib/kitchen/day";
import { BRANCHES } from "@/lib/mt/branches";
import { todayManila } from "@/lib/mt/dates";

export const dynamic = "force-dynamic";

export default async function KitchenBoardPage({
  searchParams,
}: {
  searchParams: { date?: string; branch?: string };
}) {
  const date = searchParams.date && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.date) ? searchParams.date : todayManila();
  const branch = searchParams.branch || ALL_BRANCHES_ID;

  const [orders, packages] = await Promise.all([getOrdersWithMenuForDate(date), getPackagesData()]);
  const allDayOrders = buildDayOrders(orders, packages);
  const dayOrders = allDayOrders
    .filter((o) => o.status !== "Cancelled")
    .filter((o) => branch === ALL_BRANCHES_ID || o.branch === branch);

  const production = buildProductionSummary(dayOrders);
  const packageMix = buildPackageMix(dayOrders);
  const dishLineCount = production.length;
  const verifiedQty = production.reduce((sum, p) => sum + p.qty, 0);
  const packageTypeCount = new Set(dayOrders.map((o) => o.packageName)).size;
  const unreadableCount = dayOrders.filter((o) => !o.readable).length;
  const noTimeCount = dayOrders.filter((o) => !o.eventTime).length;
  const topDish = production[0];
  const cancelledCount = allDayOrders.filter((o) => o.status === "Cancelled").length;

  return (
    <div>
      <PageHeader title="Daily Order Board" subtitle="Operational overview for the selected date." />
      <KitchenDayNav basePath="/dashboard/kitchen-board" date={date} branch={branch} showDateControls />

      <div className="mb-5 rounded-lg border border-gray-200 bg-white p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Order Acceptance</p>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          {BRANCHES.map((b) => (
            <span key={b.id} className="flex items-center gap-1.5">
              {b.name}
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">OPEN</span>
            </span>
          ))}
          <span className="text-xs text-gray-400">Select a single branch to change its status.</span>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Orders" value={dayOrders.length} sub="booked for this day" />
        <StatCard label="Dish lines" value={dishLineCount} sub={`to prepare${unreadableCount > 0 ? ` · ${unreadableCount} unreadable` : ""}`} />
        <StatCard label="Verified qty" value={verifiedQty} sub="verified production quantity" />
        <StatCard label="Package types" value={packageTypeCount} sub="distinct package / order types" />
      </div>

      <div className="mb-5 overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-4 py-3">
          <p className="text-sm font-semibold text-brand-900">Production summary</p>
          <p className="text-xs text-gray-400">
            Every dish on the day, aggregated across orders. Quantities counted only where the package reconstruction verified them.
            {unreadableCount > 0 && ` ${unreadableCount} order${unreadableCount === 1 ? "" : "s"} could not be read and ${unreadableCount === 1 ? "is" : "are"} not included.`}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                <th className="px-4 py-2">Dish</th>
                <th className="px-4 py-2">Verified qty</th>
                <th className="px-4 py-2">Tray / size breakdown</th>
                <th className="px-4 py-2 text-right">Orders</th>
              </tr>
            </thead>
            <tbody>
              {production.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-400">No dishes to prepare for this selection.</td></tr>
              ) : (
                production.map((p) => (
                  <tr key={p.name} className="border-t border-gray-100">
                    <td className="px-4 py-2.5 font-medium text-brand-900">{p.name}</td>
                    <td className="px-4 py-2.5 text-brand-900">{p.qty}</td>
                    <td className="px-4 py-2.5 text-gray-500">{p.breakdown}</td>
                    <td className="px-4 py-2.5 text-right text-gray-500">{p.orderCount}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-4 py-3">
          <p className="text-sm font-semibold text-brand-900">Day summary</p>
          <p className="text-xs text-gray-400">What kind of orders this day is, and what to know about the data.</p>
        </div>
        <div className="grid grid-cols-1 gap-4 px-4 py-4 md:grid-cols-2">
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Order / package mix</p>
            {packageMix.length === 0 ? (
              <p className="text-sm text-gray-400">Nothing booked yet.</p>
            ) : (
              <ul className="space-y-1 text-sm text-brand-900">
                {packageMix.map((m) => (
                  <li key={m.label}>
                    {m.orderCount} order{m.orderCount === 1 ? "" : "s"} — {m.label}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Worth knowing</p>
            <ul className="space-y-1 text-sm text-gray-600">
              <li>{dayOrders.length} orders · {dishLineCount} dish lines to prepare · {verifiedQty} verified qty</li>
              {topDish && <li>{topDish.name} has the highest verified quantity today — {topDish.qty}</li>}
              {unreadableCount > 0 && <li className="text-red-500">{unreadableCount} order{unreadableCount === 1 ? "" : "s"} excluded from dish totals — could not be read</li>}
              {noTimeCount > 0 && <li className="text-amber-600">{noTimeCount} order{noTimeCount === 1 ? " has" : "s have"} no readable pickup time</li>}
              {cancelledCount > 0 && <li>{cancelledCount} cancelled order{cancelledCount === 1 ? "" : "s"} excluded from this board</li>}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
