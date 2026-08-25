"use server";
// RLS (public.is_admin() plus the SECURITY DEFINER functions in
// supabase/change_requests.sql) is the database-level authorization
// boundary; requireCapability("approve:change-requests") is the role-level
// one on top of it, because RLS cannot see dashboard_profiles.role (see
// lib/auth/require-capability.ts for the honest limitation).

import { revalidatePath } from "next/cache";
import { requireCapability } from "@/lib/auth/require-capability";
import { approveChangeRequest, createChangeRequest, rejectChangeRequest, type ApprovalResult } from "@/lib/change-requests/data";
import { buildChangeRequestImpact } from "@/lib/change-requests/impact-data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOrderWithMenuById } from "@/lib/orders/data";
import type { ChangeRequestImpact } from "@/lib/change-requests/impact";
import type { ChangeRequestRecord } from "@/lib/change-requests/types";

// An approval moves PAX/menu (calendar, inventory, purchasing), servers,
// and total (payments) all at once — every page that reads any of those
// needs revalidating.
function revalidateAffected(orderId: string) {
  revalidatePath("/dashboard/change-requests");
  revalidatePath("/dashboard/orders");
  revalidatePath(`/dashboard/orders/${orderId}`);
  revalidatePath("/dashboard/bookings");
  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard/payments");
  revalidatePath("/dashboard/inventory");
  revalidatePath("/dashboard/purchasing");
  revalidatePath("/dashboard");
}

export async function approveChangeRequestAction(id: string, force = false): Promise<ApprovalResult> {
  await requireCapability("approve:change-requests");
  const result = await approveChangeRequest(id, force);
  revalidateAffected(result.request.orderId);
  return result;
}

export async function rejectChangeRequestAction(id: string, reason: string): Promise<ChangeRequestRecord> {
  await requireCapability("approve:change-requests");
  const request = await rejectChangeRequest(id, reason);
  revalidatePath("/dashboard/change-requests");
  return request;
}

export async function getChangeRequestImpactAction(id: string): Promise<ChangeRequestImpact> {
  await requireCapability("manage:bookings");
  return buildChangeRequestImpact(id);
}

export type OpenOrderOption = {
  id: string;
  orderNumber: string;
  customerName: string;
  branch: string | null;
  eventDate: string | null;
};

/** Orders an admin can propose a menu change against — anything not already
 * closed out, matched against the query in-memory (no raw SQL/text-search
 * filter, so there's nothing here for a search string to break out of). */
export async function searchOpenOrdersForMenuChangeAction(query: string): Promise<OpenOrderOption[]> {
  await requireCapability("manage:bookings");
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("orders")
    .select("id, order_number, first_name, last_name, branch, event_date")
    .not("status", "in", "(Completed,Cancelled)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(`Failed to load orders: ${error.message}`);

  const q = query.trim().toLowerCase();
  const rows = (data ?? []) as { id: string; order_number: string; first_name: string; last_name: string; branch: string | null; event_date: string | null }[];

  return rows
    .map((r) => ({
      id: r.id,
      orderNumber: r.order_number,
      customerName: `${r.first_name} ${r.last_name}`.trim(),
      branch: r.branch,
      eventDate: r.event_date,
    }))
    .filter((r) => !q || `${r.orderNumber} ${r.customerName}`.toLowerCase().includes(q))
    .slice(0, 20);
}

export type OrderMenuOptions = {
  orderId: string;
  orderNumber: string;
  customerName: string;
  total: number;
  selectedDishes: Record<string, string>;
};

/** The current category -> dish picks for one order, so the admin edits from
 * the live menu rather than guessing. Only Full-Service Catering orders have
 * anything here — everything else comes back with an empty selectedDishes. */
export async function getOrderMenuOptionsAction(orderId: string): Promise<OrderMenuOptions> {
  await requireCapability("manage:bookings");
  const order = await getOrderWithMenuById(orderId);
  if (!order) throw new Error("Order not found.");

  const raw = order.selectedDishes;
  const selectedDishes: Record<string, string> =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? Object.fromEntries(Object.entries(raw as Record<string, unknown>).filter((entry): entry is [string, string] => typeof entry[1] === "string"))
      : {};

  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    customerName: `${order.firstName} ${order.lastName}`.trim(),
    total: order.total,
    selectedDishes,
  };
}

/** Admin-initiated change request: proposes a full replacement selectedDishes
 * object (so categories the admin didn't touch survive — approve_change_request()
 * writes selected_dishes wholesale, not merged per key) via
 * admin_create_change_request(). Enters the same pending review queue as a
 * Meal Builder request. */
export async function createMenuChangeRequestAction(
  orderId: string,
  selectedDishes: Record<string, string>,
  notes: string,
): Promise<ChangeRequestRecord> {
  await requireCapability("manage:bookings");
  const request = await createChangeRequest(orderId, { selectedDishes }, null, notes);
  revalidatePath("/dashboard/change-requests");
  return request;
}
