// Reads public.inventory_reservations (supabase/inventory_reservations.sql)
// — the write side lives in lib/requirements/data.ts's syncOrderReservations,
// called from every order status change. This file only reads: "how much of
// ingredient X is currently held for confirmed-but-not-yet-completed
// events", which is what the brief's "Available = Physical - Reserved"
// formula and the ingredient detail drawer's "why is this reserved" list
// both need.

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ReservationDetail = {
  orderId: string;
  orderNumber: string;
  eventDate: string | null;
  branch: string;
  qty: number;
};

type ReservationRow = {
  ingredient_id: string;
  branch: string;
  qty: number;
  order_id: string;
  orders: { order_number: string; event_date: string | null } | { order_number: string; event_date: string | null }[] | null;
};

function orderInfo(rel: ReservationRow["orders"]): { order_number: string; event_date: string | null } {
  const fallback = { order_number: "—", event_date: null };
  if (!rel) return fallback;
  return Array.isArray(rel) ? (rel[0] ?? fallback) : rel;
}

/** Reserved quantity per ingredient, summed across every branch — matches
 * how getIngredientsWithStock() already sums physical stock across branches
 * for the Inventory Overview headline numbers. Per-branch detail lives in
 * `sources` for anything that needs the breakdown (the detail drawer). */
export type IngredientReservations = {
  ingredientId: string;
  totalReserved: number;
  byBranch: Record<string, number>;
  sources: ReservationDetail[];
};

export async function getReservationsByIngredient(): Promise<Map<string, IngredientReservations>> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("inventory_reservations")
    .select("ingredient_id, branch, qty, order_id, orders(order_number, event_date)");
  if (error) throw new Error(`Failed to load inventory reservations: ${error.message}`);

  const map = new Map<string, IngredientReservations>();
  for (const row of data as unknown as ReservationRow[]) {
    const info = orderInfo(row.orders);
    let entry = map.get(row.ingredient_id);
    if (!entry) {
      entry = { ingredientId: row.ingredient_id, totalReserved: 0, byBranch: {}, sources: [] };
      map.set(row.ingredient_id, entry);
    }
    entry.totalReserved += row.qty;
    entry.byBranch[row.branch] = (entry.byBranch[row.branch] ?? 0) + row.qty;
    entry.sources.push({
      orderId: row.order_id,
      orderNumber: info.order_number,
      eventDate: info.event_date,
      branch: row.branch,
      qty: row.qty,
    });
  }
  return map;
}
