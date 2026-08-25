// Requirements planning — turning an order's dishes into ingredient
// quantities, per FEATURE 1 of the inventory brief.
//
// An order carries its dishes in one of three shapes (see herbies'
// lib/orders.ts / app/order/confirm/actions.ts), and each shape has a
// different "how many" to multiply a recipe's per-unit BOM by:
//
//   cart             TrayCartLine[]      — {dishId, size, qty}. dishId is
//                     already `name.toLowerCase().replace(/[^a-z0-9]+/g,
//                     "-")` (herbies' trayDishId/packedMealDishId), the same
//                     normalization dishKey() does, so it matches
//                     recipes.dish_key directly. qty = number of trays of
//                     that size.
//   packedMealCart   PackedMealCartLine[] — {dishId, qty}. qty = pieces.
//   selectedDishes   SelectedDishes       — {category: dishName}, one dish
//                     per category on a head-count package. Each selected
//                     dish is required `pax` times.
//
// menu_snapshot (grazing/fixed-menu spreads and the head-count package's own
// mains/sides/snacks list) is deliberately NOT a requirements source here:
// it's a whole spread's worth of items with no per-item quantity, and this
// repo's starter recipe book doesn't cover grazing bites. An order built
// entirely from menu_snapshot simply contributes no ingredient requirement
// — same as a dish with no linked recipe: visible as a gap, not silently
// guessed at.

import type { TraySize } from "@/lib/menu/types";
export type { TraySize };

export type OrderDishSource = {
  pax: number | null;
  /** [{dishId, size, qty}] — tray-cart packages (Tray Orders category). */
  cart: { dishId: string; size: TraySize; qty: number }[];
  /** [{dishId, qty}] — packed-meal packages. */
  packedMealCart: { dishId: string; qty: number }[];
  /** {category: dishName} — head-count Full-Service Catering packages. */
  selectedDishes: Record<string, string>;
};

/** One dish on one order, resolved against the recipe book. `recipeId` is
 * null when no recipe is linked to this dish (yet) — the dish is still
 * listed so the gap is visible on the requirements/purchase-list UI. */
export type ResolvedDishLine = {
  dishKey: string;
  dishName: string;
  size: string; // "" unless this came from a tray-cart line
  /** Trays / pieces / pax this dish is needed for, on this order. */
  quantity: number;
  recipeId: string | null;
};

export type IngredientRequirementSource = {
  orderId: string;
  orderNumber: string;
  eventDate: string | null;
  dishName: string;
  quantity: number;
};

export type IngredientRequirement = {
  ingredientId: string;
  ingredientName: string;
  baseUnit: string;
  /** Total quantity needed, in the ingredient's base_unit, across every
   * order this requirement was computed over. */
  requiredQty: number;
  sources: IngredientRequirementSource[];
};

/** Dishes referenced by at least one order but with no recipe linked —
 * surfaced separately so a shortage can never be silently understated by a
 * missing BOM. */
export type UnmappedDish = {
  dishKey: string;
  dishName: string;
  orderCount: number;
};
