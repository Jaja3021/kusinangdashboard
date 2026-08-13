import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity-log/data";
import { formatPeso } from "@/lib/format";
import type { NewRecipe, Recipe, RecipeItem, RecipeWithItems } from "./types";

type RecipeRow = {
  id: string;
  name: string;
  size: string;
  category: string;
  srp: number;
  labor_cost: number;
  overhead_cost: number;
};

type RecipeItemRow = {
  id: string;
  recipe_id: string;
  ingredient_id: string;
  qty: number;
  unit_cost: number;
  ingredients: { name: string; base_unit: string } | { name: string; base_unit: string }[] | null;
};

const RECIPE_COLUMNS = "id, name, size, category, srp, labor_cost, overhead_cost";

function rowToRecipe(row: RecipeRow): Recipe {
  return {
    id: row.id,
    name: row.name,
    size: row.size,
    category: row.category,
    srp: row.srp,
    laborCost: row.labor_cost,
    overheadCost: row.overhead_cost,
  };
}

function itemIngredient(rel: RecipeItemRow["ingredients"]): { name: string; base_unit: string } {
  const fallback = { name: "—", base_unit: "" };
  if (!rel) return fallback;
  return Array.isArray(rel) ? (rel[0] ?? fallback) : rel;
}

function rowToItem(row: RecipeItemRow): RecipeItem {
  const ing = itemIngredient(row.ingredients);
  return {
    id: row.id,
    recipeId: row.recipe_id,
    ingredientId: row.ingredient_id,
    ingredientName: ing.name,
    unit: ing.base_unit,
    qty: row.qty,
    unitCost: row.unit_cost,
  };
}

export async function getRecipesWithItems(): Promise<RecipeWithItems[]> {
  const supabase = createSupabaseServerClient();

  const { data: recipeRows, error: recipeError } = await supabase.from("recipes").select(RECIPE_COLUMNS).order("name");
  if (recipeError) throw new Error(`Failed to load recipes: ${recipeError.message}`);

  const { data: itemRows, error: itemError } = await supabase
    .from("recipe_items")
    .select("id, recipe_id, ingredient_id, qty, unit_cost, ingredients(name, base_unit)");
  if (itemError) throw new Error(`Failed to load recipe items: ${itemError.message}`);

  const items = (itemRows as unknown as RecipeItemRow[]).map(rowToItem);

  return (recipeRows as RecipeRow[]).map((row) => {
    const recipe = rowToRecipe(row);
    return { ...recipe, items: items.filter((i) => i.recipeId === recipe.id) };
  });
}

export async function createRecipe(recipe: NewRecipe): Promise<Recipe> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("recipes")
    .insert({
      name: recipe.name,
      size: recipe.size,
      category: recipe.category,
      srp: recipe.srp,
      labor_cost: recipe.laborCost,
      overhead_cost: recipe.overheadCost,
    })
    .select(RECIPE_COLUMNS)
    .single();
  if (error) throw new Error(`Failed to create recipe: ${error.message}`);
  const created = rowToRecipe(data as RecipeRow);
  await logActivity({
    module: "Costing",
    action: "CREATE",
    entity: "Recipe",
    name: created.name,
    details: `SRP: ${formatPeso(created.srp)} · ${created.category}`,
  });
  return created;
}

export async function updateRecipe(id: string, patch: Partial<NewRecipe>): Promise<Recipe> {
  const supabase = createSupabaseServerClient();
  const update: Record<string, unknown> = {};
  if (patch.name !== undefined) update.name = patch.name;
  if (patch.size !== undefined) update.size = patch.size;
  if (patch.category !== undefined) update.category = patch.category;
  if (patch.srp !== undefined) update.srp = patch.srp;
  if (patch.laborCost !== undefined) update.labor_cost = patch.laborCost;
  if (patch.overheadCost !== undefined) update.overhead_cost = patch.overheadCost;

  const { data, error } = await supabase.from("recipes").update(update).eq("id", id).select(RECIPE_COLUMNS).single();
  if (error) throw new Error(`Failed to update recipe: ${error.message}`);
  const updated = rowToRecipe(data as RecipeRow);
  await logActivity({
    module: "Costing",
    action: "UPDATE",
    entity: "Recipe",
    name: updated.name,
    details: `SRP: ${formatPeso(updated.srp)} · Labor: ${formatPeso(updated.laborCost)} · Overhead: ${formatPeso(updated.overheadCost)}`,
  });
  return updated;
}

export async function deleteRecipe(id: string): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { data: existing } = await supabase.from("recipes").select("name").eq("id", id).maybeSingle();
  const { error } = await supabase.from("recipes").delete().eq("id", id);
  if (error) throw new Error(`Failed to delete recipe: ${error.message}`);
  await logActivity({ module: "Costing", action: "DELETE", entity: "Recipe", name: (existing as { name: string } | null)?.name ?? "" });
}

export async function addRecipeItem(input: { recipeId: string; ingredientId: string; qty: number; unitCost: number }): Promise<RecipeItem> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("recipe_items")
    .insert({ recipe_id: input.recipeId, ingredient_id: input.ingredientId, qty: input.qty, unit_cost: input.unitCost })
    .select("id, recipe_id, ingredient_id, qty, unit_cost, ingredients(name, base_unit)")
    .single();
  if (error) throw new Error(`Failed to add recipe item: ${error.message}`);
  const item = rowToItem(data as unknown as RecipeItemRow);

  const { data: recipeRow } = await supabase.from("recipes").select("name").eq("id", input.recipeId).maybeSingle();
  const recipeName = (recipeRow as { name: string } | null)?.name ?? "";
  await logActivity({
    module: "Costing",
    action: "CREATE",
    entity: "BOM Item",
    name: item.ingredientName,
    details: `Added to ${recipeName} · ${item.qty} ${item.unit} × ${formatPeso(item.unitCost, { cents: true })} = ${formatPeso(item.qty * item.unitCost, { cents: true })}`,
  });

  return item;
}

export async function removeRecipeItem(id: string): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { data: existing } = await supabase
    .from("recipe_items")
    .select("ingredients(name), recipes(name)")
    .eq("id", id)
    .maybeSingle();
  const { error } = await supabase.from("recipe_items").delete().eq("id", id);
  if (error) throw new Error(`Failed to remove recipe item: ${error.message}`);

  type Rel = { name: string } | { name: string }[] | null;
  const row = existing as { ingredients: Rel; recipes: Rel } | null;
  const pick = (rel: Rel) => (Array.isArray(rel) ? rel[0]?.name : rel?.name) ?? "";
  await logActivity({
    module: "Costing",
    action: "DELETE",
    entity: "BOM Item",
    name: row ? pick(row.ingredients) : "",
    details: row ? `Removed from ${pick(row.recipes)}` : "",
  });
}
