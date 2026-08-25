// Reads/writes public.change_requests (supabase/change_requests.sql). All
// admin mutations go through the SECURITY DEFINER RPCs — there is no admin
// insert/update/delete RLS policy on this table, by design, the same shape
// as lib/requirements/data.ts's syncOrderReservations() and the three RPCs
// in supabase/inventory_reservations.sql.

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { logActivity } from "@/lib/activity-log/data";
import { formatPeso } from "@/lib/format";
import { syncOrderReservations } from "@/lib/requirements/data";
import { diffPayloads, summarizeChanges } from "./diff";
import { parsePayload, toSnakePayload, type ChangeRequestPayload, type ChangeRequestRecord, type ChangeRequestStatus } from "./types";
import type { OrderStatus, PaymentStatus } from "@/lib/orders/types";

type ChangeRequestRow = {
  id: string;
  order_id: string;
  client_id: string | null;
  status: ChangeRequestStatus;
  original_data: unknown;
  requested_data: unknown;
  original_total: number;
  requested_total: number;
  price_difference: number;
  original_cost: number | null;
  requested_cost: number | null;
  client_notes: string;
  requested_by: string | null;
  requested_by_name: string;
  requested_at: string;
  reviewed_by: string | null;
  reviewer_name: string;
  reviewed_at: string | null;
  rejection_reason: string;
  orders:
    | {
        order_number: string;
        first_name: string;
        last_name: string;
        email: string;
        event_date: string | null;
        event_time: string | null;
        branch: string | null;
        status: OrderStatus;
        payment_status: PaymentStatus;
        total: number;
        pax: number | null;
        servers: number | null;
      }
    | {
        order_number: string;
        first_name: string;
        last_name: string;
        email: string;
        event_date: string | null;
        event_time: string | null;
        branch: string | null;
        status: OrderStatus;
        payment_status: PaymentStatus;
        total: number;
        pax: number | null;
        servers: number | null;
      }[]
    | null;
};

function orderJoin(rel: ChangeRequestRow["orders"]) {
  const fallback = {
    order_number: "—",
    first_name: "",
    last_name: "",
    email: "",
    event_date: null,
    event_time: null,
    branch: null,
    status: "Pending Confirmation" as OrderStatus,
    payment_status: "Unpaid" as PaymentStatus,
    total: 0,
    pax: null,
    servers: null,
  };
  if (!rel) return fallback;
  return Array.isArray(rel) ? (rel[0] ?? fallback) : rel;
}

function rowToChangeRequest(row: ChangeRequestRow): ChangeRequestRecord {
  const order = orderJoin(row.orders);
  return {
    id: row.id,
    orderId: row.order_id,
    clientId: row.client_id,
    status: row.status,
    originalData: parsePayload(row.original_data),
    requestedData: parsePayload(row.requested_data),
    originalTotal: row.original_total,
    requestedTotal: row.requested_total,
    priceDifference: row.price_difference,
    originalCost: row.original_cost,
    requestedCost: row.requested_cost,
    clientNotes: row.client_notes,
    requestedBy: row.requested_by,
    requestedByName: row.requested_by_name,
    requestedAt: row.requested_at,
    reviewedBy: row.reviewed_by,
    reviewerName: row.reviewer_name,
    reviewedAt: row.reviewed_at,
    rejectionReason: row.rejection_reason,
    orderNumber: order.order_number,
    customerName: `${order.first_name} ${order.last_name}`.trim(),
    email: order.email,
    eventDate: order.event_date,
    eventTime: order.event_time,
    branch: order.branch,
    orderStatus: order.status,
    orderPaymentStatus: order.payment_status,
    orderTotal: order.total,
    orderPax: order.pax,
    orderServers: order.servers,
  };
}

const CHANGE_REQUEST_SELECT =
  "*, orders(order_number, first_name, last_name, email, event_date, event_time, branch, status, payment_status, total, pax, servers)";

/** Every change request, newest first — the list page renders entirely from
 * this (plus the orders join), no per-row query. */
export async function getChangeRequests(): Promise<ChangeRequestRecord[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("change_requests")
    .select(CHANGE_REQUEST_SELECT)
    .order("requested_at", { ascending: false });
  if (error) throw new Error(`Failed to load change requests: ${error.message}`);
  return (data as unknown as ChangeRequestRow[]).map(rowToChangeRequest);
}

export async function getChangeRequestById(id: string): Promise<ChangeRequestRecord | null> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.from("change_requests").select(CHANGE_REQUEST_SELECT).eq("id", id).maybeSingle();
  if (error) throw new Error(`Failed to load change request: ${error.message}`);
  return data ? rowToChangeRequest(data as unknown as ChangeRequestRow) : null;
}

/** Every request filed against one order, newest first — powers the Changes
 * tab / revision timeline on the order detail page (Phase 2). */
