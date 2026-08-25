// The Overview page's CRM pipeline — regenerated from the same shared model
// as Owner Financials (lib/owner-financials/mock.ts) and the celebrity
// order roster (lib/celebrities.ts), instead of an unrelated invented
// dataset. Deterministic (mulberry32, same helper used throughout this
// session's mock modules) — this module renders on both server and client
// (OverviewClient.tsx, NotificationsMenu.tsx import it directly at module
// scope), so every value must come from the fixed seed, never
// Math.random()/new Date().
//
// The exact-tie mechanism: for each ACTUAL financial period, a period's
// `sales` figure is split across the 3 branches, then each branch's share
// is split across 1–2 "won" records — both splits use a normalize-then-
// round-with-remainder trick so the pieces sum back to *exactly* the whole.
// Summed across all 15 actual periods, every won+billable record's `amount`
// therefore totals exactly the Owner Financials/Sales-page actual-to-date
// figure. Projected periods (Aug 16 – Dec 31) become "open" records instead
// — future work belongs in the pipeline, not booked revenue.

import { CELEBRITIES } from "@/lib/celebrities";
import { menuPackages, grazingSpreads, cateringPackages, packedMeals } from "@/lib/menu/dummy-catalog";
import { financialPeriods } from "@/lib/owner-financials/mock";
import type { FinancialPeriod } from "@/lib/owner-financials/types";
import { BRANCHES, BRANCH_NAMES } from "./branches";
import { addDays, daysUntil } from "./dates";
import type {
  InquirySource,
  Opportunity,
  OrderStatus,
  PaymentStage,
  PipelineStatus,
  StageName,
} from "./types";

/** mulberry32 — same helper as lib/owner-financials/mock.ts and lib/orders/mock-celebrity-orders.ts. */
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
const between = (rng: () => number, min: number, max: number): number => min + Math.floor(rng() * (max - min + 1));

// Matches the split already used in lib/owner-financials/mock.ts's DUMMY_BASE-derived rollup.
const BRANCH_WEIGHT: Record<string, number> = { cavite: 0.42, laguna: 0.25, "metro-manila": 0.33 };

const EVENT_TYPES = [
  "Wedding Reception", "Debut", "Christening", "Corporate Gala",
  "Birthday Party", "Fiesta Reunion", "Anniversary", "Graduation Lunch",
  "Baptism", "Corporate Lunch",
];

const EVENT_TIMES = ["10:00 AM", "11:30 AM", "12:00 PM", "5:00 PM", "6:30 PM", "7:00 PM"];

// Weighted so the donut has a clear leader and a believable long tail.
const SOURCES: InquirySource[] = [
  "Facebook", "Facebook", "Facebook", "Facebook",
  "Referral", "Referral", "Referral",
  "Instagram", "Instagram",
  "Messenger", "Messenger",
  "Walk-in",
  "Website",
];

// "3 Days Before Event" is what makes lib/mt/notifications.ts's "order-arrived"
// alert reachable; "Completed" is handled as its own explicit branch below,
// not drawn from this pool.
const WON_STAGES: StageName[] = [
  "Confirmed", "Upcoming Event", "Half Paid", "Fully Paid", "3 Days Before Event",
  "Clear to Delivered", "Ready for Pickup", "Delivered", "Order Confirmed",
];

const OPEN_STAGES: StageName[] = ["New Inquiry", "Contacted", "Awaiting Confirmation"];

// Package names only — purely decorative flavor text here, since this
// module (unlike lib/orders/mock-celebrity-orders.ts) is imported directly
// into client components and must stay synchronous, so it can't depend on
// the live Supabase `packages` table.
const PACKAGE_NAMES: string[] = [...menuPackages, ...grazingSpreads, ...cateringPackages, ...packedMeals]
  .filter((p) => p.active)
  .map((p) => p.name);

/** Splits `total` across the 3 branches by the weighted ratios above (with jitter), summing back to exactly `total`. */
function splitAcrossBranches(rng: () => number, total: number): { branch: string; amount: number }[] {
  const jittered = BRANCHES.map((b) => ({ branch: b.name, weight: BRANCH_WEIGHT[b.id] * (0.9 + rng() * 0.2) }));
  const weightSum = jittered.reduce((s, b) => s + b.weight, 0);
  const out = jittered.map((b) => ({ branch: b.branch, amount: Math.round((b.weight / weightSum) * total) }));
  out[out.length - 1].amount += total - out.reduce((s, b) => s + b.amount, 0);
  return out;
}

/** Splits `total` into `count` positive pieces, summing back to exactly `total`. */
function splitIntoPieces(rng: () => number, total: number, count: number): number[] {
  if (count <= 1) return [total];
  const weights = Array.from({ length: count }, () => 0.4 + rng() * 0.6);
  const weightSum = weights.reduce((a, b) => a + b, 0);
  const amounts = weights.map((w) => Math.round((w / weightSum) * total));
  amounts[amounts.length - 1] += total - amounts.reduce((a, b) => a + b, 0);
  return amounts;
}

let recordIndex = 0;

