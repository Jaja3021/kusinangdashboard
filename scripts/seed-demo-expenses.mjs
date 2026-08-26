// One-off: wipes public.admin_expenses and reseeds it with exactly 5 dummy
// entries for demoing the "All Entries" table.
//
// Requires supabase/admin_expenses_v2.sql (the logged_by column) to already
// be applied — run that in the Supabase SQL editor first.
//
// Usage: node scripts/seed-demo-expenses.mjs
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

const env = loadEnvLocal();
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DUMMY_EXPENSES = [
  {
    expense_date: "2026-07-30",
    branch: "cavite",
    category: "Food & Raw Ingredients",
    vendor: "Cavite Wet Market",
    amount: 62066.75,
    status: "Paid",
    notes: "",
    logged_by: "Ralph - MultiplyTalents",
  },
  {
    expense_date: "2026-07-30",
    branch: "cavite",
    category: "Food & Raw Ingredients",
    vendor: "S&R Membership Shopping",
    amount: 17703.38,
    status: "Paid",
    notes: "",
    logged_by: "Ralph - MultiplyTalents",
  },
  {
    expense_date: "2026-07-30",
    branch: "cavite",
    category: "Food & Raw Ingredients",
    vendor: "Local Poultry Supplier",
    amount: 4708.45,
    status: "Pending",
    notes: "",
    logged_by: "Ralph - MultiplyTalents",
  },
  {
    expense_date: "2026-08-02",
    branch: "laguna",
    category: "Subcontracted Delivery & Logistics",
    vendor: "Lalamove",
    amount: 1250,
    status: "Approved",
    notes: "Same-day ingredient run",
    logged_by: "Arnold - MultiplyTalents",
  },
  {
    expense_date: "2026-08-03",
    branch: "metro-manila",
    category: "Kitchen LPG & Cooking Gas",
    vendor: "Petron Gasul",
    amount: 3400,
    status: "Pending",
    notes: "2 tanks, 50kg each",
    logged_by: "Arnold - MultiplyTalents",
  },
];

async function main() {
  const { error: deleteError } = await supabase.from("admin_expenses").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (deleteError) throw new Error(`Failed to clear admin_expenses: ${deleteError.message}`);

  const { data, error: insertError } = await supabase.from("admin_expenses").insert(DUMMY_EXPENSES).select("id");
  if (insertError) throw new Error(`Failed to insert dummy expenses: ${insertError.message}`);

  console.log(`Cleared existing rows and inserted ${data.length} dummy expense(s).`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
