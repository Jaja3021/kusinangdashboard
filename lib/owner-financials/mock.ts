// Deterministic mock generator for Owner Financials — 24 semi-monthly
// periods across calendar year 2026, priced off the real menu catalog
// (lib/menu/dummy-catalog.ts) rather than invented wholesale. This module is
// evaluated on both server and client, so every figure must come from the
// fixed seed below, never Math.random() — any drift is a hydration mismatch
// (same discipline as lib/mt/opportunities.ts, which this mirrors).
//
// "Actual" periods run from Jan 1 up to today; anything after is flagged
// "projected" and excluded from the headline KPIs. lib/dummy-data.ts and
// lib/reports/monthly.ts both rederive their figures from `monthlyRollup`
// here, so Owner Financials, Sales, Reports, and Branch Performance all
// agree on the same numbers.

import { menuPackages, grazingSpreads, cateringPackages, packedMeals, menuDishes } from "@/lib/menu/dummy-catalog";
import { BRANCHES } from "@/lib/mt/branches";
import { todayManila } from "@/lib/mt/dates";
import type { ChangeEntry, CompensationEntry, FinancialPeriod, OwnerDistribution, PeriodKind } from "./types";

/** mulberry32 — same helper as lib/mt/opportunities.ts, kept local so this module has no dependency on the CRM pipeline generator. */
function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = <T,>(rng: () => number, list: readonly T[]): T => list[Math.floor(rng() * list.length)];

const YEAR = 2026;
const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]; // 2026 is not a leap year
const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const pad = (n: number) => String(n).padStart(2, "0");

/** Anchors the actual/projected split — matches the rest of the app's Manila "today". */
export const OWNER_FINANCIALS_TODAY = todayManila();

// ---------- Seasonality ----------
// One multiplier per calendar month; the second half of the month runs a
// little hotter than the first (paydays, weekend events cluster there).
const SEASON_MULT = [0.78, 0.85, 0.92, 0.98, 1.15, 1.10, 0.95, 0.90, 0.88, 0.95, 1.05, 1.45];
const HALF_MULT: [number, number] = [0.95, 1.05];

// ---------- Transaction volume ----------
// Revenue is transaction-count-driven, not price-target-driven: ~300 blended
// orders a month (counter orders + package/catering bookings), riding the
// same seasonality curve as everything else so Jan/Feb read as the lean
// months and May/Jun read as the peak. Validated to land Jan–Aug actual
// revenue in the ₱5–8M band with a visible low and high month.
const MONTHLY_TXN_TARGET = 300;

// ---------- Branch split ----------
// Matches the ratios already seeded in lib/reports/monthly.ts's DUMMY_BASE.
const BRANCH_SPLIT: Record<string, number> = { cavite: 0.42, "metro-manila": 0.33, laguna: 0.25 };

// ---------- Menu-derived pools ----------
// Counter sales (packed meals + a la carte dishes) blend to roughly ₱300/order.
const ORDER_POOL = [...packedMeals, ...menuDishes].filter((d) => d.active);
const ORDER_AOV = Math.round(ORDER_POOL.reduce((s, d) => s + d.basePrice, 0) / ORDER_POOL.length);

// Package sales (feasts, grazing, catering) — one headline sale a month plus a handful smaller.
const PACKAGE_POOL = [...menuPackages, ...grazingSpreads, ...cateringPackages].filter((p) => p.active);
/** Exported for lib/reports/monthly.ts, which derives its seeded months' order/booking counts from this. */
export const PACKAGE_AVG_PRICE = Math.round(PACKAGE_POOL.reduce((s, p) => s + p.basePrice, 0) / PACKAGE_POOL.length);

type PeriodWindow = { month: number; half: 0 | 1; startDate: string; endDate: string };

function buildWindows(): PeriodWindow[] {
  const windows: PeriodWindow[] = [];
  for (let m = 0; m < 12; m++) {
    windows.push({ month: m, half: 0, startDate: `${YEAR}-${pad(m + 1)}-01`, endDate: `${YEAR}-${pad(m + 1)}-15` });
    windows.push({ month: m, half: 1, startDate: `${YEAR}-${pad(m + 1)}-16`, endDate: `${YEAR}-${pad(m + 1)}-${MONTH_DAYS[m]}` });
  }
  return windows;
}

