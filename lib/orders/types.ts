// Mirrors herbies' public.orders table (e:/Project/herbies/supabase/orders.sql)
// — the storefront writes here directly, this dashboard only reads/updates
// status. Only the fields this dashboard displays are kept; herbies' full
// OrderRecord also carries menu/cart JSONB snapshots this app never renders.

export type OrderStatus =
  | "Pending Confirmation"
  | "Confirmed"
  | "Preparing"
  | "Cooking"
  | "Completed"
  | "Ready for Delivery"
  | "Cancelled";

export const ORDER_STATUSES: OrderStatus[] = [
  "Pending Confirmation",
  "Confirmed",
  "Preparing",
  "Cooking",
  "Completed",
  "Ready for Delivery",
  "Cancelled",
];

// Mirrors public.orders.payment_status (herbies' supabase/payments.sql §2).
// DERIVED in the database by a trigger from the payments table — never
// written directly by this dashboard, only read.
export type PaymentStatus =
  | "Unpaid"
  | "Awaiting Verification"
  | "Partially Paid"
  | "Deposit Paid"
  | "Paid";

export const PAYMENT_STATUSES: PaymentStatus[] = [
  "Unpaid",
  "Awaiting Verification",
  "Partially Paid",
  "Deposit Paid",
  "Paid",
];

export type OrderRecord = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;

  packageName: string;
  /** The package's Menu-page Group ("Tray Orders" | "Grazing" | "Full-Service
   * Catering", or a static-catalog group name as a fallback) — only ever set
   * on mock orders (lib/orders/mock-celebrity-orders.ts); real Supabase rows
   * leave this undefined, since `orders` has no such column. */
  packageGroup?: string | null;
  quantityLabel: string | null;
  pax: number | null;

  eventType: string | null;
  eventDate: string | null;
  eventTime: string | null;
  venue: string | null;
  branch: string | null;

  firstName: string;
  lastName: string;
  email: string;
  phone: string;

  total: number;

  createdAt: string;

  /** Links every package row placed from one multi-package "Review your
   * quote" confirmation on herbies (see herbies' supabase/order-batches.sql
   * and app/order/confirm/actions.ts) — null for an ordinary single-package
   * order. Orders sharing a batchId are one checkout, not several. */
  batchId: string | null;
};
