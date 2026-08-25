// Revenue and pipeline aggregations. Ported from the deployed dashboard's
// revenue module so the KPI cards and charts derive their numbers the same way.

import { isBillable } from "./pipeline";
import { todayManila } from "./dates";
import type { DateRange, Opportunity } from "./types";

export const ALL_BRANCHES = "All Branches";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** `All Branches` (or a missing selection) means no filtering at all. */
export function filterByBranch(
  opportunities: Opportunity[],
  branch?: string,
): Opportunity[] {
  if (!branch || branch === ALL_BRANCHES) return opportunities;
  return opportunities.filter((o) => o.branch === branch);
}

/** Won, and not a freebie — the only records that count toward revenue. */
export function isRevenueBooking(o: Opportunity): boolean {
  return o.pipelineStatus === "won" && isBillable(o);
}

export type RevenueTotals = {
  confirmedRevenue: number;
  pipelineValue: number;
  newInquiryValue: number;
  refunds: number;
};

export function revenueTotals(
  opportunities: Opportunity[] = [],
  branch?: string,
): RevenueTotals {
  const scoped = filterByBranch(opportunities, branch);
  const sum = (rows: Opportunity[]) => rows.reduce((total, o) => total + o.amount, 0);

  return {
    confirmedRevenue: sum(scoped.filter(isRevenueBooking)),
    pipelineValue: sum(
      scoped.filter(
        (o) => o.paymentStage === "Partial Payment" && o.pipelineStatus === "open",
      ),
    ),
    newInquiryValue: sum(scoped.filter((o) => o.paymentStage === "New Inquiry")),
    refunds: sum(scoped.filter((o) => o.pipelineStatus === "lost" && o.amountPaid > 0)),
  };
}

export type BranchStats = {
  name: string;
  totalRevenue: number;
  totalBookings: number;
  totalInquiries: number;
  conversionRate: number;
  pendingPayments: number;
};

/** Per-branch rollup, keyed by branch name. */
export function branchStats(
  opportunities: Opportunity[] = [],
  branches: readonly string[],
): Record<string, BranchStats> {
  const out: Record<string, BranchStats> = {};

  for (const name of branches) {
    const rows = opportunities.filter((o) => o.branch === name);
    const won = rows.filter((o) => o.pipelineStatus === "won");
    const dead = rows.filter(
      (o) => o.pipelineStatus === "lost" || o.pipelineStatus === "abandoned",
    );
    const decided = won.length + dead.length;

    out[name] = {
      name,
      totalRevenue: won.filter(isBillable).reduce((total, o) => total + o.amount, 0),
      totalBookings: won.length,
      totalInquiries: rows.length,
      conversionRate: decided > 0 ? Math.round((won.length / decided) * 100) : 0,
      pendingPayments: rows
        .filter((o) => o.paymentStage === "Partial Payment" && o.pipelineStatus === "open")
        .reduce((total, o) => total + o.amount, 0),
    };
  }

  return out;
}

export type MonthlyPoint = {
  monthKey: string;
  month: string;
} & Record<string, number | string>;

/**
 * Revenue per branch for the last `months` calendar months, oldest first.
 * Branch names become data keys, so the chart can render one series each.
 */
export function monthlyRevenue(
  opportunities: Opportunity[] = [],
  branches: readonly string[],
  months = 12,
  // Anchored to the Manila calendar date (like every record's own dates),
  // not the runtime's local zone — otherwise server and browser near a
  // month boundary can disagree on the window.
  today = new Date(`${todayManila()}T00:00:00`),
): MonthlyPoint[] {
  const points: MonthlyPoint[] = [];

  for (let back = months - 1; back >= 0; back--) {
    const d = new Date(today.getFullYear(), today.getMonth() - back, 1);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const point: MonthlyPoint = {
      monthKey,
      month: `${MONTHS[d.getMonth()]} '${String(d.getFullYear()).slice(2)}`,
    };
    for (const branch of branches) point[branch] = 0;
    points.push(point);
  }

  const byKey = Object.fromEntries(points.map((p) => [p.monthKey, p]));

  for (const o of opportunities) {
    if (!isRevenueBooking(o) || !o.eventDate) continue;
    const point = byKey[o.eventDate.slice(0, 7)];
    if (!point) continue;
    if (branches.includes(o.branch)) {
      point[o.branch] = (point[o.branch] as number) + o.amount;
    }
  }

  return points;
}

export type PackageStat = {
  name: string;
  branch: string;
  orders: number;
  totalRevenue: number;
  totalPax: number;
  avgPricePerPax: number;
};

