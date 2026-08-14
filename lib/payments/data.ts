// Reads/writes herbies' public.payments table directly — same table its own
// /dashboard/payments (lib/payments-data.ts) manages. RLS ("Admin
// read/insert/update/delete payments") is the real authorization boundary;
// a non-admin's query simply returns nothing / fails.

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { PaymentRecord, PaymentQueueRow, PaymentStatus, OrderPaymentStatus } from "./types";

type PaymentRow = {
  id: string;
  order_id: string;
  kind: PaymentRecord["kind"];
  method: PaymentRecord["method"];
  amount: number;
  reference_number: string | null;
  proof_path: string | null;
  status: PaymentStatus;
  admin_note: string | null;
  verified_at: string | null;
  verified_by: string | null;
  created_at: string;
  updated_at: string;
};

function rowToPayment(row: PaymentRow): PaymentRecord {
  return {
    id: row.id,
    orderId: row.order_id,
    kind: row.kind,
    method: row.method,
    amount: row.amount,
    referenceNumber: row.reference_number,
    proofPath: row.proof_path,
    status: row.status,
    adminNote: row.admin_note,
    verifiedAt: row.verified_at,
    verifiedBy: row.verified_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

type QueueRow = PaymentRow & {
  orders: {
    order_number: string;
    first_name: string;
    last_name: string;
    branch: string | null;
    event_date: string | null;
    package_name: string;
    total: number;
    deposit_amount: number;
    amount_paid: number;
    payment_status: OrderPaymentStatus;
  } | null;
};

function rowToQueueRow(row: QueueRow): PaymentQueueRow {
  return {
    ...rowToPayment(row),
    orderNumber: row.orders?.order_number ?? "—",
    customerName: row.orders ? `${row.orders.first_name} ${row.orders.last_name}` : "—",
    branch: row.orders?.branch ?? null,
    eventDate: row.orders?.event_date ?? null,
    packageName: row.orders?.package_name ?? "—",
    orderTotal: row.orders?.total ?? 0,
    orderDepositAmount: row.orders?.deposit_amount ?? 0,
    orderAmountPaid: row.orders?.amount_paid ?? 0,
    orderPaymentStatus: row.orders?.payment_status ?? "Unpaid",
  };
}

const QUEUE_SELECT =
  "*, orders!inner(order_number, first_name, last_name, branch, event_date, package_name, total, deposit_amount, amount_paid, payment_status)";

// Excludes 'Pending Upload' by default — those rows have no file yet (the
// customer may still be mid-upload or abandoned the form) and aren't
// actionable by an admin. Pass a status explicitly to see a narrower slice
// (e.g. the Pending Review tab passes "Submitted").
export async function getPaymentQueue(status?: PaymentStatus): Promise<PaymentQueueRow[]> {
  const supabase = createSupabaseServerClient();
  let query = supabase.from("payments").select(QUEUE_SELECT).order("created_at", { ascending: false });
  query = status ? query.eq("status", status) : query.neq("status", "Pending Upload");
  const { data, error } = await query;
  if (error) throw new Error(`Failed to load payment queue: ${error.message}`);
  return (data as QueueRow[]).map(rowToQueueRow);
}

export async function getPaymentsForOrder(orderId: string): Promise<PaymentRecord[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`Failed to load payments: ${error.message}`);
  return (data as PaymentRow[]).map(rowToPayment);
}

// orders.amount_paid / payment_status are NOT touched here — herbies'
// recompute_order_payment_state() trigger (supabase/payments.sql §5, in the
// herbies project) recomputes both from this table on every change.
export async function setPaymentStatus(
  id: string,
  status: Extract<PaymentStatus, "Verified" | "Rejected">,
  verifiedBy: string | null,
  adminNote?: string,
): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("payments")
    .update({
      status,
      admin_note: adminNote || null,
      verified_at: new Date().toISOString(),
      verified_by: verifiedBy,
    })
    .eq("id", id);
  if (error) throw new Error(`Failed to update payment status: ${error.message}`);
}

export async function getProofSignedUrl(path: string, ttlSeconds = 300): Promise<string | null> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.storage.from("payment-proofs").createSignedUrl(path, ttlSeconds);
  if (error || !data) return null;
  return data.signedUrl;
}
