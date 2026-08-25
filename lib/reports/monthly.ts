// Blends 2 months of seeded dummy history with the current calendar month's
// real Supabase orders, so Branch Performance / Reports have something to
// trend against without fabricating a full fake year (there's exactly one
// real order so far — see lib/mt/opportunities.ts for why determinism
// matters here too: server/client must agree on every render).

import type { Branch } from "@/lib/mt/branches";
import { getBranchById } from "@/lib/mt/branches";
import { inRange, todayManila } from "@/lib/mt/dates";
import type { DateRange } from "@/lib/mt/types";
import type { OrderRecord, OrderStatus } from "@/lib/orders/types";
import type { PaymentQueueRow } from "@/lib/payments/types";
import type { MonthlyPoint } from "@/lib/mt/revenue";
import { monthlyRollup, PACKAGE_AVG_PRICE } from "@/lib/owner-financials/mock";

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const BOOKED_STATUSES = new Set<OrderStatus>([
  "Confirmed",
  "Preparing",
  "Cooking",
  "Ready for Delivery",
  "Completed",
]);

type DummyMonth = {
  monthKey: string; // "YYYY-MM"
  label: string; // "Jun '26"
  firstOfMonth: string; // "YYYY-MM-01"
  revenue: number;
  orders: number;
  bookings: number;
  cancelledValue: number;
  pendingValue: number;
  topPackage: string;
};

function monthInfo(monthsAgo: number, today = todayManila()) {
  const [y, m] = today.split("-").map(Number);
  const total = y * 12 + (m - 1) - monthsAgo;
  const year = Math.floor(total / 12);
  const month = (total % 12) + 1;
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    monthKey: `${year}-${pad(month)}`,
    label: `${MONTH_LABELS[month - 1]} '${String(year).slice(2)}`,
    firstOfMonth: `${year}-${pad(month)}-01`,
  };
}

// Per-branch top package, purely cosmetic flavor text (not tallied) — 2
// months ago, then last month. Kept as the original strings so Reports and
// Branch Performance still read the way they did before this file started
// pulling its revenue from lib/owner-financials/mock.ts.
const TOP_PACKAGE: Record<string, [string, string]> = {
  cavite: ["Pamana Heritage Buffet", "Pamana Heritage Buffet"],
  laguna: ["Fiesta Grazing Table", "Boodle Fight Feast"],
  "metro-manila": ["Corporate Bento", "Corporate Bento"],
};

// Orders/bookings/cancelled/pending are all derived from the branch's
// monthly revenue in lib/owner-financials/mock.ts's monthlyRollup — keyed by
// calendar month (1–12) rather than a specific year, so this still lines up
// even if "today" drifts outside the mock's modeled year.
function dummyMonths(branch: Branch): DummyMonth[] {
  return [2, 1].map((monthsAgo, i) => {
    const info = monthInfo(monthsAgo);
    const monthIndex = Number(info.monthKey.slice(5, 7)) - 1;
    const revenue = monthlyRollup[monthIndex]?.byBranch[branch.id] ?? 0;
    const orders = Math.max(1, Math.round(revenue / PACKAGE_AVG_PRICE));
    const bookings = Math.max(1, Math.round(orders * 0.7));
    const cancelledValue = Math.round(revenue * 0.05);
    const pendingValue = Math.round(revenue * 0.15);
    const topPackage = TOP_PACKAGE[branch.id]?.[i] ?? "—";
    return { ...info, revenue, orders, bookings, cancelledValue, pendingValue, topPackage };
  });
}

function branchOf(order: OrderRecord): Branch | undefined {
  return order.branch ? getBranchById(order.branch) : undefined;
}

function orderMonthDate(order: OrderRecord): string {
  return order.eventDate || order.createdAt.slice(0, 10);
}

/** 3 MonthlyPoint entries (2 dummy + this month, real) — SalesOverviewChart-ready. */
export function buildMonthlySeries(orders: OrderRecord[], branches: Branch[]): MonthlyPoint[] {
  const points: MonthlyPoint[] = [2, 1, 0].map((monthsAgo) => {
    const info = monthInfo(monthsAgo);
    const point: MonthlyPoint = { monthKey: info.monthKey, month: info.label };
    for (const branch of branches) point[branch.name] = 0;
    return point;
  });

  for (const branch of branches) {
    const [twoAgo, oneAgo] = dummyMonths(branch);
    if (twoAgo) points[0][branch.name] = twoAgo.revenue;
    if (oneAgo) points[1][branch.name] = oneAgo.revenue;
  }

  const thisMonthPoint = points[2];
  for (const order of orders) {
    if (order.status === "Cancelled") continue;
    const branch = branchOf(order);
    if (!branch) continue;
    const monthKey = orderMonthDate(order).slice(0, 7);
    if (monthKey !== thisMonthPoint.monthKey) continue;
    thisMonthPoint[branch.name] = (thisMonthPoint[branch.name] as number) + order.total;
  }

  return points;
}