function baseFields(rng: () => number, period: FinancialPeriod) {
  recordIndex++;
  const celeb = pick(rng, CELEBRITIES);
  const spanDays = daysUntil(period.endDate, period.startDate) ?? 14;
  const eventDate = addDays(period.startDate, between(rng, 0, spanDays));
  const createdDate = addDays(eventDate, -between(rng, 20, 120));
  const handle = `${celeb.first}.${celeb.last}`.toLowerCase().replace(/\s+/g, "");
  return {
    id: `OPP-${1000 + recordIndex}`,
    reference: `KP-${24000 + recordIndex}`,
    name: `${celeb.first} ${celeb.last}`,
    email: `${handle}@gmail.com`,
    phone: `09${between(rng, 10, 39)} ${between(rng, 100, 999)} ${between(rng, 1000, 9999)}`,
    eventDate,
    eventTime: pick(rng, EVENT_TIMES),
    createdDate,
    lastModified: `${addDays(eventDate, -between(rng, 0, 18))}T0${between(rng, 1, 9)}:${String(between(rng, 10, 59)).padStart(2, "0")}:00+08:00`,
    eventType: pick(rng, EVENT_TYPES),
    packageName: pick(rng, PACKAGE_NAMES),
    pax: between(rng, 20, 300),
    source: pick(rng, SOURCES),
    notes: "",
  };
}

/** A confirmed, revenue-bearing booking — `amount` is dictated by the exact-tie split above, not randomly derived. */
function buildWon(rng: () => number, branch: string, amount: number, period: FinancialPeriod): Opportunity {
  const completed = rng() < 0.8;
  const stageName: StageName = completed ? "Completed" : pick(rng, WON_STAGES);
  const paymentStage: PaymentStage = completed ? "Completed" : "Full Payment";
  const status: OrderStatus = completed ? "Completed" : "Confirmed";
  return {
    ...baseFields(rng, period),
    branch,
    stageName,
    pipelineStatus: "won",
    paymentStage,
    amount,
    amountPaid: amount,
    status,
  };
}

/** Open pipeline work — future periods' un-won estimate, or a still-negotiating deal inside an already-actual period. */
function buildOpen(rng: () => number, branch: string, targetAmount: number, period: FinancialPeriod): Opportunity {
  const partial = rng() < 0.6;
  const paymentStage: PaymentStage = partial ? "Partial Payment" : "New Inquiry";
  const stageName: StageName = partial ? (rng() < 0.5 ? "Half Paid" : "Awaiting Balance") : pick(rng, OPEN_STAGES);
  const status: OrderStatus = partial ? "For Preparation" : "New";
  const amount = Math.max(5_000, Math.round(targetAmount * (0.4 + rng() * 0.5)));
  const amountPaid = partial ? Math.round(amount * 0.4) : 0;
  return {
    ...baseFields(rng, period),
    branch,
    stageName,
    pipelineStatus: "open",
    paymentStage,
    amount,
    amountPaid,
    status,
  };
}

/** A deal that fell through — feeds Refunded/Lost and the cancellation notification, doesn't count toward any revenue total. */
function buildLost(rng: () => number, branch: string, period: FinancialPeriod): Opportunity {
  const amount = between(rng, 15_000, 90_000);
  const amountPaid = rng() < 0.5 ? Math.round(amount * 0.25) : 0;
  return {
    ...baseFields(rng, period),
    branch,
    stageName: "Cancelled",
    pipelineStatus: "lost" as PipelineStatus,
    paymentStage: "Cancelled",
    amount,
    amountPaid,
    status: "Cancelled",
  };
}

function build(): Opportunity[] {
  const rng = seeded(20260811);
  const out: Opportunity[] = [];

  for (const period of financialPeriods) {
    if (period.kind === "actual") {
      // The exact-tie won records.
      for (const { branch, amount } of splitAcrossBranches(rng, period.sales)) {
        const count = between(rng, 1, 2);
        for (const piece of splitIntoPieces(rng, amount, count)) {
          out.push(buildWon(rng, branch, piece, period));
        }
      }
      // Flavor — variety for New Inquiries / the donut / Refunded-Lost / notifications,
      // not counted toward any exact total.
      if (rng() < 0.4) out.push(buildLost(rng, pick(rng, BRANCH_NAMES), period));
      const openFlavor = between(rng, 0, 2);
      for (let i = 0; i < openFlavor; i++) {
        out.push(buildOpen(rng, pick(rng, BRANCH_NAMES), period.sales / 6, period));
      }
    } else {
      // Projected periods: everything is still open pipeline work.
      for (const { branch, amount } of splitAcrossBranches(rng, period.sales)) {
        const count = between(rng, 1, 2);
        for (const piece of splitIntoPieces(rng, amount, count)) {
          out.push(buildOpen(rng, branch, piece, period));
        }
      }
      if (rng() < 0.15) out.push(buildLost(rng, pick(rng, BRANCH_NAMES), period));
    }
  }

  return out;
}

export const opportunities: Opportunity[] = build();

/** Receipts uploaded and waiting on a human — feeds the review notification. */
export const pendingReceipts = 3;
