import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity-log/data";
import { BRANCHES } from "@/lib/mt/branches";
import { formatPeso } from "@/lib/format";
import type {
  Ingredient,
  IngredientWithStock,
  MovementType,
  NewIngredient,
  NewMovement,
  NewSupplier,
  StockMovement,
  StockRow,
  Supplier,
} from "./types";

type IngredientRow = {
  id: string;
  name: string;
  category: string;
  purchase_unit: string;
  purchase_qty: number;
  base_unit: string;
  unit_cost: number;
  reorder_level: number;
  supplier_id: string | null;
};

type SupplierRow = {
  id: string;
  name: string;
  contact_person: string;
  phone: string;
  email: string;
  category: string;
  notes: string;
};

type StockRowDb = { ingredient_id: string; branch: string; quantity: number };

type MovementRow = {
  id: string;
  ingredient_id: string;
  branch: string;
  type: MovementType;
  qty: number;
  unit_cost: number | null;
  reference: string;
  created_at: string;
  ingredients: { name: string } | { name: string }[] | null;
};

const INGREDIENT_COLUMNS = "id, name, category, purchase_unit, purchase_qty, base_unit, unit_cost, reorder_level, supplier_id";
const SUPPLIER_COLUMNS = "id, name, contact_person, phone, email, category, notes";

function rowToIngredient(row: IngredientRow): Ingredient {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    purchaseUnit: row.purchase_unit,
    purchaseQty: row.purchase_qty,
    baseUnit: row.base_unit,
    unitCost: row.unit_cost,
    reorderLevel: row.reorder_level,
    supplierId: row.supplier_id,
  };
}

function rowToSupplier(row: SupplierRow): Supplier {
  return {
    id: row.id,
    name: row.name,
    contactPerson: row.contact_person,
    phone: row.phone,
    email: row.email,
    category: row.category,
    notes: row.notes,
  };
}

function branchLabel(id: string): string {
  return BRANCHES.find((b) => b.id === id)?.name ?? id;
}

function movementIngredientName(rel: MovementRow["ingredients"]): string {
  if (!rel) return "—";
  return Array.isArray(rel) ? (rel[0]?.name ?? "—") : rel.name;
}

function rowToMovement(row: MovementRow): StockMovement {
  return {
    id: row.id,
    ingredientId: row.ingredient_id,
    ingredientName: movementIngredientName(row.ingredients),
    branch: row.branch,
    type: row.type,
    qty: row.qty,
    unitCost: row.unit_cost,
    reference: row.reference,
    createdAt: row.created_at,
  };
}

export async function getIngredients(): Promise<Ingredient[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.from("ingredients").select(INGREDIENT_COLUMNS).order("name");
  if (error) throw new Error(`Failed to load ingredients: ${error.message}`);
  return (data as IngredientRow[]).map(rowToIngredient);
}

export async function getSuppliers(): Promise<Supplier[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.from("suppliers").select(SUPPLIER_COLUMNS).order("name");
  if (error) throw new Error(`Failed to load suppliers: ${error.message}`);
  return (data as SupplierRow[]).map(rowToSupplier);
}

export async function getStockRows(): Promise<StockRow[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.from("ingredient_stock").select("ingredient_id, branch, quantity");
  if (error) throw new Error(`Failed to load stock: ${error.message}`);
  return (data as StockRowDb[]).map((r) => ({ ingredientId: r.ingredient_id, branch: r.branch, quantity: r.quantity }));
}

export async function getIngredientsWithStock(): Promise<IngredientWithStock[]> {
  const [ingredients, stock] = await Promise.all([getIngredients(), getStockRows()]);
  return ingredients.map((ing) => {
    const stockByBranch: Record<string, number> = {};
    let totalStock = 0;
    for (const s of stock) {
      if (s.ingredientId !== ing.id) continue;
      stockByBranch[s.branch] = s.quantity;
      totalStock += s.quantity;
    }
    return { ...ing, stockByBranch, totalStock };
  });
}