export async function getChangeRequestsForOrder(orderId: string): Promise<ChangeRequestRecord[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("change_requests")
    .select(CHANGE_REQUEST_SELECT)
    .eq("order_id", orderId)
    .order("requested_at", { ascending: false });
  if (error) throw new Error(`Failed to load change requests for order: ${error.message}`);
  return (data as unknown as ChangeRequestRow[]).map(rowToChangeRequest);
}

/** Pending count — feeds the nav badge and the Overview alert card. */
export async function getPendingChangeRequestCount(): Promise<number> {
  const supabase = createSupabaseServerClient();
  const { count, error } = await supabase
    .from("change_requests")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");
  if (error) throw new Error(`Failed to count pending change requests: ${error.message}`);
  return count ?? 0;
}

export type ApprovalResult = { request: ChangeRequestRecord; reservationSyncWarning: string | null };

/** Approves via the approve_change_request() RPC (one atomic transaction —
 * see supabase/change_requests.sql), then resyncs inventory reservations and
 * logs the activity. The reservation sync happens OUTSIDE the SQL
 * transaction — dish→recipe resolution is TypeScript — so a failure there
 * does not roll back the already-committed approval. It's idempotent and
 * self-heals at the next status change, but the admin must be told, hence
 * the non-null reservationSyncWarning bubbling back to the caller. */
export async function approveChangeRequest(id: string, force: boolean): Promise<ApprovalResult> {
  const supabase = createSupabaseServerClient();
  const user = await getCurrentUser();

  const before = await getChangeRequestById(id);
  if (!before) throw new Error("Change request not found.");

  const { error: rpcError } = await supabase.rpc("approve_change_request", {
    p_id: id,
    p_reviewer_name: user?.name ?? "",
    p_force: force,
  });
  if (rpcError) throw new Error(`Failed to approve change request: ${rpcError.message}`);

  const request = await getChangeRequestById(id);
  if (!request) throw new Error("Change request not found after approval.");

  let reservationSyncWarning: string | null = null;
  try {
    await syncOrderReservations(request.orderId);
  } catch (err) {
    reservationSyncWarning =
      err instanceof Error
        ? `Approved, but inventory reservations were not resynced: ${err.message}`
        : "Approved, but inventory reservations were not resynced.";
  }

  const diffs = diffPayloads(before.originalData, before.requestedData, before.originalData);
  await logActivity({
    module: "Change Requests",
    action: "UPDATE",
    entity: "Change Request",
    name: `${request.orderNumber} — approved`,
    details: `APPROVED · ${summarizeChanges(diffs)} · Total ${formatPeso(before.originalTotal)} → ${formatPeso(before.requestedTotal)}`,
  });

  return { request, reservationSyncWarning };
}

/** Creates a pending request on the admin's own behalf, via the
 * admin_create_change_request() RPC (supabase/change_requests_admin_create.sql).
 * original_data is derived server-side from the live order — the caller only
 * supplies what's changing. Goes through the same approve/reject flow as a
 * Meal Builder-filed request afterward. */
export async function createChangeRequest(
  orderId: string,
  requestedData: ChangeRequestPayload,
  requestedTotal: number | null,
  clientNotes: string,
): Promise<ChangeRequestRecord> {
  const supabase = createSupabaseServerClient();
  const user = await getCurrentUser();

  const { data, error: rpcError } = await supabase.rpc("admin_create_change_request", {
    p_order_id: orderId,
    p_requested_data: toSnakePayload(requestedData),
    p_requested_total: requestedTotal,
    p_client_notes: clientNotes,
    p_requested_by_name: user?.name ?? "",
  });
  if (rpcError) throw new Error(`Failed to create change request: ${rpcError.message}`);

  const created = (Array.isArray(data) ? data[0] : data) as { id: string } | null;
  const request = created?.id ? await getChangeRequestById(created.id) : null;
  if (!request) throw new Error("Change request not found after creation.");

  await logActivity({
    module: "Change Requests",
    action: "CREATE",
    entity: "Change Request",
    name: `${request.orderNumber} — proposed by admin`,
    details: `PROPOSED · ${summarizeChanges(diffPayloads(request.originalData, request.requestedData, request.originalData))}`,
  });

  return request;
}

/** Rejects via the reject_change_request() RPC. Never touches orders. */
export async function rejectChangeRequest(id: string, reason: string): Promise<ChangeRequestRecord> {
  const supabase = createSupabaseServerClient();
  const user = await getCurrentUser();

  const before = await getChangeRequestById(id);
  if (!before) throw new Error("Change request not found.");

  const { error: rpcError } = await supabase.rpc("reject_change_request", {
    p_id: id,
    p_reason: reason,
    p_reviewer_name: user?.name ?? "",
  });
  if (rpcError) throw new Error(`Failed to reject change request: ${rpcError.message}`);

  const request = await getChangeRequestById(id);
  if (!request) throw new Error("Change request not found after rejection.");

  await logActivity({
    module: "Change Requests",
    action: "UPDATE",
    entity: "Change Request",
    name: `${request.orderNumber} — rejected`,
    details: `REJECTED · ${reason}`,
  });

  return request;
}
