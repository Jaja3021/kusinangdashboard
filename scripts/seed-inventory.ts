// One-off seed: populates public.suppliers, public.ingredients,
// public.ingredient_stock, and public.recipes/recipe_items from the starter
// catalog in lib/inventory/seed-catalog.ts and lib/inventory/recipe-book.ts.
//
// Run AFTER supabase/inventory.sql, supabase/costing.sql, and
// supabase/recipe_yield.sql have been applied — this script only inserts
// rows, it never runs DDL.
//
// Usage: npx tsx scripts/seed-inventory.ts [--force]
// (--force skips the "tables already have rows" guard and inserts anyway;
// existing suppliers/ingredients are matched by name and reused rather than
// duplicated, so --force is safe to re-run.)

import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import { BRANCHES } from "../lib/mt/branches";
import { SEED_INGREDIENTS, SEED_SUPPLIERS } from "../lib/inventory/seed-catalog";
import { SEED_RECIPES } from "../lib/inventory/recipe-book";
import { dishKey } from "../lib/menu/dish-catalog";

function loadEnvLocal() {
  const text = readFileSync(new URL("../.env.local", import.meta.url), "utf-8");
  const env: Record<string, string> = {};
  for (const line of text.split("\n")) {
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (match) env[match[1]] = match[2];
  }
  return env;
}

const FORCE = process.argv.includes("--force");

// Opening stock is deliberately uneven across branches and ingredients —
// some ingredients start comfortably above reorder level, a handful start
// short of what a typical upcoming event needs, so the shortage/purchase-list
// features (Phase 4+) have real 🔴 rows to show from the first login instead
// of a uniformly green inventory that proves nothing.
const SHORT_INGREDIENTS = new Set([
  "Chicken", "Beef Brisket", "Shrimp", "Pork Belly", "Cheese", "Tanigue",
]);

function openingStock(reorderLevel: number, short: boolean): number {
  if (short) return Math.max(1, Math.round(reorderLevel * 0.55));
  return Math.round(reorderLevel * (1.8 + Math.random() * 0.9));
}

