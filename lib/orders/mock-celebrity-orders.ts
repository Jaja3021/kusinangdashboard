// "Incoming" mock orders (Aug 16 – Dec 31, 2026) under well-known Filipino
// celebrity names, merged with real Supabase orders server-side (see
// app/dashboard/{orders,inquiries,customers,bookings,kitchen}/page.tsx).
// Nothing here is written to Supabase; ids are prefixed "MOCK-ORD-" so
// OrdersClient.tsx/KitchenBoard.tsx can route status edits on these rows to
// local/shared state instead of the real updateOrderStatus() server action.
//
// Package names come from the SAME place the Menu page's Group column does
// — the live Supabase `packages` table, grouped by `category` — passed in
// by the calling server page via buildMockCelebrityOrders(packages). If the
// live catalog has nothing usable (no packages, or none in a shape with a
// single sellable price), this falls back to the offline
// lib/menu/dummy-catalog.ts list so the feature never goes empty.
//
// buildMockCelebrityOrders() is only ever called server-side (the pages
// above pass the *result* down as props) — the client never re-runs the
// generator, so unlike a module-level const there's no hydration-mismatch
// constraint here. isMockOrder() stays a plain string check and is safe to
// import directly into client components.

import { CELEBRITIES } from "@/lib/celebrities";
import { menuPackages, grazingSpreads, cateringPackages, packedMeals, type MenuPackage } from "@/lib/menu/dummy-catalog";
import { packageBasePriceInfo, packageShape, type PackageType } from "@/lib/menu/types";
import { BRANCHES } from "@/lib/mt/branches";
import { addDays, daysUntil, todayManila } from "@/lib/mt/dates";
import type { OrderRecord, OrderStatus } from "./types";

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

const TODAY = todayManila();

// A couple of celebrities book a second event under the same email, so
// Customers shows at least one repeat booking / Platinum-tier row.
const REPEAT_BOOKERS = new Set(["Anne Curtis", "Dingdong Dantes"]);

const EVENT_TYPES = [
  "Wedding Package", "Kids Party Package", "Debut Package",
  "Corporate Event", "Private Event", "Tray Orders",
];

const EVENT_TIMES = ["11:00 AM", "12:00 PM", "1:00 PM", "5:00 PM", "6:00 PM", "6:30 PM", "7:00 PM"];

const VENUES: Record<string, string[]> = {
  cavite: ["Tagaytay Highlands Clubhouse", "Cavite Sports Complex", "Barangay Covered Court, Imus"],
  laguna: ["Laguna Grand Ballroom", "Pagsanjan Falls Resort", "Sta. Rosa Events Place"],
  "metro-manila": ["The Peninsula Manila Ballroom", "Diamond Hotel Manila", "Quezon City Circle Grounds"],
};

// ---------- Package selection ----------
// A "choice" is a sellable package, whichever catalog it came from. Packed
// meals are always per-piece bulk orders from the static catalog (a live
// packed-meal package prices per dish, with no single total to draw from —
// see lib/menu/types.ts's packageBasePriceInfo).
type FixedChoice = { kind: "fixed"; name: string; group: string; price: number; paxLabel: string | null; pax: number; branchIds: string[] | null };
type HeadCountChoice = { kind: "head-count"; name: string; group: string; pricePerHead: number; minHeadCount: number; branchIds: string[] | null };
type PackageChoice = FixedChoice | HeadCountChoice;

function parsePax(paxLabel: string | null): number {
  if (!paxLabel) return 0;
  const n = parseInt(paxLabel, 10);
  return Number.isFinite(n) ? n : 0;
}

