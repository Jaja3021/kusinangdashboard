import { createSupabaseServerClient } from "@/lib/supabase/server";
import { syncOrderReservations } from "@/lib/requirements/data";
import type { OrderRecord, OrderStatus, PaymentStatus } from "./types";

type OrderRow = {
  id: string;
  order_number: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  package_name: string;
  quantity_label: string | null;
  pax: number | null;
  event_type: string | null;
  event_date: string | null;
  event_time: string | null;
  venue: string | null;
  branch: string | null;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  total: number;
  created_at: string;
};

const ORDER_COLUMNS =
  "id, order_number, status, payment_status, package_name, quantity_label, pax, event_type, event_date, event_time, venue, branch, first_name, last_name, email, phone, total, created_at";

function rowToOrder(row: OrderRow): OrderRecord {
  return {
    id: row.id,
    orderNumber: row.order_number,
    status: row.status,
    paymentStatus: row.payment_status,
    packageName: row.package_name,
    quantityLabel: row.quantity_label,
    pax: row.pax,
    eventType: row.event_type,
    eventDate: row.event_date,
    eventTime: row.event_time,
    venue: row.venue,
    branch: row.branch,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone,
    total: row.total,
    createdAt: row.created_at,
  };
}

export async function getOrders(): Promise<OrderRecord[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_COLUMNS)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to load orders: ${error.message}`);
  return (data as OrderRow[]).map(rowToOrder);
}

/** Orders whose EVENT falls inside an inclusive `YYYY-MM-DD` range.
 *
 * The Catering Calendar uses this instead of getOrders() so a month view
 * fetches one month, not the whole table — getOrders() has no date filter and
 * every other page calling it wants all-time totals, so narrowing it there
 * would change 8 pages' meaning. Cancelled orders are kept: the calendar
 * still shows them (greyed) and they must never count toward capacity, which
 * is a rendering decision, not a query one. */
export async function getOrdersInRange(from: string, to: string): Promise<OrderRecord[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_COLUMNS)
    .gte("event_date", from)
    .lte("event_date", to)
    .order("event_date", { ascending: true });
  if (error) throw new Error(`Failed to load orders for ${from}..${to}: ${error.message}`);
  return (data as OrderRow[]).map(rowToOrder);
}

/** One order by id — the shared order detail page. */
export async function getOrderById(id: string): Promise<OrderRecord | null> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.from("orders").select(ORDER_COLUMNS).eq("id", id).maybeSingle();
  if (error) throw new Error(`Failed to load order: ${error.message}`);
  return data ? rowToOrder(data as OrderRow) : null;
}

// The columns a change-request diff/impact needs beyond OrderRecord: the
// three JSONB dish sources (see lib/requirements/types.ts), the pricing
// breakdown, and the derived payment columns. Kept as a separate wider
// reader rather than widening ORDER_COLUMNS/OrderRecord themselves — eight
// pages read those and don't need this.
export type OrderWithMenu = OrderRecord & {
  servers: number | null;
  packageSlug: string | null;
  menuId: string | null;
  menuName: string | null;
  menuSnapshot: unknown;
  cart: unknown;
  packedMealCart: unknown;
  selectedDishes: unknown;
  subtotal: number;
  deliveryFee: number;
  rushFee: number;
  depositAmount: number;
  amountPaid: number;
};

type OrderWithMenuRow = OrderRow & {
  servers: number | null;
  package_slug: string | null;
  menu_id: string | null;
  menu_name: string | null;
  menu_snapshot: unknown;
  cart: unknown;
  packed_meal_cart: unknown;
  selected_dishes: unknown;
  subtotal: number;
  delivery_fee: number;
  rush_fee: number;
  deposit_amount: number;
  amount_paid: number;
};

const ORDER_WITH_MENU_COLUMNS =
  `${ORDER_COLUMNS}, servers, package_slug, menu_id, menu_name, menu_snapshot, cart, packed_meal_cart, ` +
  "selected_dishes, subtotal, delivery_fee, rush_fee, deposit_amount, amount_paid";

function rowToOrderWithMenu(row: OrderWithMenuRow): OrderWithMenu {
  return {
    ...rowToOrder(row),
    servers: row.servers,
    packageSlug: row.package_slug,
    menuId: row.menu_id,
    menuName: row.menu_name,
    menuSnapshot: row.menu_snapshot,
    cart: row.cart,
    packedMealCart: row.packed_meal_cart,
    selectedDishes: row.selected_dishes,
    subtotal: row.subtotal,
    deliveryFee: row.delivery_fee,
    rushFee: row.rush_fee,
    depositAmount: row.deposit_amount,
    amountPaid: row.amount_paid,
  };
}

/** One order with its full menu/pricing shape — what a change-request diff
 * or impact computation needs beyond the trimmed OrderRecord. */
export async function getOrderWithMenuById(id: string): Promise<OrderWithMenu | null> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.from("orders").select(ORDER_WITH_MENU_COLUMNS).eq("id", id).maybeSingle();
  if (error) throw new Error(`Failed to load order: ${error.message}`);
  return data ? rowToOrderWithMenu(data as unknown as OrderWithMenuRow) : null;
}

export async function updateOrderStatus(id: string, status: OrderStatus): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("orders").update({ status }).eq("id", id);
  if (error) throw new Error(`Failed to update order status: ${error.message}`);

  // Keeps inventory reservations in lockstep with status — every status
  // change (Kitchen board drag, Orders status dropdown) goes through this
  // one function, so there's exactly one place this can be forgotten.
  // lib/requirements/data.ts decides what "in lockstep" means per status
  // (reserve / release / consume).
  await syncOrderReservations(id);
}
