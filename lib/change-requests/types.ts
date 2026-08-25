// Change Request Approval System — types.
//
// A change request is a customer's ask, filed by the Meal Builder storefront
// (a separate app, same Supabase project) against a booking that already
// exists in public.orders. This dashboard reviews it; only an approval
// mutates the order. See supabase/change_requests.sql for the schema, RLS,
// and the Meal Builder's insert contract.

import type { TraySize } from "@/lib/menu/types";
import type { OrderStatus, PaymentStatus } from "@/lib/orders/types";

export const CHANGE_REQUEST_STATUSES = ["pending", "approved", "rejected", "cancelled"] as const;
export type ChangeRequestStatus = (typeof CHANGE_REQUEST_STATUSES)[number];

/** The shared jsonb contract (supabase/change_requests.sql §"Meal Builder
 * insert contract"), camelCase on this side of the boundary. Every field is
 * optional — an absent key means "unchanged," which is exactly how
 * approve_change_request() reads it on the SQL side too. */
export type ChangeRequestPayload = {
  pax?: number | null;
  servers?: number | null;
  packageSlug?: string | null;
  packageName?: string | null;
  menuId?: string | null;
  menuName?: string | null;
  quantityLabel?: string | null;
  cart?: { dishId: string; size: TraySize; qty: number }[];
  packedMealCart?: { dishId: string; qty: number }[];
  selectedDishes?: Record<string, string>;
  menuSnapshot?: unknown;
  subtotal?: number | null;
  deliveryFee?: number | null;
  rushFee?: number | null;
};

export type ChangeRequestRecord = {
  id: string;
  orderId: string;
  clientId: string | null;
  status: ChangeRequestStatus;

  originalData: ChangeRequestPayload;
  requestedData: ChangeRequestPayload;

  originalTotal: number;
  requestedTotal: number;
  priceDifference: number;

  originalCost: number | null;
  requestedCost: number | null;

  clientNotes: string;
  requestedBy: string | null;
  requestedByName: string;
  requestedAt: string;

  reviewedBy: string | null;
  reviewerName: string;
  reviewedAt: string | null;
  rejectionReason: string;

  // Joined from orders — the list page renders entirely from these, no
  // second query per row (see lib/change-requests/data.ts).
  orderNumber: string;
  customerName: string;
  email: string;
  eventDate: string | null;
  eventTime: string | null;
  branch: string | null;
  orderStatus: OrderStatus;
  orderPaymentStatus: PaymentStatus;
  orderTotal: number;
  orderPax: number | null;
  orderServers: number | null;
};

const PAYLOAD_KEYS = [
  "pax",
  "servers",
  "packageSlug",
  "packageName",
  "menuId",
  "menuName",
  "quantityLabel",
  "cart",
  "packedMealCart",
  "selectedDishes",
  "menuSnapshot",
  "subtotal",
  "deliveryFee",
  "rushFee",
] as const;

const CAMEL_TO_SNAKE: Record<(typeof PAYLOAD_KEYS)[number], string> = {
  pax: "pax",
  servers: "servers",
  packageSlug: "package_slug",
  packageName: "package_name",
  menuId: "menu_id",
  menuName: "menu_name",
  quantityLabel: "quantity_label",
  cart: "cart",
  packedMealCart: "packed_meal_cart",
  selectedDishes: "selected_dishes",
  menuSnapshot: "menu_snapshot",
  subtotal: "subtotal",
  deliveryFee: "delivery_fee",
  rushFee: "rush_fee",
};

/** Parses a raw jsonb value (snake_case keys per the insert contract) into a
 * ChangeRequestPayload. Unknown keys are ignored — a Meal Builder change
 * that adds a new key someday shows up as "unchanged" here rather than
 * throwing, matching this codebase's everywhere-else convention of treating
 * unrecognized JSONB shape as absence, not error. */
export function parsePayload(value: unknown): ChangeRequestPayload {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const raw = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};

  for (const key of PAYLOAD_KEYS) {
    const snake = CAMEL_TO_SNAKE[key];
    if (snake in raw) out[key] = raw[snake];
  }
  return out as ChangeRequestPayload;
}

/** The inverse of parsePayload — camelCase keys back to the snake_case jsonb
 * shape the insert contract (and admin_create_change_request()) expects.
 * Only keys actually present in `payload` are emitted, same "absent = unchanged"
 * rule as the rest of this contract. */
export function toSnakePayload(payload: ChangeRequestPayload): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of PAYLOAD_KEYS) {
    if (key in payload) out[CAMEL_TO_SNAKE[key]] = payload[key];
  }
  return out;
}
