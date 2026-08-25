// Pure functions: order dishes -> ingredient requirements. No Supabase, no
// side effects — everything here takes plain data in and returns plain data
// out, so it can be unit-tested (scripts/test-requirements.ts) and reused by
// both the server-side reservation RPC's TypeScript caller and any
// client-side "what would this order need" preview.

import { dishKey } from "@/lib/menu/dish-catalog";
import { perUnitQty, type RecipeWithItems } from "@/lib/costing/types";
import type {
  IngredientRequirement,
  IngredientRequirementSource,
  OrderDishSource,
  ResolvedDishLine,
  UnmappedDish,
} from "./types";

/** Index recipes by "dishKey::size" (tray dishes) and by dishKey alone (the
 * per_pax / per_piece dishes, which never carry a size). A tray-cart lookup
 * always includes size; a selectedDishes/packedMeal lookup passes "". */
function indexRecipes(recipes: RecipeWithItems[]): Map<string, RecipeWithItems> {
  const map = new Map<string, RecipeWithItems>();
  for (const recipe of recipes) {
    if (!recipe.dishKey) continue;
    map.set(`${recipe.dishKey}::${recipe.size}`, recipe);
  }
  return map;
}

function lookupRecipe(index: Map<string, RecipeWithItems>, key: string, size: string): RecipeWithItems | null {
  return index.get(`${key}::${size}`) ?? (size ? null : index.get(`${key}::`) ?? null);
}

/** Every dish an order references, each resolved against the recipe book (or
 * left with recipeId: null if nothing matches). Pure — no aggregation, no
 * scaling by ingredient cost, just "this order needs N of this dish". */
export function resolveOrderDishes(order: OrderDishSource, recipes: RecipeWithItems[]): ResolvedDishLine[] {
  const index = indexRecipes(recipes);
  const lines: ResolvedDishLine[] = [];

  for (const line of order.cart) {
    const key = dishKey(line.dishId);
    const recipe = lookupRecipe(index, key, line.size);
    lines.push({ dishKey: key, dishName: recipe?.name ?? line.dishId, size: line.size, quantity: line.qty, recipeId: recipe?.id ?? null });
  }

  for (const line of order.packedMealCart) {
    const key = dishKey(line.dishId);
    const recipe = lookupRecipe(index, key, "");
    lines.push({ dishKey: key, dishName: recipe?.name ?? line.dishId, size: "", quantity: line.qty, recipeId: recipe?.id ?? null });
  }

  const pax = order.pax ?? 0;
  if (pax > 0) {
    for (const dishName of Object.values(order.selectedDishes)) {
      if (!dishName) continue;
      const key = dishKey(dishName);
      const recipe = lookupRecipe(index, key, "");
      lines.push({ dishKey: key, dishName: recipe?.name ?? dishName, size: "", quantity: pax, recipeId: recipe?.id ?? null });
    }
  }

  return lines;
}

type OrderForRequirements = OrderDishSource & { id: string; orderNumber: string; eventDate: string | null };

/** Aggregates ingredient requirements across every order given, deduping the
 * same ingredient across dishes and orders (FEATURE 2's "don't create two
 * separate purchases" rule) while keeping a per-order breakdown so the UI
 * can show *why* an ingredient is needed. */
export function computeIngredientRequirements(
  orders: OrderForRequirements[],
  recipes: RecipeWithItems[],
): { requirements: IngredientRequirement[]; unmapped: UnmappedDish[] } {
  const requirementByIngredient = new Map<string, IngredientRequirement>();
  const unmappedByKey = new Map<string, UnmappedDish>();
  const recipeById = new Map(recipes.map((r) => [r.id, r]));

  for (const order of orders) {
    const dishLines = resolveOrderDishes(order, recipes);

    for (const line of dishLines) {
      if (!line.recipeId) {
        const existing = unmappedByKey.get(line.dishKey);
        if (existing) existing.orderCount += 1;
        else unmappedByKey.set(line.dishKey, { dishKey: line.dishKey, dishName: line.dishName, orderCount: 1 });
        continue;
      }

      const recipe = recipeById.get(line.recipeId);
      if (!recipe) continue;

      for (const item of recipe.items) {
        const perUnit = perUnitQty(recipe, item.qty);
        const qty = perUnit * line.quantity;
        if (qty <= 0) continue;

        const source: IngredientRequirementSource = {
          orderId: order.id,
          orderNumber: order.orderNumber,
          eventDate: order.eventDate,
          dishName: line.dishName,
          quantity: qty,
        };

        const existing = requirementByIngredient.get(item.ingredientId);
        if (existing) {
          existing.requiredQty += qty;
          existing.sources.push(source);
        } else {
          requirementByIngredient.set(item.ingredientId, {
            ingredientId: item.ingredientId,
            ingredientName: item.ingredientName,
            baseUnit: item.unit,
            requiredQty: qty,
            sources: [source],
          });
        }
      }
    }
  }

  return {
    requirements: [...requirementByIngredient.values()].sort((a, b) => a.ingredientName.localeCompare(b.ingredientName)),
    unmapped: [...unmappedByKey.values()].sort((a, b) => b.orderCount - a.orderCount),
  };
}

export type StockAvailability = {
  ingredientId: string;
  physicalStock: number;
  reservedStock: number;
};

export type ShortageRow = {
  ingredientId: string;
  ingredientName: string;
  baseUnit: string;
  requiredQty: number;
  physicalStock: number;
  reservedStock: number;
  /** physicalStock - reservedStock, floored at 0 — never negative, matching
   * the brief's "Available Stock" definition. */
  availableStock: number;
  /** max(0, requiredQty - availableStock) — what to purchase. */
  shortageQty: number;
};

/** The brief's core formula, applied per ingredient:
 *    Available = Physical - Reserved (floored at 0)
 *    Shortage  = max(0, Required - Available)
 * `stockByIngredient` missing an entry is treated as zero stock everywhere —
 * an ingredient nobody has received yet is exactly as short as one at 0. */
export function computeShortages(
  requirements: IngredientRequirement[],
  stockByIngredient: Map<string, StockAvailability>,
): ShortageRow[] {
  return requirements.map((req) => {
    const stock = stockByIngredient.get(req.ingredientId);
    const physicalStock = stock?.physicalStock ?? 0;
    const reservedStock = stock?.reservedStock ?? 0;
    const availableStock = Math.max(0, physicalStock - reservedStock);
    const shortageQty = Math.max(0, req.requiredQty - availableStock);
    return {
      ingredientId: req.ingredientId,
      ingredientName: req.ingredientName,
      baseUnit: req.baseUnit,
      requiredQty: req.requiredQty,
      physicalStock,
      reservedStock,
      availableStock,
      shortageQty,
    };
  });
}

export type StockStatus = "sufficient" | "low" | "insufficient" | "out";

/** 🟢/🟡/🔴/⚫ classification for one ingredient row. `reorderLevel` drives
 * the sufficient-vs-low split when there's no active shortage. */
export function stockStatus(row: { availableStock: number; shortageQty: number; reorderLevel: number }): StockStatus {
  if (row.availableStock <= 0) return "out";
  if (row.shortageQty > 0) return "insufficient";
  if (row.availableStock <= row.reorderLevel) return "low";
  return "sufficient";
}
