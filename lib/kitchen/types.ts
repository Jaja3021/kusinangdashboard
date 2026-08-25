import type { OrderRecord, OrderStatus } from "@/lib/orders/types";

// The kitchen board's columns are a curated subset of the order's real
// status — "Pending Confirmation" isn't accepted into the kitchen yet, and
// "Cancelled" is terminal, so neither gets a column. Moving a card between
// columns writes straight to orders.status (see lib/kitchen/data.ts) — there
// is no separate kitchen-only stage anymore.
export const KITCHEN_STAGES: OrderStatus[] = ["Confirmed", "Preparing", "Cooking", "Completed", "Ready for Delivery"];

/** The status a card moves to next, or null once it's reached the end of the board. */
export function nextStage(status: OrderStatus): OrderStatus | null {
  const i = KITCHEN_STAGES.indexOf(status);
  return i >= 0 && i < KITCHEN_STAGES.length - 1 ? KITCHEN_STAGES[i + 1] : null;
}

/** The status a card moves back to, or null if it's already at the first column. */
export function prevStage(status: OrderStatus): OrderStatus | null {
  const i = KITCHEN_STAGES.indexOf(status);
  return i > 0 ? KITCHEN_STAGES[i - 1] : null;
}

export type DishLine = { qty: number; name: string };

export type KitchenOrder = {
  id: string;
  orderNumber: string;
  customer: string;
  eventDate: string | null;
  eventTime: string | null;
  pax: number | null;
  quantityLabel: string | null;
  packageName: string;
  branch: string | null;
  deliveryMethod: string | null;
  instructions: string | null;
  dishes: DishLine[];
  status: OrderStatus;
};

/** Lets a client-side mock order (lib/orders/mock-celebrity-orders.ts) join the
 * board alongside real Supabase orders — it just doesn't have a cart/dish
 * breakdown to parse. */
export function orderToKitchenOrder(order: OrderRecord, status: OrderStatus): KitchenOrder {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    customer: `${order.firstName} ${order.lastName}`.trim(),
    eventDate: order.eventDate,
    eventTime: order.eventTime,
    pax: order.pax,
    quantityLabel: order.quantityLabel,
    packageName: order.packageName,
    branch: order.branch,
    deliveryMethod: null,
    instructions: null,
    dishes: [],
    status,
  };
}
