// Grouped expense taxonomy (accounting-style: COGS vs. direct event costs vs.
// overhead vs. fixed OPEX vs. revenue adjustments).

export const EXPENSE_CATEGORY_GROUPS = [
  {
    label: "Direct Costs (COGS)",
    categories: [
      "Food & Raw Ingredients",
      "Beverages & Bar Supplies",
      "Packaging & Catering Disposables",
      "Kitchen LPG & Cooking Gas",
    ],
  },
  {
    label: "Direct Event Expenses",
    categories: [
      "Event Equipment & Linen Rentals",
      "Subcontracted Delivery & Logistics",
      "Decor & Venue Direct Fees",
    ],
  },
  {
    label: "Variable Overhead",
    categories: [
      "Kitchen Utilities",
      "Waste & Sanitation",
      "Vehicle Fuel, Tolls & Maintenance",
      "Kitchen Repairs & Maintenance",
    ],
  },
  {
    label: "Fixed OPEX",
    categories: [
      "Facility Rent",
      "Insurance & Licenses",
      "Software, POS & Tech",
      "Bank & Payment Processing Fees",
      "Marketing & Advertising",
      "Office & General Admin",
    ],
  },
  {
    label: "Revenue Adjustments",
    categories: ["Refunds, Discounts & Adjustments"],
  },
] as const;

export type ExpenseCategoryGroup = { label: string; categories: ExpenseCategory[] };

export type ExpenseCategory = (typeof EXPENSE_CATEGORY_GROUPS)[number]["categories"][number];

export const EXPENSE_CATEGORIES: ExpenseCategory[] = EXPENSE_CATEGORY_GROUPS.flatMap((g) => [...g.categories]);

/** Which group a category belongs to — shown as the right-aligned gray label
 * next to each row in the category combobox. */
export const GROUP_OF_CATEGORY: Record<ExpenseCategory, string> = Object.fromEntries(
  EXPENSE_CATEGORY_GROUPS.flatMap((g) => g.categories.map((c) => [c, g.label])),
) as Record<ExpenseCategory, string>;

/** Maps every category from the two earlier taxonomy revisions onto its
 * closest final one — used once by scripts/migrate-expense-categories.mjs to
 * update existing Supabase rows. */
export const OLD_TO_NEW_CATEGORY: Record<string, ExpenseCategory> = {
  // From the original 11-category flat list.
  "Refunds / Adjustments": "Refunds, Discounts & Adjustments",
  "Delivery & Logistics": "Subcontracted Delivery & Logistics",
  "Food & Ingredient Purchases": "Food & Raw Ingredients",
  "Fuel, LPG & Transport": "Kitchen LPG & Cooking Gas",
  "Packaging & Event Supplies": "Packaging & Catering Disposables",
  "Bank Fees": "Bank & Payment Processing Fees",
  "Other Operating Expense": "Office & General Admin",
  Rent: "Facility Rent",
  "Unclassified Operating Expense": "Office & General Admin",
  Utilities: "Kitchen Utilities",
  "Waste / Sanitation": "Waste & Sanitation",
  // From the first grouped revision (drafted groups 3/5 before the full
  // reference was available).
  "Rent & Lease": "Facility Rent",
  Insurance: "Insurance & Licenses",
  "Permits & Licenses": "Insurance & Licenses",
  "Refunds & Adjustments": "Refunds, Discounts & Adjustments",
  "Miscellaneous / Unclassified": "Office & General Admin",
};

/** Common vendor/item names staff actually type, mapped to the category that
 * covers them — lets "Add Expense" search by what was bought rather than
 * requiring staff to already know the accounting category name. */
export const CATEGORY_KEYWORDS: Record<ExpenseCategory, string[]> = {
  "Food & Raw Ingredients": ["ingredient", "grocery", "market", "meat", "vegetable", "rice", "seafood", "poultry", "produce"],
  "Beverages & Bar Supplies": ["beverage", "soda", "juice", "water", "bar supply", "syrup", "coffee", "ice"],
  "Packaging & Catering Disposables": ["packaging", "container", "styro", "styrofoam", "disposable", "cup", "utensil", "foil"],
  "Kitchen LPG & Cooking Gas": ["lpg", "gas", "cooking gas", "cylinder"],

  "Event Equipment & Linen Rentals": ["linen", "tent", "table", "chair", "tableware", "rental", "sound system", "generator"],
  "Subcontracted Delivery & Logistics": ["lalamove", "grab", "angkas", "toktok", "joyride", "courier", "delivery", "mover"],
  "Decor & Venue Direct Fees": ["decor", "flowers", "venue fee", "styling", "backdrop"],

  "Kitchen Utilities": ["meralco", "electric", "electricity", "water bill", "maynilad", "internet", "pldt", "globe", "converge"],
  "Waste & Sanitation": ["bleach", "detergent", "sanitation", "garbage", "waste", "cleaning", "chlorine", "alcohol", "disinfectant", "trash"],
  "Vehicle Fuel, Tolls & Maintenance": ["diesel", "gasoline", "fuel", "petron", "shell", "caltex", "toll", "easytrip", "car repair", "vehicle"],
  "Kitchen Repairs & Maintenance": ["repair", "maintenance", "aircon service", "plumbing", "electrician"],

  "Facility Rent": ["rent", "lease"],
  "Insurance & Licenses": ["insurance", "premium", "permit", "license", "mayor's permit", "bir", "dti", "sec"],
  "Software, POS & Tech": ["pos", "software", "subscription", "saas", "license fee", "domain", "hosting", "app"],
  "Bank & Payment Processing Fees": ["bank fee", "service charge", "transaction fee", "gcash fee", "processing fee"],
  "Marketing & Advertising": ["ads", "advertising", "boost post", "marketing", "facebook ads", "printing", "flyer"],
  "Office & General Admin": ["office supplies", "printing", "stationery", "admin", "misc", "miscellaneous"],

  "Refunds, Discounts & Adjustments": ["refund", "discount", "adjustment", "credit note", "chargeback"],
};

/** Categories whose name or keyword list matches `query` (case-insensitive
 * substring on either side — "lpg" finds "Kitchen LPG & Cooking Gas" via its
 * name, "lalamove" finds "Subcontracted Delivery & Logistics" via its
 * keyword list). */
export function matchExpenseCategories(query: string): ExpenseCategory[] {
  const q = query.trim().toLowerCase();
  if (!q) return EXPENSE_CATEGORIES;
  return EXPENSE_CATEGORIES.filter(
    (category) =>
      category.toLowerCase().includes(q) || CATEGORY_KEYWORDS[category].some((k) => k.includes(q) || q.includes(k)),
  );
}
