// Keeps public.inventory_reservations in sync with one order's current
// status/PAX/dishes. This is the ONLY place that calls the three RPCs in
// supabase/inventory_reservations.sql — every status-change write path
// (Kitchen board, Orders status dropdown) routes through
// lib/orders/data.ts's updateOrderStatus(), which calls syncOrderReservations()
// right after the status write commits, so the two can never drift apart
// the same way lib/kitchen/data.ts already guarantees for status itself.

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getRecipesWithItems } from "@/lib/costing/data";
import { KITCHEN_STAGES } from "@/lib/kitchen/types";
import type { OrderStatus } from "@/lib/orders/types";
import { computeIngredientRequirements } from "./calc";
import { parseCart, parsePackedMealCart, parseSelectedDishes } from "./parse";
import type { OrderDishSource } from "./types";

type OrderReservationRow = {
  id: string;
  order_number: string;
  status: string;
  branch: string | null;
  pax: number | null;
  event_date: string | null;
  cart: unknown;
  packed_meal_cart: unknown;
  selected_dishes: unknown;
};

// Statuses whose inventory should be reserved — "in progress toward being
// cooked," same range lib/kitchen/types.ts already uses for the kitchen
// board's columns (Confirmed through Ready for Delivery). Anything before
// that (Pending Confirmation) hasn't committed the kitchen to anything yet;
// anything after (Completed, Cancelled) is handled separately below.
const RESERVING_STATUSES = new Set<string>(KITCHEN_STAGES);

/** Recomputes and writes this order's inventory reservation to match its
 * current status/PAX/dishes. Call after every write to orders.status (and,
 * once PAX/menu editing exists in this dashboard, after those too) — see
 * lib/orders/data.ts's updateOrderStatus(). Safe to call redundantly; it's
 * always a full replace, never an increment. */
export async function syncOrderReservations(orderId: string): Promise<void> {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("orders")
    .select("id, order_number, status, branch, pax, event_date, cart, packed_meal_cart, selected_dishes")
    .eq("id", orderId)
    .maybeSingle();
  if (error) throw new Error(`Failed to load order for reservation sync: ${error.message}`);
  if (!data) return; // order was deleted out from under us — nothing to reserve

  const row = data as OrderReservationRow;

  if (row.status === "Completed") {
    const { error: rpcError } = await supabase.rpc("consume_order_reservations", { p_order_id: orderId });
    if (rpcError) throw new Error(`Failed to consume inventory reservation: ${rpcError.message}`);
    return;
  }

  if (!RESERVING_STATUSES.has(row.status as OrderStatus)) {
    // Pending Confirmation or Cancelled — nothing should be held for it.
    const { error: rpcError } = await supabase.rpc("release_order_reservations", { p_order_id: orderId });
    if (rpcError) throw new Error(`Failed to release inventory reservation: ${rpcError.message}`);
    return;
  }

  const recipes = await getRecipesWithItems();
  const dishSource: OrderDishSource = {
    pax: row.pax,
    cart: parseCart(row.cart),
    packedMealCart: parsePackedMealCart(row.packed_meal_cart),
    selectedDishes: parseSelectedDishes(row.selected_dishes),
  };

  const { requirements } = computeIngredientRequirements(
    [{ id: row.id, orderNumber: row.order_number, eventDate: row.event_date, ...dishSource }],
    recipes,
  );

  const lines = requirements.map((r) => ({ ingredient_id: r.ingredientId, qty: r.requiredQty }));
  const { error: rpcError } = await supabase.rpc("set_order_reservations", {
    p_order_id: orderId,
    p_branch: row.branch ?? "",
    p_lines: lines,
  });
  if (rpcError) throw new Error(`Failed to reserve inventory: ${rpcError.message}`);
}