/** Live Supabase packages, grouped by the same `category` the Menu page's Group column shows — restricted to shapes with one sellable total (pax-tiered/fixed-menu/head-count). */
function liveChoices(packages: PackageType[]): PackageChoice[] {
  const out: PackageChoice[] = [];
  for (const pkg of packages) {
    if (!pkg.active) continue;
    const shape = packageShape(pkg);
    if (shape === "tray-cart" || shape === "packed-meal") continue;

    const branchIds = pkg.branch && pkg.branch.length > 0 ? pkg.branch : null;

    if (shape === "head-count") {
      out.push({
        kind: "head-count",
        name: pkg.name,
        group: pkg.category,
        pricePerHead: pkg.pricePerHead ?? 0,
        minHeadCount: pkg.minimumHeadCount ?? 50,
        branchIds,
      });
      continue;
    }

    const info = packageBasePriceInfo(pkg);
    if (info.price == null) continue;
    const paxLabel = info.paxLabel === "—" ? null : info.paxLabel;
    out.push({ kind: "fixed", name: pkg.name, group: pkg.category, price: info.price, paxLabel, pax: parsePax(paxLabel), branchIds });
  }
  return out;
}

/** Offline fallback — used only when the live catalog has nothing usable. */
function catalogChoices(): PackageChoice[] {
  return [...menuPackages, ...grazingSpreads, ...cateringPackages]
    .filter((p) => p.active)
    .map((p) => ({
      kind: "fixed" as const,
      name: p.name,
      group: p.group,
      price: p.basePrice,
      paxLabel: p.pax || null,
      pax: parsePax(p.pax || null),
      branchIds: null,
    }));
}

const PACKED_MEAL_POOL: MenuPackage[] = packedMeals.filter((p) => p.active);

/** Weighted by lead time — a future event can't already be "Completed", and only near-term ones are mid-prep. */
function statusFor(rng: () => number, daysOut: number): OrderStatus {
  const roll = rng();
  if (daysOut > 30) {
    if (roll < 0.6) return "Pending Confirmation";
    if (roll < 0.95) return "Confirmed";
    return "Cancelled";
  }
  if (daysOut > 7) {
    if (roll < 0.15) return "Pending Confirmation";
    if (roll < 0.85) return "Confirmed";
    if (roll < 0.95) return "Preparing";
    return "Cancelled";
  }
  // Inside a week: active prep pipeline.
  if (roll < 0.2) return "Confirmed";
  if (roll < 0.6) return "Preparing";
  if (roll < 0.8) return "Cooking";
  if (roll < 0.95) return "Ready for Delivery";
  return "Cancelled";
}

function buildOrder(
  rng: () => number,
  celeb: { first: string; last: string },
  index: number,
  eventDate: string,
  pool: PackageChoice[],
): OrderRecord {
  const branch = pick(rng, BRANCHES).id;
  const usePackedMeal = pool.length === 0 || rng() < 0.25;

  let packageName: string;
  let packageGroup: string;
  let quantityLabel: string | null;
  let pax: number;
  let total: number;

  if (usePackedMeal) {
    const meal = pick(rng, PACKED_MEAL_POOL);
    const count = between(rng, 30, 150);
    packageName = meal.name;
    packageGroup = meal.group;
    quantityLabel = `${count} pcs`;
    pax = count;
    total = meal.basePrice * count;
  } else {
    const candidates = pool.filter((c) => !c.branchIds || c.branchIds.includes(branch));
    const choice = pick(rng, candidates.length > 0 ? candidates : pool);
    packageName = choice.name;
    packageGroup = choice.group;
    if (choice.kind === "head-count") {
      const headcount = between(rng, choice.minHeadCount, choice.minHeadCount + 150);
      quantityLabel = `${headcount}+ pax`;
      pax = headcount;
      total = choice.pricePerHead * headcount;
    } else {
      quantityLabel = choice.paxLabel;
      pax = choice.pax;
      total = choice.price;
    }
  }

  const daysOut = daysUntil(eventDate, TODAY) ?? 60;
  const status = statusFor(rng, daysOut);
  const createdAt = `${addDays(eventDate, -between(rng, 15, 90))}T${String(between(rng, 8, 19)).padStart(2, "0")}:${String(between(rng, 0, 59)).padStart(2, "0")}:00+08:00`;

  const handle = `${celeb.first}.${celeb.last}`.toLowerCase().replace(/\s+/g, "");

  return {
    id: `MOCK-ORD-${index + 1}`,
    orderNumber: `KP-CEL-${1000 + index}`,
    status,
    // Demo orders carry no real payment record; a Completed one reads as
    // Paid and everything else as Unpaid, which is enough for the Bookings
    // filters to have something coherent to show. The Catering Calendar
    // merges these in like any other order (app/dashboard/calendar/page.tsx)
    // and they DO count toward capacity — there being no live orders left
    // to book against would otherwise make capacity look permanently empty.
    paymentStatus: status === "Completed" ? "Paid" : "Unpaid",
    packageName,
    packageGroup,
    quantityLabel,
    pax,
    eventType: pick(rng, EVENT_TYPES),
    eventDate,
    eventTime: pick(rng, EVENT_TIMES),
    venue: pick(rng, VENUES[branch] ?? VENUES.cavite),
    branch,
    firstName: celeb.first,
    lastName: celeb.last,
    email: `${handle}@gmail.com`,
    phone: `09${between(rng, 10, 39)} ${between(rng, 100, 999)} ${between(rng, 1000, 9999)}`,
    total,
    createdAt,
    batchId: null,
  };
}

