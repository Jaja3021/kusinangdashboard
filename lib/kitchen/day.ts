// Shared per-day view model for Kitchen Today, Kitchen Board, and Market
// List — three different views over the same "one kitchen, one day" slice of
// public.orders. Keeping the dish/size reconstruction in one place means the
// three pages can never disagree about what a given order actually contains.

import { getBranchById } from "@/lib/mt/branches";
import type { PackageType } from "@/lib/menu/types";
import type { OrderWithMenu } from "@/lib/orders/data";

export type DayDish = { name: string; qty: number; size: string };

export type DayOrder = OrderWithMenu & {
  customer: string;
  branchName: string;
  dishes: DayDish[];
  /** False when none of cart/packed_meal_cart/menu_snapshot yielded a single
   * dish line — the order exists but its contents can't be reconstructed. */
  readable: boolean;
};

/** Rough tray size for a dish that has no size of its own (a combo/grazing/
 * catering menu's mains/sides/snacks) — bucketed off the order's pax, purely
 * for the production-summary breakdown, not a pricing signal. */
function traySizeForPax(pax: number | null): string {
  if (pax == null) return "XXXL";
  if (pax <= 15) return "Family";
  if (pax <= 40) return "Feast";
  return "XXXL";
}

function fromCart(cart: unknown, trayNames: Map<string, string>): DayDish[] {
  if (!Array.isArray(cart)) return [];
  const out: DayDish[] = [];
  for (const item of cart) {
    if (!item || typeof item !== "object") continue;
    const o = item as { dishId?: unknown; size?: unknown; qty?: unknown };
    if (typeof o.dishId !== "string") continue;
    const qty = typeof o.qty === "number" && o.qty > 0 ? o.qty : 1;
    out.push({ name: trayNames.get(o.dishId) ?? o.dishId, qty, size: typeof o.size === "string" ? o.size : "—" });
  }
  return out;
}

function fromPackedMealCart(cart: unknown): DayDish[] {
  if (!Array.isArray(cart)) return [];
  const out: DayDish[] = [];
  for (const item of cart) {
    if (!item || typeof item !== "object") continue;
    const o = item as { dish?: unknown; qty?: unknown };
    if (typeof o.dish !== "string" || !o.dish.trim()) continue;
    const qty = typeof o.qty === "number" && o.qty > 0 ? o.qty : 1;
    out.push({ name: o.dish, qty, size: `${qty} pcs` });
  }
  return out;
}

function fromMenuSnapshot(snapshot: unknown, fallbackSize: string): DayDish[] {
  if (!snapshot || typeof snapshot !== "object") return [];
  const s = snapshot as { mains?: unknown; sides?: unknown; snacks?: unknown };
  const names = [
    ...(Array.isArray(s.mains) ? s.mains : []),
    ...(Array.isArray(s.sides) ? s.sides : []),
    ...(Array.isArray(s.snacks) ? s.snacks : []),
  ];
  return names
    .filter((n): n is string => typeof n === "string" && n.trim().length > 0)
    .map((name) => ({ name, qty: 1, size: fallbackSize }));
}

/** dishId -> display name for every package with a tray catalog (currently
 * just Party Trays), so a tray-cart order's `cart` resolves to real names
 * instead of raw slugs. */
export function trayNamesByPackage(packages: PackageType[]): Map<string, Map<string, string>> {
  const out = new Map<string, Map<string, string>>();
  for (const pkg of packages) {
    if (!pkg.trayCatalog) continue;
    out.set(pkg.slug, new Map(pkg.trayCatalog.map((d) => [d.id, d.name])));
  }
  return out;
}

function resolveDishes(order: OrderWithMenu, trayNames: Map<string, Map<string, string>>): DayDish[] {
  const names = (order.packageSlug && trayNames.get(order.packageSlug)) || new Map<string, string>();
  const cartLines = fromCart(order.cart, names);
  if (cartLines.length > 0) return cartLines;
  const packedLines = fromPackedMealCart(order.packedMealCart);
  if (packedLines.length > 0) return packedLines;
  return fromMenuSnapshot(order.menuSnapshot, traySizeForPax(order.pax));
}

export function buildDayOrders(orders: OrderWithMenu[], packages: PackageType[]): DayOrder[] {
  const trayNames = trayNamesByPackage(packages);
  return orders.map((order) => {
    const dishes = resolveDishes(order, trayNames);
    return {
      ...order,
      customer: `${order.firstName} ${order.lastName}`.trim(),
      branchName: (order.branch && getBranchById(order.branch)?.name) || order.branch || "—",
      dishes,
      readable: dishes.length > 0,
    };
  });
}

export type ProductionLine = {
  name: string;
  qty: number;
  breakdown: string;
  orderCount: number;
};

/** One row per distinct dish name across every countable order (readable,
 * not cancelled) — the numbers Kitchen Board's Production Summary and
 * Market List's "What to cook" both render. */
export function buildProductionSummary(dayOrders: DayOrder[]): ProductionLine[] {
  const map = new Map<string, { qty: number; sizes: Map<string, number>; orders: Set<string> }>();
  for (const o of dayOrders) {
    if (o.status === "Cancelled" || !o.readable) continue;
    for (const d of o.dishes) {
      let entry = map.get(d.name);
      if (!entry) {
        entry = { qty: 0, sizes: new Map(), orders: new Set() };
        map.set(d.name, entry);
      }
      entry.qty += d.qty;
      entry.sizes.set(d.size, (entry.sizes.get(d.size) ?? 0) + d.qty);
      entry.orders.add(o.id);
    }
  }
  return [...map.entries()]
    .map(([name, e]) => ({
      name,
      qty: e.qty,
      breakdown: [...e.sizes.entries()].map(([size, qty]) => `${qty} ${size}`).join(", "),
      orderCount: e.orders.size,
    }))
    .sort((a, b) => b.qty - a.qty || a.name.localeCompare(b.name));
}

export type PackageMixLine = { label: string; orderCount: number };

/** "1 order — Party Trays", grouped by package (+ named combo, where the
 * order picked one) — the Day Summary / "What to cook" package-mix list. */
export function buildPackageMix(dayOrders: DayOrder[]): PackageMixLine[] {
  const counts = new Map<string, number>();
  for (const o of dayOrders) {
    if (o.status === "Cancelled") continue;
    const label = o.menuName && o.menuName !== o.packageName ? `${o.packageName} — ${o.menuName}` : o.packageName || "—";
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, orderCount]) => ({ label, orderCount }))
    .sort((a, b) => b.orderCount - a.orderCount || a.label.localeCompare(b.label));
}
