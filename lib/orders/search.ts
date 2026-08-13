// Topbar search over real Supabase orders: orders by order number, and
// customers by name, email or phone.

import { getBranchById } from "@/lib/mt/branches";
import type { OrderRecord } from "./types";

export type SearchResult = {
  type: "Order" | "Customer";
  label: string;
  sub: string;
  path: string;
};

const MAX_RESULTS = 8;

export function search(orders: OrderRecord[], term: string): SearchResult[] {
  const q = term.trim().toLowerCase();
  if (q.length < 2) return [];

  const results: SearchResult[] = [];
  const seenCustomers = new Set<string>();

  for (const o of orders) {
    if (results.length >= MAX_RESULTS) break;

    const branchName = (o.branch && getBranchById(o.branch)?.name) || o.branch || "";
    const name = `${o.firstName} ${o.lastName}`.trim();

    const orderNumber = (o.orderNumber || "").toLowerCase();
    if (orderNumber.includes(q)) {
      results.push({
        type: "Order",
        label: `${o.orderNumber} — ${name}`,
        sub: [branchName, o.eventDate].filter(Boolean).join(" · "),
        path: "/dashboard/orders",
      });
      continue;
    }

    const haystack = [name, o.email, o.phone].join(" ").toLowerCase();
    if (!haystack.includes(q)) continue;

    // One row per person, not one per order.
    const identity = (o.email || o.phone || name).trim().toLowerCase();
    if (seenCustomers.has(identity)) continue;
    seenCustomers.add(identity);

    results.push({
      type: "Customer",
      label: name,
      sub: [branchName, o.packageName || o.eventType].filter(Boolean).join(" · "),
      path: "/dashboard/customers",
    });
  }

  return results;
}