/** Called server-side by each consuming page with that request's live packages. */
export function buildMockCelebrityOrders(packages: PackageType[]): OrderRecord[] {
  const rng = seeded(20260816);
  const live = liveChoices(packages);
  const pool = live.length > 0 ? live : catalogChoices();

  const orders: OrderRecord[] = [];
  const rangeStart = "2026-08-16";
  const rangeEnd = "2026-12-31";
  const spanDays = daysUntil(rangeEnd, rangeStart) ?? 137;

  let index = 0;
  for (const celeb of CELEBRITIES) {
    const eventDate = addDays(rangeStart, between(rng, 0, spanDays));
    orders.push(buildOrder(rng, celeb, index, eventDate, pool));
    index++;

    const fullName = `${celeb.first} ${celeb.last}`;
    if (REPEAT_BOOKERS.has(fullName)) {
      const secondEventDate = addDays(rangeStart, between(rng, 0, spanDays));
      orders.push(buildOrder(rng, celeb, index, secondEventDate, pool));
      index++;
    }
  }

  return orders.sort((a, b) => (a.eventDate ?? "").localeCompare(b.eventDate ?? ""));
}

export function isMockOrder(order: Pick<OrderRecord, "id">): boolean {
  return order.id.startsWith("MOCK-ORD-");
}

// A handful of walk-in clients forced onto TODAY's date specifically —
// separate from the year-long celebrity spread above (which almost never
// lands anything on "today") so the Overview page's "Today's Orders" widget
// and the Payments dashboard (lib/payments/mock-payments.ts consumes these
// same records, filtered to whichever of these are "Confirmed") always have
// something to show in a fresh environment. Index-offset by 9000 so ids
// never collide with buildMockCelebrityOrders'.
const TODAY_WALKIN_CLIENTS: { first: string; last: string; status: OrderStatus }[] = [
  { first: "Ramon", last: "Aviles", status: "Confirmed" },
  { first: "Ligaya", last: "Santos", status: "Confirmed" },
  { first: "Bettina", last: "Cruz", status: "Confirmed" },
  { first: "Marcelo", last: "Reyes", status: "Confirmed" },
  { first: "Isabel", last: "Domingo", status: "Confirmed" },
  { first: "Teodoro", last: "Bautista", status: "Preparing" },
];

export function buildTodaysMockOrders(packages: PackageType[]): OrderRecord[] {
  const rng = seeded(20260825);
  const live = liveChoices(packages);
  const pool = live.length > 0 ? live : catalogChoices();
  // Status is fixed per client above rather than left to statusFor()'s dice
  // roll — these represent clients who already walked in and confirmed
  // today, which is the whole reason they exist as demo data.
  return TODAY_WALKIN_CLIENTS.map((client, i) => ({
    ...buildOrder(rng, client, 9000 + i, TODAY, pool),
    status: client.status,
    paymentStatus: client.status === "Confirmed" ? "Paid" : "Unpaid",
  }));
}
