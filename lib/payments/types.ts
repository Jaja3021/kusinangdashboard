// Mirrors herbies' public.payments table (c:/project/herbies/supabase/payments.sql,
// lib/payments.ts) — the storefront's /order/track payment flow writes here
// directly, so verifying a payment from this dashboard shows up there
// immediately with no herbies changes. Trimmed to what this dashboard
// renders, same "mirror" convention as lib/menu/types.ts and lib/orders/types.ts.

export const PAYMENT_METHODS = ["Cash", "GCash", "Bank Transfer"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_KINDS = ["Deposit", "Balance", "Other"] as const;
export type PaymentKind = (typeof PAYMENT_KINDS)[number];

export const PAYMENT_STATUSES = ["Pending Upload", "Submitted", "Verified", "Rejected"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const ORDER_PAYMENT_STATUSES = [
  "Unpaid",
  "Awaiting Verification",
  "Partially Paid",
  "Deposit Paid",
  "Paid",
] as const;
export type OrderPaymentStatus = (typeof ORDER_PAYMENT_STATUSES)[number];

export type PaymentRecord = {
  id: string;
  orderId: string;
  kind: PaymentKind;
  method: PaymentMethod;
  amount: number;
  referenceNumber: string | null;
  // Admin-only. Never sent to the customer — herbies' lookup_order_payments
  // omits it on purpose (a storage path is a capability).
  proofPath: string | null;
  status: PaymentStatus;
  adminNote: string | null;
  verifiedAt: string | null;
  verifiedBy: string | null;
  createdAt: string;
  updatedAt: string;
};

// A row in the admin verification queue: a payment joined to just enough of
// its order to render the Payments table and detail panel without a second
// round trip.
export type PaymentQueueRow = PaymentRecord & {
  orderNumber: string;
  customerName: string;
  branch: string | null;
  eventDate: string | null;
  packageName: string;
  orderTotal: number;
  orderDepositAmount: number;
  orderAmountPaid: number;
  orderPaymentStatus: OrderPaymentStatus;
};

export function balanceDue(o: { total: number; amountPaid: number }): number {
  return Math.max(0, o.total - o.amountPaid);
}