// Bonuses: a mid-year performance bonus, a year-end performance bonus, and
// 13th-month pay. Zero every other period.
function bonusFor(month: number, half: 0 | 1): number {
  if (month === 4 && half === 1) return 80_000; // mid-year performance bonus (May 16–31)
  if (month === 11 && half === 0) return 60_000; // year-end performance bonus (Dec 1–15)
  if (month === 11 && half === 1) return 300_000; // 13th-month pay (Dec 16–31)
  return 0;
}

/** Populated alongside financialPeriods — the transaction counts behind each period's sales figure. */
const periodTransactionCounts: { periodId: string; orderCount: number; packageCount: number }[] = [];

function buildPeriod(rng: () => number, w: PeriodWindow, index: number): FinancialPeriod {
  // Monthly transaction volume rides the same seasonality curve as revenue
  // itself, then splits in half per semi-monthly period (the second half
  // running a little hotter, same as everywhere else in this file).
  const txnMonthlyTarget = MONTHLY_TXN_TARGET * SEASON_MULT[w.month] * (0.9 + rng() * 0.2);
  const perPeriodTxn = Math.round((txnMonthlyTarget / 2) * HALF_MULT[w.half]);

  // 8–14% of transactions are big packages/catering bookings; the rest are
  // counter orders (packed meals, a la carte dishes) — packages still carry
  // most of the revenue despite being a small share of the count.
  const packageFraction = 0.08 + rng() * 0.06;
  const packageCount = Math.max(2, Math.round(perPeriodTxn * packageFraction));
  const orderCount = Math.max(15, Math.round(perPeriodTxn * (1 - packageFraction)));

  const orderRevenue = orderCount * ORDER_AOV;
  let packageRevenue = 0;
  for (let i = 0; i < packageCount; i++) packageRevenue += pick(rng, PACKAGE_POOL).basePrice;

  const sales = orderRevenue + packageRevenue;
  const operationalExpense = Math.round(sales * (0.485 + rng() * 0.015));
  const salary = 150_000;
  const commissions = Math.round(sales * 0.015);
  const bonuses = bonusFor(w.month, w.half);

  const kind: PeriodKind = w.endDate <= OWNER_FINANCIALS_TODAY ? "actual" : "projected";
  const id = `OF-P${index + 1}`;

  periodTransactionCounts.push({ periodId: id, orderCount, packageCount });

  return { id, startDate: w.startDate, endDate: w.endDate, kind, sales, operationalExpense, salary, commissions, bonuses };
}

function buildPeriods(): FinancialPeriod[] {
  const rng = seeded(20260115);
  return buildWindows().map((w, i) => buildPeriod(rng, w, i));
}

export const financialPeriods: FinancialPeriod[] = buildPeriods();

export const actualPeriods: FinancialPeriod[] = financialPeriods.filter((p) => p.kind === "actual");
export const projectedPeriods: FinancialPeriod[] = financialPeriods.filter((p) => p.kind === "projected");

/** Calendar months where both semi-monthly periods are "actual" — used for clean month-over-month comparisons. */
export const fullyActualMonthIndexes: number[] = MONTH_LABELS.map((_, i) => i).filter(
  (i) => financialPeriods[i * 2].kind === "actual" && financialPeriods[i * 2 + 1].kind === "actual",
);

/** Blended value per transaction (counter order or package sale) across actual periods — the real, menu-derived "average order value". */
export const blendedTransactionValue: number = (() => {
  const actualIds = new Set(actualPeriods.map((p) => p.id));
  let totalSales = 0;
  let totalTransactions = 0;
  for (const p of actualPeriods) totalSales += p.sales;
  for (const t of periodTransactionCounts) {
    if (!actualIds.has(t.periodId)) continue;
    totalTransactions += t.orderCount + t.packageCount;
  }
  return totalTransactions > 0 ? Math.round(totalSales / totalTransactions) : 0;
})();

// ---------- Compensation breakdown ----------
// Named people reuse the staff already seeded in lib/dummy-data.ts's
// staffTasks, so the same names show up consistently across the dashboard.
const SALARY_STAFF: { person: string; role: string; share: number }[] = [
  { person: "Chef Danilo Ocampo", role: "Executive Chef", share: 0.4 },
  { person: "Nina Ponce", role: "Operations Manager", share: 0.35 },
  { person: "Ruel Santiago", role: "Logistics Head", share: 0.25 },
];

