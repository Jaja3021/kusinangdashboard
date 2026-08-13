"use server";

import { revalidatePath } from "next/cache";
import {
  createIngredient,
  createSupplier,
  deleteIngredient,
  deleteSupplier,
  receiveStock,
  recordMovement,
} from "@/lib/inventory/data";
import type { Ingredient, NewIngredient, NewMovement, NewSupplier, StockMovement, Supplier } from "@/lib/inventory/types";

// RLS ("Admin manage …", is_admin()) on every inventory table is the real
// authorization boundary — a non-admin's write simply fails.

export async function createIngredientAction(ingredient: NewIngredient): Promise<Ingredient> {
  const created = await createIngredient(ingredient);
  revalidatePath("/dashboard/inventory");
  return created;
}

export async function deleteIngredientAction(id: string): Promise<void> {
  await deleteIngredient(id);
  revalidatePath("/dashboard/inventory");
}

export async function createSupplierAction(supplier: NewSupplier): Promise<Supplier> {
  const created = await createSupplier(supplier);
  revalidatePath("/dashboard/inventory");
  return created;
}

export async function deleteSupplierAction(id: string): Promise<void> {
  await deleteSupplier(id);
  revalidatePath("/dashboard/inventory");
}

export async function receiveStockAction(input: {
  ingredientId: string;
  branch: string;
  qty: number;
  unitCost: number;
  reference: string;
}): Promise<{ newUnitCost: number; newQty: number; movement: StockMovement }> {
  const result = await receiveStock(input);
  revalidatePath("/dashboard/inventory");
  return result;
}

export async function recordMovementAction(input: NewMovement): Promise<{ newQty: number; movement: StockMovement }> {
  const result = await recordMovement(input);
  revalidatePath("/dashboard/inventory");
  return result;
}
