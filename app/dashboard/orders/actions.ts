"use server";

import { revalidatePath } from "next/cache";
import { deleteOrder, updateOrderStatus } from "@/lib/orders/data";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/orders/types";
import { getOrderSlip, type OrderSlip } from "@/lib/orders/slip";
import { isMockOrder } from "@/lib/orders/mock-celebrity-orders";
import { getPackagesData } from "@/lib/menu/data";
import { isHeadCountPackage, type PaxTier } from "@/lib/menu/types";

export async function updateOrderStatusAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as OrderStatus;
  if (!ORDER_STATUSES.includes(status)) throw new Error(`Invalid status "${status}".`);

  // RLS ("Admin update orders", is_admin()) is the real authorization
  // boundary — a non-admin's update simply affects zero rows.
  await updateOrderStatus(id, status);
  revalidatePath("/dashboard/orders");
  revalidatePath("/dashboard/kitchen");
  revalidatePath("/dashboard");
}

/** Powers the batch Status dropdown on the Orders table — a multi-package
 * checkout is one row, so changing its status updates every package in that
 * checkout at once (single-package rows just pass a one-id array). */
export async function updateOrderStatusBatchAction(ids: string[], status: OrderStatus): Promise<void> {
  if (!ORDER_STATUSES.includes(status)) throw new Error(`Invalid status "${status}".`);
  await Promise.all(ids.map((id) => updateOrderStatus(id, status)));
  revalidatePath("/dashboard/orders");
  revalidatePath("/dashboard/kitchen");
  revalidatePath("/dashboard");
}

/** Powers the "View" action on the Orders table — fetches the itemized slip
 * on demand rather than loading it for every row up front. */
export async function getOrderSlipAction(id: string): Promise<OrderSlip | null> {
  // Mock (celebrity) orders never landed in Supabase — id isn't a real uuid,
  // so querying it would throw rather than just miss.
  if (isMockOrder({ id })) return null;
  return getOrderSlip(id);
}

export type PackageMenuItems = {
  /** The matched pax tier's chosen combo name (e.g. "Hapag Pamilya" on
   * Handaan Packages), or null when this fell back to the package's plain
   * Inclusions list instead (Grazing/head-count packages, or no pax match). */
  comboName: string | null;
  items: string[];
};

/** Nearest pax tier to `pax` — exact match first, then whichever tier's pax
 * is closest (a 15-pax order against tiers of 10/20/30 reads the 20-pax
 * menu, not nothing). */
function nearestPaxTier(tiers: PaxTier[], pax: number): PaxTier | undefined {
  if (tiers.length === 0) return undefined;
  const exact = tiers.find((t) => t.pax === pax);
  if (exact) return exact;
  return tiers.slice().sort((a, b) => Math.abs(a.pax - pax) - Math.abs(b.pax - pax))[0];
}

/** herbies' Full-Service Catering ("head-count") checkout is a build-your-
 * own menu: one dish from each of 9 fixed categories (herbies'
 * lib/packages.ts DISH_CATEGORIES), shown on the storefront as "What's
 * Included in the Menu" chips before the customer has actually picked
 * anything. That structure is fixed per herbies' checkout flow, not stored
 * per-package in Supabase — so it's mirrored here as a constant rather than
 * fetched. Once a real customer's dish picks land in Supabase, getOrderSlip
 * already renders their *actual* choices instead of this placeholder. */
const HEAD_COUNT_MENU_CATEGORIES = [
  "1 Chicken Dish",
  "1 Fish Dish",
  "1 Pork Dish",
  "1 Beef Dish",
  "1 Veggie Dish or Salad",
  "1 Type of Soup",
  "Dessert",
  "1 Pasta Dish",
  "Drinks",
];

/** Fallback for the Event Production Sheet: an order's itemized slip only
 * exists once a real cart was placed, which mock (celebrity) orders and
 * some checkouts never have. For a pax-tiered package (e.g. Handaan
 * Packages) the real menu — the mains/sides/snacks a customer at that pax
 * count actually gets — lives on the matching PaxTier's combo, so this
 * picks the tier nearest the order's pax and returns its first combo's
 * dishes. A head-count (Full-Service Catering) package has no such tiered
 * menu — it's the build-your-own-menu flow instead — so that case returns
 * the fixed 9-category "What's Included in the Menu" list herbies' own
 * checkout shows for it. Everything else (Grazing, or a package lookup
 * miss) falls back to the package's plain Inclusions text — service terms
 * like "Free delivery within city limits", not dish names. Matched by name
 * since a mock order only ever kept the package's name, not its slug. */
export async function getPackageMenuItemsAction(packageName: string, pax: number | null): Promise<PackageMenuItems> {
  const packages = await getPackagesData();
  const pkg = packages.find((p) => p.name.trim().toLowerCase() === packageName.trim().toLowerCase());
  if (!pkg) return { comboName: null, items: [] };

  if (pax && pkg.paxTiers.length > 0) {
    const tier = nearestPaxTier(pkg.paxTiers, pax);
    const menu = tier?.menus[0];
    const items = menu ? [...menu.mains, ...menu.sides, ...menu.snacks] : [];
    if (items.length > 0) return { comboName: menu!.name, items };
  }

  if (isHeadCountPackage(pkg)) return { comboName: null, items: HEAD_COUNT_MENU_CATEGORIES };

  return { comboName: null, items: pkg.inclusions };
}

/** Powers the per-order "Delete" action in the client order-history modal —
 * lets duplicate/test bookings be removed straight from the dashboard. */
export async function deleteOrderAction(id: string): Promise<void> {
  if (isMockOrder({ id })) throw new Error("Demo orders can't be deleted.");
  await deleteOrder(id);
  revalidatePath("/dashboard/orders");
  revalidatePath("/dashboard/kitchen");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/inquiries");
  revalidatePath("/dashboard/bookings");
  revalidatePath("/dashboard/customers");
}