async function main() {
  const env = loadEnvLocal();
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  if (!FORCE) {
    const { count, error } = await supabase.from("ingredients").select("id", { count: "exact", head: true });
    if (error) throw new Error(`Failed to check existing ingredients: ${error.message}`);
    if ((count ?? 0) > 0) {
      console.error(`ingredients already has ${count} row(s). Re-run with --force to seed anyway (existing rows are matched by name, not duplicated).`);
      process.exit(1);
    }
  }

  // --- Suppliers ---------------------------------------------------
  const supplierIdByName = new Map<string, string>();
  {
    const { data: existing, error } = await supabase.from("suppliers").select("id, name");
    if (error) throw new Error(`Failed to load suppliers: ${error.message}`);
    for (const row of existing as { id: string; name: string }[]) supplierIdByName.set(row.name, row.id);
  }
  const newSuppliers = SEED_SUPPLIERS.filter((s) => !supplierIdByName.has(s.name));
  if (newSuppliers.length > 0) {
    const { data, error } = await supabase
      .from("suppliers")
      .insert(
        newSuppliers.map((s) => ({
          name: s.name,
          contact_person: s.contactPerson,
          phone: s.phone,
          email: s.email,
          category: s.category,
          notes: s.notes,
        })),
      )
      .select("id, name");
    if (error) throw new Error(`Failed to insert suppliers: ${error.message}`);
    for (const row of data as { id: string; name: string }[]) supplierIdByName.set(row.name, row.id);
  }
  console.log(`Suppliers: ${supplierIdByName.size} total (${newSuppliers.length} new).`);

  // --- Ingredients ---------------------------------------------------
  const ingredientIdByName = new Map<string, string>();
  {
    const { data: existing, error } = await supabase.from("ingredients").select("id, name");
    if (error) throw new Error(`Failed to load ingredients: ${error.message}`);
    for (const row of existing as { id: string; name: string }[]) ingredientIdByName.set(row.name, row.id);
  }
  const newIngredients = SEED_INGREDIENTS.filter((i) => !ingredientIdByName.has(i.name));
  if (newIngredients.length > 0) {
    const { data, error } = await supabase
      .from("ingredients")
      .insert(
        newIngredients.map((i) => ({
          name: i.name,
          category: i.category,
          purchase_unit: i.purchaseUnit,
          purchase_qty: i.purchaseQty,
          base_unit: i.baseUnit,
          unit_cost: i.unitCost,
          reorder_level: i.reorderLevel,
          supplier_id: supplierIdByName.get(i.supplier) ?? null,
        })),
      )
      .select("id, name");
    if (error) throw new Error(`Failed to insert ingredients: ${error.message}`);
    for (const row of data as { id: string; name: string }[]) ingredientIdByName.set(row.name, row.id);
  }
  console.log(`Ingredients: ${ingredientIdByName.size} total (${newIngredients.length} new).`);

  // --- Opening stock, per branch ---------------------------------------
  const { data: existingStock, error: stockCheckError } = await supabase
    .from("ingredient_stock")
    .select("ingredient_id, branch");
  if (stockCheckError) throw new Error(`Failed to load existing stock: ${stockCheckError.message}`);
  const stockKey = (ingredientId: string, branch: string) => `${ingredientId}::${branch}`;
  const existingStockKeys = new Set(
    (existingStock as { ingredient_id: string; branch: string }[]).map((r) => stockKey(r.ingredient_id, r.branch)),
  );

  const stockRows: { ingredient_id: string; branch: string; quantity: number }[] = [];
  const movementRows: { ingredient_id: string; branch: string; type: "Receive"; qty: number; unit_cost: number; reference: string }[] = [];
  for (const ing of SEED_INGREDIENTS) {
    const id = ingredientIdByName.get(ing.name);
    if (!id) continue;
    const short = SHORT_INGREDIENTS.has(ing.name);
    for (const branch of BRANCHES) {
      if (existingStockKeys.has(stockKey(id, branch.id))) continue;
      // The Metro Manila branch runs leaner stock on the deliberately-short
      // ingredients so a shortage shows up somewhere concrete, not blurred
      // into an average across all three branches.
      const qty = branch.id === "metro-manila" && short ? Math.max(1, Math.round(ing.reorderLevel * 0.3)) : openingStock(ing.reorderLevel, short);
      stockRows.push({ ingredient_id: id, branch: branch.id, quantity: qty });
      movementRows.push({ ingredient_id: id, branch: branch.id, type: "Receive", qty, unit_cost: ing.unitCost, reference: "Opening stock" });
    }
  }
  if (stockRows.length > 0) {
    const { error } = await supabase.from("ingredient_stock").upsert(stockRows, { onConflict: "ingredient_id,branch" });
    if (error) throw new Error(`Failed to seed stock: ${error.message}`);
    const { error: moveError } = await supabase.from("stock_movements").insert(movementRows);
    if (moveError) throw new Error(`Failed to seed opening movements: ${moveError.message}`);
  }
  console.log(`Opening stock: ${stockRows.length} branch-ingredient rows seeded.`);

  // --- Recipes + BOM ---------------------------------------------------
  const { data: existingRecipes, error: recipeCheckError } = await supabase
    .from("recipes")
    .select("id, dish_key, size");
  if (recipeCheckError) throw new Error(`Failed to load existing recipes: ${recipeCheckError.message}`);
  const existingRecipeKeys = new Set(
    (existingRecipes as { dish_key: string | null; size: string }[])
      .filter((r) => r.dish_key)
      .map((r) => `${r.dish_key}::${r.size}`),
  );

  let recipesCreated = 0;
  let itemsCreated = 0;
  let skippedMissingIngredient = 0;

  for (const recipe of SEED_RECIPES) {
    const key = dishKey(recipe.dish);
    if (existingRecipeKeys.has(`${key}::${recipe.size}`)) continue;

    const items = recipe.items
      .map((item) => ({ ingredientId: ingredientIdByName.get(item.ingredient), qty: item.qty }))
      .filter((item): item is { ingredientId: string; qty: number } => {
        if (!item.ingredientId) {
          skippedMissingIngredient++;
          return false;
        }
        return true;
      });
    if (items.length === 0) continue;

    const { data: recipeRow, error: recipeError } = await supabase
      .from("recipes")
      .insert({
        name: recipe.dish,
        size: recipe.size,
        category: recipe.category,
        srp: recipe.srp,
        labor_cost: recipe.laborCost,
        overhead_cost: recipe.overheadCost,
        dish_key: key,
        basis: recipe.basis,
        yield_qty: 1,
      })
      .select("id")
      .single();
    if (recipeError) throw new Error(`Failed to insert recipe "${recipe.dish}": ${recipeError.message}`);
    recipesCreated++;

    const recipeId = (recipeRow as { id: string }).id;
    const { error: itemsError } = await supabase.from("recipe_items").insert(
      items.map((item) => {
        const seedIngredient = SEED_INGREDIENTS.find((i) => ingredientIdByName.get(i.name) === item.ingredientId);
        return {
          recipe_id: recipeId,
          ingredient_id: item.ingredientId,
          qty: item.qty,
          unit_cost: seedIngredient?.unitCost ?? 0,
        };
      }),
    );
    if (itemsError) throw new Error(`Failed to insert recipe items for "${recipe.dish}": ${itemsError.message}`);
    itemsCreated += items.length;
  }

  console.log(`Recipes: ${recipesCreated} new (${itemsCreated} BOM lines).`);
  if (skippedMissingIngredient > 0) {
    console.warn(`Skipped ${skippedMissingIngredient} recipe line(s) whose ingredient wasn't found — check recipe-book.ts against seed-catalog.ts.`);
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
