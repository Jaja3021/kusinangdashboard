// One-off: remaps public.admin_expenses.category from either of the two
// earlier taxonomy revisions onto the final one (lib/admin-expenses/categories.ts
// OLD_TO_NEW_CATEGORY). category is free text (no DB check constraint), so
// this is a plain data migration, not a schema change.
//
// Usage: node scripts/migrate-expense-categories.mjs
import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

function loadEnvLocal() {
  const text = readFileSync(new URL("../.env.local", import.meta.url), "utf-8");
  const env = {};
  for (const line of text.split("\n")) {
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (match) env[match[1]] = match[2];
  }
  return env;
}

// Kept in sync with lib/admin-expenses/categories.ts's OLD_TO_NEW_CATEGORY.
const OLD_TO_NEW_CATEGORY = {
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

const env = loadEnvLocal();
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  let totalUpdated = 0;
  for (const [oldCategory, newCategory] of Object.entries(OLD_TO_NEW_CATEGORY)) {
    const { data, error } = await supabase
      .from("admin_expenses")
      .update({ category: newCategory })
      .eq("category", oldCategory)
      .select("id");
    if (error) throw new Error(`Failed to migrate "${oldCategory}": ${error.message}`);
    if (data.length > 0) {
      console.log(`${oldCategory} -> ${newCategory}: ${data.length} row(s)`);
      totalUpdated += data.length;
    }
  }
  console.log(`Done. ${totalUpdated} row(s) updated.`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
