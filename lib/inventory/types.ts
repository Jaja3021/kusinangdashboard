export const MOVEMENT_TYPES = ["Receive", "Usage", "Adjustment", "Waste"] as const;
export type MovementType = (typeof MOVEMENT_TYPES)[number];

export type Ingredient = {
  id: string;
  name: string;
  category: string;
  purchaseUnit: string;
  purchaseQty: number;
  baseUnit: string;
  unitCost: number;
  reorderLevel: number;
  supplierId: string | null;
};

export type NewIngredient = Omit<Ingredient, "id">;

export type Supplier = {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  category: string;
  notes: string;
};

export type NewSupplier = Omit<Supplier, "id">;

export type StockRow = {
  ingredientId: string;
  branch: string;
  quantity: number;
};

/** One ingredient's holdings, merged across all branches that have a stock row (0 for the rest). */
export type IngredientWithStock = Ingredient & {
  stockByBranch: Record<string, number>;
  totalStock: number;
};

export type StockMovement = {
  id: string;
  ingredientId: string;
  ingredientName: string;
  branch: string;
  type: MovementType;
  qty: number;
  unitCost: number | null;
  reference: string;
  createdAt: string;
};

export type NewMovement = {
  ingredientId: string;
  branch: string;
  type: MovementType;
  qty: number;
  unitCost: number | null;
  reference: string;
};