export async function getMovements(limit = 200): Promise<StockMovement[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("stock_movements")
    .select("id, ingredient_id, branch, type, qty, unit_cost, reference, created_at, ingredients(name)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Failed to load stock movements: ${error.message}`);
  return (data as unknown as MovementRow[]).map(rowToMovement);
}

export async function createIngredient(ingredient: NewIngredient): Promise<Ingredient> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("ingredients")
    .insert({
      name: ingredient.name,
      category: ingredient.category,
      purchase_unit: ingredient.purchaseUnit,
      purchase_qty: ingredient.purchaseQty,
      base_unit: ingredient.baseUnit,
      unit_cost: ingredient.unitCost,
      reorder_level: ingredient.reorderLevel,
      supplier_id: ingredient.supplierId,
    })
    .select(INGREDIENT_COLUMNS)
    .single();
  if (error) throw new Error(`Failed to create ingredient: ${error.message}`);
  const created = rowToIngredient(data as IngredientRow);
  await logActivity({
    module: "Inventory",
    action: "CREATE",
    entity: "Ingredient",
    name: created.name,
    details: `1 ${created.purchaseUnit} = ${created.purchaseQty} ${created.baseUnit} · ${formatPeso(created.unitCost, { cents: true })}/${created.baseUnit}`,
  });
  return created;
}

export async function deleteIngredient(id: string): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { data: existing } = await supabase.from("ingredients").select("name").eq("id", id).maybeSingle();
  const { error } = await supabase.from("ingredients").delete().eq("id", id);
  if (error) throw new Error(`Failed to delete ingredient: ${error.message}`);
  await logActivity({ module: "Inventory", action: "DELETE", entity: "Ingredient", name: (existing as { name: string } | null)?.name ?? "" });
}

export async function createSupplier(supplier: NewSupplier): Promise<Supplier> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("suppliers")
    .insert({
      name: supplier.name,
      contact_person: supplier.contactPerson,
      phone: supplier.phone,
      email: supplier.email,
      category: supplier.category,
      notes: supplier.notes,
    })
    .select(SUPPLIER_COLUMNS)
    .single();
  if (error) throw new Error(`Failed to create supplier: ${error.message}`);
  const created = rowToSupplier(data as SupplierRow);
  await logActivity({
    module: "Inventory",
    action: "CREATE",
    entity: "Supplier",
    name: created.name,
    details: [created.category, created.contactPerson].filter(Boolean).join(" · "),
  });
  return created;
}

export async function deleteSupplier(id: string): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { data: existing } = await supabase.from("suppliers").select("name").eq("id", id).maybeSingle();
  const { error } = await supabase.from("suppliers").delete().eq("id", id);
  if (error) throw new Error(`Failed to delete supplier: ${error.message}`);
  await logActivity({ module: "Inventory", action: "DELETE", entity: "Supplier", name: (existing as { name: string } | null)?.name ?? "" });
}

/** Receive stock: logs a Receive movement, adds to the branch's on-hand qty, and
 * re-prices the ingredient's unit cost as a running weighted average. */
