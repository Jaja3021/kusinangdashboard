// How a recipe's bill of materials scales up to an order's requirement.
// See supabase/recipe_yield.sql for why this lives on `recipes` rather than
// on a separate menu_items table.
export const RECIPE_BASES = ["per_pax", "per_tray", "per_piece"] as const;
export type RecipeBasis = (typeof RECIPE_BASES)[number];

export const BASIS_LABELS: Record<RecipeBasis, string> = {
  per_pax: "Per pax",
  per_tray: "Per tray",
  per_piece: "Per piece",
};

/** What one unit of each basis is called, for "serves N ___" copy. */
export const BASIS_UNIT_LABELS: Record<RecipeBasis, string> = {
  per_pax: "pax",
  per_tray: "tray(s)",
  per_piece: "piece(s)",
};

export type Recipe = {
  id: string;
  name: string;
  size: string;
  category: string;
  srp: number;
  laborCost: number;
  overheadCost: number;
  /** Normalized dish name joining this recipe to the dishes an order carries
   * (lib/menu/dish-catalog.ts). Null = a free-form costing recipe that isn't
   * linked to anything the storefront sells. */
  dishKey: string | null;
  basis: RecipeBasis;
  /** How many pax/trays/pieces one batch of this BOM covers. */
  yieldQty: number;
};

export type NewRecipe = Omit<Recipe, "id">;

export type RecipeItem = {
  id: string;
  recipeId: string;
  ingredientId: string;
  ingredientName: string;
  unit: string;
  qty: number;
  unitCost: number;
};

export type RecipeWithItems = Recipe & { items: RecipeItem[] };

/** The BOM scaled down to a single pax/tray/piece — the unit requirements
 * planning multiplies by. */
export function perUnitQty(recipe: Recipe, itemQty: number): number {
  return recipe.yieldQty > 0 ? itemQty / recipe.yieldQty : 0;
}

export function ingredientCost(recipe: RecipeWithItems): number {
  return recipe.items.reduce((sum, i) => sum + i.qty * i.unitCost, 0);
}

export function cogs(recipe: RecipeWithItems): number {
  return ingredientCost(recipe) + recipe.laborCost + recipe.overheadCost;
}

export function grossMargin(recipe: RecipeWithItems): number {
  return recipe.srp - cogs(recipe);
}

export function grossMarginPct(recipe: RecipeWithItems): number {
  return recipe.srp > 0 ? (grossMargin(recipe) / recipe.srp) * 100 : 0;
}