export type BranchTotals = {
  branch: Branch;
  totalRevenue: number;
  totalBookings: number;
  totalInquiries: number;
  conversionRate: number;
  lostCancelled: number;
  pendingPayments: number;
  topPackage: string;
};

/** Combines the 2 dummy months (when the selected range covers them) with real orders inside `range`. */
export function branchTotals(orders: OrderRecord[], branch: Branch, range: DateRange): BranchTotals {
  let revenue = 0;
  let bookings = 0;
  let inquiries = 0;
  let cancelledValue = 0;
  let pendingValue = 0;
  let topPackage = "No booked packages yet.";

  for (const month of dummyMonths(branch)) {
    if (!inRange(month.firstOfMonth, range)) continue;
    revenue += month.revenue;
    bookings += month.bookings;
    inquiries += month.orders;
    cancelledValue += month.cancelledValue;
    pendingValue += month.pendingValue;
    topPackage = month.topPackage;
  }

  const branchOrders = orders.filter((o) => branchOf(o)?.id === branch.id && inRange(orderMonthDate(o), range));
  const packageCounts = new Map<string, number>();

  for (const o of branchOrders) {
    inquiries += 1;
    if (o.status === "Cancelled") {
      cancelledValue += o.total;
      continue;
    }
    revenue += o.total;
    if (BOOKED_STATUSES.has(o.status)) bookings += 1;
    if (o.status === "Pending Confirmation") pendingValue += o.total;
    if (o.packageName) packageCounts.set(o.packageName, (packageCounts.get(o.packageName) ?? 0) + 1);
  }

  if (packageCounts.size > 0) {
    topPackage = [...packageCounts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  }

  return {
    branch,
    totalRevenue: revenue,
    totalBookings: bookings,
    totalInquiries: inquiries,
    conversionRate: inquiries > 0 ? Math.round((bookings / inquiries) * 100) : 0,
    lostCancelled: cancelledValue,
    pendingPayments: pendingValue,
    topPackage,
  };
}

export type SalesKpis = {
  confirmedRevenue: number;
  pipelineValue: number;
  newInquiryValue: number;
  lostCancelled: number;
};

/**
 * The Sales page's top KPI row. `periodOrders`/`periodPayments` must already
 * be branch- and date-scoped by the caller — this only sums.
 *
 * `confirmedRevenue` and `newInquiryValue` intentionally overlap (a "Pending
 * Confirmation" order's value counts in both), matching `branchTotals`'s own
 * revenue definition where every non-cancelled status counts as revenue.
 */
export function salesKpis(periodOrders: OrderRecord[], periodPayments: PaymentQueueRow[]): SalesKpis {
  let confirmedRevenue = 0;
  let newInquiryValue = 0;
  let lostCancelled = 0;

  for (const o of periodOrders) {
    if (o.status === "Cancelled") {
      lostCancelled += o.total;
      continue;
    }
    confirmedRevenue += o.total;
    if (o.status === "Pending Confirmation") newInquiryValue += o.total;
  }

  // Deduped by order — a partially-paid order can have multiple payment rows.
  const seen = new Set<string>();
  let pipelineValue = 0;
  for (const p of periodPayments) {
    if (seen.has(p.orderId)) continue;
    if (p.orderPaymentStatus === "Partially Paid" || p.orderPaymentStatus === "Deposit Paid") {
      pipelineValue += p.orderTotal;
      seen.add(p.orderId);
    }
  }

  return { confirmedRevenue, pipelineValue, newInquiryValue, lostCancelled };
}

export type PackageStat = { packageName: string; orders: number; revenue: number };

/** Revenue and order count per package, revenue-sorted descending. Cancelled orders don't count. */
export function topPackagesByOrders(orders: OrderRecord[]): PackageStat[] {
  const groups = new Map<string, { orders: number; revenue: number }>();
  for (const o of orders) {
    if (o.status === "Cancelled") continue;
    const key = o.packageName || "Unspecified";
    const g = groups.get(key) ?? { orders: 0, revenue: 0 };
    g.orders += 1;
    g.revenue += o.total;
    groups.set(key, g);
  }
  return [...groups.entries()]
    .map(([packageName, g]) => ({ packageName, ...g }))
    .sort((a, b) => b.revenue - a.revenue);
}
