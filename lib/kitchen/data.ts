import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity-log/data";
import type { DishLine, KitchenOrder, KitchenStage } from "./types";

type OrderRow = {
  id: string;
  order_number: string;
  status: string;
  package_name: string;
  quantity_label: string | null;
  pax: number | null;
  event_date: string | null;
  event_time: string | null;
  branch: string | null;
  delivery_method: string | null;
  instructions: string | null;
  first_name: string;
  last_name: string;
  cart: unknown;
  packed_meal_cart: unknown;
  selected_dishes: unknown;
  menu_snapshot: unknown;
};

const ORDER_COLUMNS =
  "id, order_number, status, package_name, quantity_label, pax, event_date, event_time, branch, delivery_method, instructions, first_name, last_name, cart, packed_meal_cart, selected_dishes, menu_snapshot";

type LineItem = { name?: unknown; dish?: unknown; label?: unknown; item?: unknown; qty?: unknown; quantity?: unknown; count?: unknown };

function pickName(item: unknown): string | null {
  if (typeof item === "string") return item;
  if (item && typeof item === "object") {
    const o = item as LineItem;
    const name = o.name ?? o.dish ?? o.label ?? o.item;
    return typeof name === "string" && name.trim() ? name : null;
  }
  return null;
}

function pickQty(item: unknown): number {
  if (item && typeof item === "object") {
    const o = item as LineItem;
    const q = o.qty ?? o.quantity ?? o.count;
    if (typeof q === "number" && q > 0) return q;
  }
  return 1;
}

function fromArray(value: unknown): DishLine[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => ({ qty: pickQty(item), name: pickName(item) })).filter((d): d is DishLine => !!d.name);
}

function fromSelectedDishes(value: unknown): DishLine[] {
  if (Array.isArray(value)) return fromArray(value);
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, v]) => {
        if (typeof v === "number") return { qty: v, name: key };
        return { qty: pickQty(v), name: pickName(v) ?? key };
      })
      .filter((d) => d.qty > 0 && d.name);
  }
  return [];
}

function fromMenuSnapshot(value: unknown): DishLine[] {
  if (!value || typeof value !== "object") return [];
  const s = value as { mains?: string[]; sides?: string[]; snacks?: string[] };
  return [...(s.mains ?? []), ...(s.sides ?? []), ...(s.snacks ?? [])].map((name) => ({ qty: 1, name }));
}

/** Best-effort dish list — the real `orders` row shapes `cart`/`packed_meal_cart`/
 * `selected_dishes` differently per order type, so every source is tried in
 * order of specificity and the first one with any lines wins. */
function parseDishes(row: OrderRow): DishLine[] {
  const sources = [row.cart, row.packed_meal_cart, row.selected_dishes, row.menu_snapshot];
  const parsers = [fromArray, fromArray, fromSelectedDishes, fromMenuSnapshot];
  for (let i = 0; i < sources.length; i++) {
    const lines = parsers[i](sources[i]);
    if (lines.length > 0) return lines;
  }
  return [];
}

function rowToKitchenOrder(row: OrderRow, stage: KitchenStage): KitchenOrder {
  return {
    id: row.id,
    orderNumber: row.order_number,
    customer: `${row.first_name} ${row.last_name}`.trim(),
    eventDate: row.event_date,
    eventTime: row.event_time,
    pax: row.pax,
    quantityLabel: row.quantity_label,
    packageName: row.package_name,
    branch: row.branch,
    deliveryMethod: row.delivery_method,
    instructions: row.instructions,
    dishes: parseDishes(row),
    stage,
  };
}

/** Every order still in flight (not cancelled or completed), each mapped to
 * its kitchen-prep stage — "Upcoming Orders" for any order with no
 * kitchen_stages row yet. */
export async function getKitchenBoard(): Promise<KitchenOrder[]> {
  const supabase = createSupabaseServerClient();

  const { data: orderRows, error: orderError } = await supabase
    .from("orders")
    .select(ORDER_COLUMNS)
    .not("status", "in", "(Cancelled,Completed)")
    .order("event_date", { ascending: true })
    .order("event_time", { ascending: true });
  if (orderError) throw new Error(`Failed to load orders: ${orderError.message}`);

  const { data: stageRows, error: stageError } = await supabase.from("kitchen_stages").select("order_id, stage");
  if (stageError) throw new Error(`Failed to load kitchen stages: ${stageError.message}`);

  const stageByOrder = new Map((stageRows as { order_id: string; stage: KitchenStage }[]).map((r) => [r.order_id, r.stage]));

  return (orderRows as OrderRow[]).map((row) => rowToKitchenOrder(row, stageByOrder.get(row.id) ?? "Upcoming Orders"));
}

export async function setKitchenStage(orderId: string, stage: KitchenStage): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("kitchen_stages").upsert({ order_id: orderId, stage }, { onConflict: "order_id" });
  if (error) throw new Error(`Failed to update kitchen stage: ${error.message}`);

  const { data: order } = await supabase.from("orders").select("order_number, first_name, last_name").eq("id", orderId).maybeSingle();
  const o = order as { order_number: string; first_name: string; last_name: string } | null;
  await logActivity({
    module: "Kitchen",
    action: "UPDATE",
    entity: "Order",
    name: o ? `${o.first_name} ${o.last_name}`.trim() || o.order_number : "",
    details: `Moved to ${stage}`,
  });
}
