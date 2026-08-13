export type Recipe = {
  id: string;
  name: string;
  size: string;
  category: string;
  srp: number;
  laborCost: number;
  overheadCost: number;
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
