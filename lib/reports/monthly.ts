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
import type { MonthlyPoint } from "@/lib/mt/revenue";

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const BOOKED_STATUSES = new Set<OrderStatus>(["Confirmed", "Preparing", "Completed"]);

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

// Modest, believable per-branch figures — 2 months ago, then last month.
const DUMMY_BASE: Record<string, { revenue: number; orders: number; bookings: number; cancelledValue: number; pendingValue: number; topPackage: string }[]> = {
  cavite: [
    { revenue: 168_000, orders: 9, bookings: 6, cancelledValue: 12_000, pendingValue: 24_000, topPackage: "Pamana Heritage Buffet" },
    { revenue: 205_000, orders: 11, bookings: 8, cancelledValue: 8_000, pendingValue: 31_000, topPackage: "Pamana Heritage Buffet" },
  ],
  laguna: [
    { revenue: 92_000, orders: 5, bookings: 3, cancelledValue: 6_000, pendingValue: 14_000, topPackage: "Fiesta Grazing Table" },
    { revenue: 118_000, orders: 6, bookings: 4, cancelledValue: 0, pendingValue: 19_000, topPackage: "Boodle Fight Feast" },
  ],
  "metro-manila": [
    { revenue: 134_000, orders: 7, bookings: 5, cancelledValue: 9_500, pendingValue: 21_000, topPackage: "Corporate Bento" },
    { revenue: 151_000, orders: 8, bookings: 6, cancelledValue: 4_000, pendingValue: 26_500, topPackage: "Corporate Bento" },
  ],
};

function dummyMonths(branch: Branch): DummyMonth[] {
  const base = DUMMY_BASE[branch.id] ?? [];
  return base.map((b, i) => ({ ...monthInfo(2 - i), ...b }));
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
