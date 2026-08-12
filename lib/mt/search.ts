// Topbar search over the pipeline: orders by reference, and customers by name,
// email or phone.

import { isConfirmed } from "./pipeline";
import type { Opportunity } from "./types";

export type SearchResult = {
  type: "Order" | "Customer";
  label: string;
  sub: string;
  path: string;
};

const MAX_RESULTS = 8;

export function search(opportunities: Opportunity[], term: string): SearchResult[] {
  const q = term.trim().toLowerCase();
  if (q.length < 2) return [];

  const results: SearchResult[] = [];
  const seenCustomers = new Set<string>();

  for (const o of opportunities) {
    if (results.length >= MAX_RESULTS) break;

    const reference = (o.reference || "").toLowerCase();
    if (reference.includes(q)) {
      results.push({
        type: "Order",
        label: `${o.reference} — ${o.name}`,
        sub: [o.branch, o.eventDate].filter(Boolean).join(" · "),
        path: "/dashboard/orders",
      });
      continue;
    }

    const haystack = [o.name, o.email, o.phone].join(" ").toLowerCase();
    if (!haystack.includes(q)) continue;

    // One row per person, not one per booking.
    const identity = (o.email || o.phone || o.name).trim().toLowerCase();
    if (seenCustomers.has(identity)) continue;
    seenCustomers.add(identity);

    results.push({
      type: "Customer",
      label: o.name,
      sub: [o.branch, isConfirmed(o) ? o.packageName : o.eventType]
        .filter(Boolean)
        .join(" · "),
      path: "/dashboard/customers",
    });
  }

  return results;
}
