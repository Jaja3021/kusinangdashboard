export const EXPENSE_CATEGORIES = [
  "Refunds / Adjustments",
  "Delivery & Logistics",
  "Food & Ingredient Purchases",
  "Fuel, LPG & Transport",
  "Packaging & Event Supplies",
  "Bank Fees",
  "Other Operating Expense",
  "Rent",
  "Unclassified Operating Expense",
  "Utilities",
  "Waste / Sanitation",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
