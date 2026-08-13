"use server";

import { revalidatePath } from "next/cache";
import { addRecipeItem, createRecipe, deleteRecipe, removeRecipeItem, updateRecipe } from "@/lib/costing/data";
import type { NewRecipe, Recipe, RecipeItem } from "@/lib/costing/types";

// RLS ("Admin manage recipes/recipe items", is_admin()) is the real
// authorization boundary — a non-admin's write simply fails.

export async function createRecipeAction(recipe: NewRecipe): Promise<Recipe> {
  const created = await createRecipe(recipe);
  revalidatePath("/dashboard/costing");
  return created;
}

export async function updateRecipeAction(id: string, patch: Partial<NewRecipe>): Promise<Recipe> {
  const updated = await updateRecipe(id, patch);
  revalidatePath("/dashboard/costing");
  return updated;
}

export async function deleteRecipeAction(id: string): Promise<void> {
  await deleteRecipe(id);
  revalidatePath("/dashboard/costing");
}

export async function addRecipeItemAction(input: { recipeId: string; ingredientId: string; qty: number; unitCost: number }): Promise<RecipeItem> {
  const created = await addRecipeItem(input);
  revalidatePath("/dashboard/costing");
  return created;
}

export async function removeRecipeItemAction(id: string): Promise<void> {
  await removeRecipeItem(id);
  revalidatePath("/dashboard/costing");
}