function buildCompensationEntries(): CompensationEntry[] {
  const entries: CompensationEntry[] = [];
  let n = 0;
  for (const p of actualPeriods) {
    for (const staff of SALARY_STAFF) {
      entries.push({
        id: `OF-C${++n}`,
        periodId: p.id,
        person: staff.person,
        role: staff.role,
        kind: "Salary",
        amount: Math.round(p.salary * staff.share),
        note: "",
      });
    }
    entries.push({
      id: `OF-C${++n}`,
      periodId: p.id,
      person: "Ella Marquez",
      role: "Sales Coordinator",
      kind: "Commission",
      amount: p.commissions,
      note: "1.5% of period sales",
    });
    if (p.bonuses > 0) {
      entries.push({
        id: `OF-C${++n}`,
        periodId: p.id,
        person: "All Staff",
        role: "Team",
        kind: "Bonus",
        amount: p.bonuses,
        note: p.bonuses >= 300_000 ? "13th-month pay" : "Performance bonus",
      });
    }
  }
  return entries;
}

export const compensationEntries: CompensationEntry[] = buildCompensationEntries();

// ---------- Owner distributions ----------
// Recipients are cast as the business's two owners — deliberately disjoint
// from the celebrity customer pool in lib/orders/mock-celebrity-orders.ts,
// so nobody is simultaneously a paying customer and a distribution
// recipient in this mock universe. Excluded from the expense/profit KPIs by
// design — see lib/owner-financials/types.ts.
export const ownerDistributions: OwnerDistribution[] = [
  { id: "OF-D1", periodId: "OF-P4", date: "2026-02-20", recipient: "Manny Pacquiao", method: "Bank Transfer", amount: 150_000, note: "Q1 owner draw" },
  { id: "OF-D2", periodId: "OF-P10", date: "2026-05-25", recipient: "Kris Aquino", method: "GCash", amount: 120_000, note: "Mid-year draw" },
  { id: "OF-D3", periodId: "OF-P14", date: "2026-07-20", recipient: "Manny Pacquiao", method: "Bank Transfer", amount: 180_000, note: "Q3 partial draw" },
];

// ---------- Change history ----------
export const changeHistory: ChangeEntry[] = [
  {
    id: "OF-H1",
    at: "2026-08-01T21:25:55+08:00",
    who: "Kris Aquino",
    action: "CREATE",
    periodLabel: "2026-01-01 → 2026-12-31",
    details: `Generated ${financialPeriods.length} semi-monthly periods · ${actualPeriods.length} actual, ${projectedPeriods.length} projected`,
  },
  {
    id: "OF-H2",
    at: "2026-08-01T21:26:40+08:00",
    who: "Kris Aquino",
    action: "CREATE",
    periodLabel: "Compensation & Distributions",
    details: `${compensationEntries.length} compensation entries · ${ownerDistributions.length} owner distributions seeded`,
  },
];

// ---------- Monthly rollup ----------
// Semi-monthly periods summed to calendar months, combined and per-branch —
// the shared basis lib/dummy-data.ts and lib/reports/monthly.ts rederive
// their own figures from.
export type MonthlyRollupPoint = {
  monthIndex: number; // 0 = Jan
  month: string; // "Jan"
  revenue: number;
  byBranch: Record<string, number>;
};

function splitByBranch(rng: () => number, total: number): Record<string, number> {
  const jittered = BRANCHES.map((b) => ({ id: b.id, weight: BRANCH_SPLIT[b.id] * (0.92 + rng() * 0.16) }));
  const weightSum = jittered.reduce((s, b) => s + b.weight, 0);
  const out: Record<string, number> = {};
  for (const b of jittered) out[b.id] = Math.round((b.weight / weightSum) * total);
  return out;
}

function buildMonthlyRollup(): MonthlyRollupPoint[] {
  const rng = seeded(20260815);
  const points: MonthlyRollupPoint[] = MONTH_LABELS.map((month, monthIndex) => ({ monthIndex, month, revenue: 0, byBranch: {} }));
  for (const p of financialPeriods) {
    const monthIndex = Number(p.startDate.slice(5, 7)) - 1;
    points[monthIndex].revenue += p.sales;
  }
  for (const point of points) point.byBranch = splitByBranch(rng, point.revenue);
  return points;
}

export const monthlyRollup: MonthlyRollupPoint[] = buildMonthlyRollup();
