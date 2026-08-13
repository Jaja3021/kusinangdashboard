// Mirrors herbies' public.orders table (e:/Project/herbies/supabase/orders.sql)
// — the storefront writes here directly, this dashboard only reads/updates
// status. Only the fields this dashboard displays are kept; herbies' full
// OrderRecord also carries menu/cart JSONB snapshots this app never renders.

export type OrderStatus = "Pending Confirmation" | "Confirmed" | "Preparing" | "Completed" | "Cancelled";

export const ORDER_STATUSES: OrderStatus[] = [
  "Pending Confirmation",
  "Confirmed",
  "Preparing",
  "Completed",
  "Cancelled",
];

export type OrderRecord = {
  id: string;
  orderNumber: string;
  status: OrderStatus;

  packageName: string;
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
};
