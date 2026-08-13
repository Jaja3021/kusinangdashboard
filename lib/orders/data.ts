import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { OrderRecord, OrderStatus } from "./types";

type OrderRow = {
  id: string;
  order_number: string;
  status: OrderStatus;
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
  "id, order_number, status, package_name, quantity_label, pax, event_type, event_date, event_time, venue, branch, first_name, last_name, email, phone, total, created_at";

function rowToOrder(row: OrderRow): OrderRecord {
  return {
    id: row.id,
    orderNumber: row.order_number,
    status: row.status,
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

export async function updateOrderStatus(id: string, status: OrderStatus): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("orders").update({ status }).eq("id", id);
  if (error) throw new Error(`Failed to update order status: ${error.message}`);
}
