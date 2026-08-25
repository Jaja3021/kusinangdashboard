// The automatic purchase list (FEATURE 2 of the inventory brief) — one row
// per ingredient with an active shortage against every confirmed-and-not-yet-
// completed event, combined into a single number so ordering never
// duplicates the way two separate per-event purchases would.

import { getIngredientsWithStock, getSuppliers } from "@/lib/inventory/data";
import { getReservationsByIngredient } from "@/lib/inventory/reservations-data";
import type { PurchaseListRow, PurchaseListStatus } from "./types";

function statusFor(row: { physicalStock: number; shortageQty: number; reorderLevel: number }): PurchaseListStatus {
  if (row.physicalStock <= 0) return "out";
  if (row.shortageQty > 0) return "insufficient";
  if (row.physicalStock <= row.reorderLevel) return "low";
  return "sufficient";
}

/** Every ingredient with at least one confirmed event depending on it,
 * shortage-first. Ingredients nobody currently needs don't appear here even
 * if they're low or out — that's the Inventory page's "Low Stock" /
 * "Out of Stock" signal, a different question ("should we restock
 * eventually") from this page's ("what do upcoming events need that we
 * don't have"). */
export async function getPurchaseList(): Promise<PurchaseListRow[]> {
  const [reservations, ingredients, suppliers] = await Promise.all([
    getReservationsByIngredient(),
    getIngredientsWithStock(),
    getSuppliers(),
  ]);

  const supplierName = new Map(suppliers.map((s) => [s.id, s.name]));

  const rows: PurchaseListRow[] = [];
  for (const ing of ingredients) {
    const res = reservations.get(ing.id);
    const requiredQty = res?.totalReserved ?? 0;
    if (requiredQty <= 0) continue;

    const physicalStock = ing.totalStock;
    const shortageQty = Math.max(0, requiredQty - physicalStock);
    const status = statusFor({ physicalStock, shortageQty, reorderLevel: ing.reorderLevel });

    rows.push({
      id: ing.id,
      ingredientId: ing.id,
      ingredientName: ing.name,
      category: ing.category,
      baseUnit: ing.baseUnit,
      purchaseUnit: ing.purchaseUnit,
      purchaseQty: ing.purchaseQty,
      requiredQty,
      physicalStock,
      reorderLevel: ing.reorderLevel,
      shortageQty,
      recommendedPurchase: shortageQty,
      unitCost: ing.unitCost,
      estimatedCost: shortageQty * ing.unitCost,
      supplierId: ing.supplierId,
      supplierName: ing.supplierId ? (supplierName.get(ing.supplierId) ?? null) : null,
      status,
      sources: (res?.sources ?? [])
        .slice()
        .sort((a, b) => (a.eventDate ?? "").localeCompare(b.eventDate ?? "")),
    });
  }

  return rows.sort((a, b) => b.shortageQty - a.shortageQty || a.ingredientName.localeCompare(b.ingredientName));
}
