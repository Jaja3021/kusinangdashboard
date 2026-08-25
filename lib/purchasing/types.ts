export type PurchaseListStatus = "sufficient" | "low" | "insufficient" | "out";

export type PurchaseListSource = {
  orderId: string;
  orderNumber: string;
  eventDate: string | null;
  branch: string;
  qty: number;
};

// One row = one ingredient's standing across every confirmed-and-not-yet-
// completed event (Confirmed..Ready for Delivery — see
// lib/requirements/data.ts's RESERVING_STATUSES). `requiredQty` IS the same
// number sitting in inventory_reservations for this ingredient right now —
// the reservation ledger *is* the aggregate requirement here, kept in sync
// by lib/requirements/data.ts every time an order's status/PAX/dishes
// change, so there is nothing left to recompute or double-subtract.
//
// This is why `shortageQty` is simply max(0, requiredQty - physicalStock),
// NOT the "physical minus reserved" formula lib/requirements/calc.ts's
// computeShortages() uses — that formula answers a different question ("does
// a NEW, not-yet-reserved requirement fit against what's already spoken
// for"), which belongs to the real-time date/PAX availability check
// (Phase 8), not to this already-fully-reserved aggregate view.
export type PurchaseListRow = {
  id: string; // ingredientId — DataTable's row-key requirement
  ingredientId: string;
  ingredientName: string;
  category: string;
  baseUnit: string;
  purchaseUnit: string;
  purchaseQty: number;
  requiredQty: number;
  physicalStock: number;
  reorderLevel: number;
  shortageQty: number;
  recommendedPurchase: number;
  unitCost: number;
  estimatedCost: number;
  supplierId: string | null;
  supplierName: string | null;
  status: PurchaseListStatus;
  sources: PurchaseListSource[];
};

export type SupplierGroup = {
  supplierId: string | null;
  supplierName: string;
  rows: PurchaseListRow[];
  totalCost: number;
};

/** Pure — no Supabase import — so client components (PurchasingClient) can
 * call it directly without pulling lib/purchasing/data.ts's server-only
 * dependency chain (createSupabaseServerClient -> next/headers) into the
 * browser bundle. */
export function groupShortagesBySupplier(rows: PurchaseListRow[]): SupplierGroup[] {
  const shortages = rows.filter((r) => r.shortageQty > 0);
  const groups = new Map<string, SupplierGroup>();

  for (const row of shortages) {
    const key = row.supplierId ?? "__none__";
    let group = groups.get(key);
    if (!group) {
      group = { supplierId: row.supplierId, supplierName: row.supplierName ?? "No Supplier Assigned", rows: [], totalCost: 0 };
      groups.set(key, group);
    }
    group.rows.push(row);
    group.totalCost += row.estimatedCost;
  }

  return [...groups.values()].sort((a, b) => b.totalCost - a.totalCost);
}