export function topPackages(
  opportunities: Opportunity[] = [],
  branch?: string,
  limit = 10,
): PackageStat[] {
  const won = filterByBranch(opportunities, branch).filter(
    (o) => o.pipelineStatus === "won",
  );
  const groups: Record<string, PackageStat> = {};

  for (const o of won) {
    const name = o.packageName || "Unspecified";
    const branchName = o.branch || "Unspecified";
    const gkey = `${name}::${branchName}`;
    groups[gkey] ??= {
      name,
      branch: branchName,
      orders: 0,
      totalRevenue: 0,
      totalPax: 0,
      avgPricePerPax: 0,
    };
    groups[gkey].orders += 1;
    groups[gkey].totalRevenue += o.amount;
    groups[gkey].totalPax += o.pax || 0;
  }

  return Object.values(groups)
    .map((g) => ({
      ...g,
      avgPricePerPax: g.totalPax > 0 ? Math.round(g.totalRevenue / g.totalPax) : 0,
    }))
    .sort((a, b) => b.orders - a.orders || b.totalRevenue - a.totalRevenue)
    .slice(0, limit);
}

/** Confirmed revenue booked inside a window — used by the period KPI cards. */
export function revenueInRange(
  opportunities: Opportunity[] = [],
  range: DateRange,
): number {
  return opportunities
    .filter((o) => isRevenueBooking(o) && o.eventDate >= range.from && o.eventDate <= range.to)
    .reduce((total, o) => total + o.amount, 0);
}

/** First/last day of the calendar month `monthsAgo` months before `today` (a `YYYY-MM-DD` Manila date key). */
function monthRange(monthsAgo: number, today: string): DateRange {
  const [y, m] = today.split("-").map(Number);
  const total = y * 12 + (m - 1) - monthsAgo;
  const year = Math.floor(total / 12);
  const month = (total % 12) + 1;
  const pad = (n: number) => String(n).padStart(2, "0");
  const daysInMonth = new Date(year, month, 0).getDate();
  return { from: `${year}-${pad(month)}-01`, to: `${year}-${pad(month)}-${pad(daysInMonth)}` };
}

export type MonthOverMonthTrend = {
  confirmedRevenue: number | null;
  refunded: number | null;
  pipelineValue: number | null;
};

/**
 * "vs last month" — compares the most recently *completed* calendar month
 * to the one before it (not the current, possibly-still-in-progress month,
 * which would read as an artificial dip). `null` when there's nothing to
 * divide by, so callers can fall back to "— On track" the same way a zero
 * trend already does.
 */
export function monthOverMonthTrend(
  opportunities: Opportunity[],
  branch: string | undefined,
  today: string,
): MonthOverMonthTrend {
  const scoped = filterByBranch(opportunities, branch);

  const totalsFor = (range: DateRange) => {
    const inEventWindow = scoped.filter((o) => o.eventDate && o.eventDate >= range.from && o.eventDate <= range.to);
    const confirmedRevenue = inEventWindow.filter(isRevenueBooking).reduce((s, o) => s + o.amount, 0);
    const pipelineValue = inEventWindow
      .filter((o) => o.paymentStage === "Partial Payment" && o.pipelineStatus === "open")
      .reduce((s, o) => s + o.amount, 0);
    // Refunds are conventionally tracked by when the deal died (createdDate),
    // matching lib/mt/overview.ts's own refunded calculation.
    const refunded = scoped
      .filter((o) => o.pipelineStatus === "lost" && o.createdDate >= range.from && o.createdDate <= range.to)
      .reduce((s, o) => s + (o.amountPaid || 0), 0);
    return { confirmedRevenue, pipelineValue, refunded };
  };

  const curr = totalsFor(monthRange(1, today));
  const prev = totalsFor(monthRange(2, today));
  const pct = (c: number, p: number) => (p > 0 ? Math.round(((c - p) / p) * 1000) / 10 : null);

  return {
    confirmedRevenue: pct(curr.confirmedRevenue, prev.confirmedRevenue),
    refunded: pct(curr.refunded, prev.refunded),
    pipelineValue: pct(curr.pipelineValue, prev.pipelineValue),
  };
}

export function recentTransactions(
  opportunities: Opportunity[] = [],
  branch?: string,
  limit = Infinity,
) {
  return filterByBranch(opportunities, branch)
    .filter((o) => o.paymentStage !== "New Inquiry")
    .sort((a, b) => Date.parse(b.lastModified) - Date.parse(a.lastModified))
    .slice(0, limit)
    .map((o) => ({
      id: o.id,
      reference: o.reference,
      name: o.name,
      branch: o.branch,
      amount: o.amount,
      paymentStage: o.paymentStage,
      pipelineStatus: o.pipelineStatus,
      eventDate: o.eventDate,
    }));
}