export async function receiveStock(input: {
  ingredientId: string;
  branch: string;
  qty: number;
  unitCost: number;
  reference: string;
}): Promise<{ newUnitCost: number; newQty: number; movement: StockMovement }> {
  const supabase = createSupabaseServerClient();

  const { data: ingredient, error: ingredientError } = await supabase
    .from("ingredients")
    .select("name, base_unit, unit_cost")
    .eq("id", input.ingredientId)
    .single();
  if (ingredientError) throw new Error(`Failed to load ingredient: ${ingredientError.message}`);

  const { data: existingStock } = await supabase
    .from("ingredient_stock")
    .select("quantity")
    .eq("ingredient_id", input.ingredientId)
    .eq("branch", input.branch)
    .maybeSingle();

  const priorQty = (existingStock as { quantity: number } | null)?.quantity ?? 0;
  const priorCost = (ingredient as { unit_cost: number }).unit_cost;
  const newQty = priorQty + input.qty;
  // Weighted average across this ingredient's total holdings at all branches,
  // approximated using the branch-level prior qty as the base — matches the
  // "avg ₱X" pricing shown in the activity log.
  const newUnitCost = priorQty + input.qty > 0 ? (priorQty * priorCost + input.qty * input.unitCost) / (priorQty + input.qty) : input.unitCost;

  const { error: upsertError } = await supabase
    .from("ingredient_stock")
    .upsert({ ingredient_id: input.ingredientId, branch: input.branch, quantity: newQty }, { onConflict: "ingredient_id,branch" });
  if (upsertError) throw new Error(`Failed to update stock: ${upsertError.message}`);

  const { error: costError } = await supabase.from("ingredients").update({ unit_cost: newUnitCost }).eq("id", input.ingredientId);
  if (costError) throw new Error(`Failed to update ingredient cost: ${costError.message}`);

  const { data: movementRow, error: movementError } = await supabase
    .from("stock_movements")
    .insert({
      ingredient_id: input.ingredientId,
      branch: input.branch,
      type: "Receive",
      qty: input.qty,
      unit_cost: input.unitCost,
      reference: input.reference,
    })
    .select("id, ingredient_id, branch, type, qty, unit_cost, reference, created_at, ingredients(name)")
    .single();
  if (movementError) throw new Error(`Failed to log stock receipt: ${movementError.message}`);

  const { name: ingredientName, base_unit: baseUnit } = ingredient as { name: string; base_unit: string };
  await logActivity({
    module: "Inventory",
    action: "CREATE",
    entity: "Stock Receipt",
    name: ingredientName,
    details: `+${input.qty} ${baseUnit} @ ${formatPeso(input.unitCost)} → avg ${formatPeso(newUnitCost)} (${branchLabel(input.branch)})`,
  });

  return { newUnitCost, newQty, movement: rowToMovement(movementRow as unknown as MovementRow) };
}

/** Usage / Waste / Adjustment: `qty` is the signed delta to apply to on-hand stock. */
export async function recordMovement(input: NewMovement): Promise<{ newQty: number; movement: StockMovement }> {
  const supabase = createSupabaseServerClient();

  const { data: ingredient } = await supabase.from("ingredients").select("name, base_unit").eq("id", input.ingredientId).single();

  const { data: existingStock } = await supabase
    .from("ingredient_stock")
    .select("quantity")
    .eq("ingredient_id", input.ingredientId)
    .eq("branch", input.branch)
    .maybeSingle();

  const priorQty = (existingStock as { quantity: number } | null)?.quantity ?? 0;
  const newQty = priorQty + input.qty;

  const { error: upsertError } = await supabase
    .from("ingredient_stock")
    .upsert({ ingredient_id: input.ingredientId, branch: input.branch, quantity: newQty }, { onConflict: "ingredient_id,branch" });
  if (upsertError) throw new Error(`Failed to update stock: ${upsertError.message}`);

  const { data: movementRow, error: movementError } = await supabase
    .from("stock_movements")
    .insert({
      ingredient_id: input.ingredientId,
      branch: input.branch,
      type: input.type,
      qty: input.qty,
      unit_cost: null,
      reference: input.reference,
    })
    .select("id, ingredient_id, branch, type, qty, unit_cost, reference, created_at, ingredients(name)")
    .single();
  if (movementError) throw new Error(`Failed to log stock movement: ${movementError.message}`);

  const ing = ingredient as { name: string; base_unit: string } | null;
  await logActivity({
    module: "Inventory",
    action: "CREATE",
    entity: `Stock ${input.type}`,
    name: ing?.name ?? "",
    details: `${input.qty > 0 ? "+" : ""}${input.qty} ${ing?.base_unit ?? ""} (${branchLabel(input.branch)})${input.reference ? ` · ${input.reference}` : ""}`,
  });

  return { newQty, movement: rowToMovement(movementRow as unknown as MovementRow) };
}
