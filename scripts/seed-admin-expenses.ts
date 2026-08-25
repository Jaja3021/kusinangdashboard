// One-off seed: populates public.admin_expenses with Jan 1 – today (Manila)
// operational-expense rows sized off the actual `operationalExpense` figures
// lib/owner-financials/mock.ts already computes per period (~49% of that
// period's sales), so Admin Expenses' totals roughly tally against Owner
// Financials/Sales/Branch Performance/Overview instead of being empty.
//
// Rent/Utilities are flat per branch per month (real fixed costs don't swing
// with sales); everything else is a weighted share of what's left in that
// branch-month's budget. Amounts/vendors are illustrative, not exact-tied.
//
// Usage: npx tsx scripts/seed-admin-expenses.ts [--force]
// (--force skips the "already has Jan–Aug rows" guard and inserts anyway)

import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import { financialPeriods } from "../lib/owner-financials/mock";
import { BRANCHES } from "../lib/mt/branches";
import { todayManila } from "../lib/mt/dates";

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

const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

// Weighted share of each branch-month's remaining budget (after Rent + Utilities).
const CATEGORY_WEIGHTS: { name: string; weight: number }[] = [
  { name: "Food & Ingredient Purchases", weight: 0.45 },
  { name: "Delivery & Logistics", weight: 0.18 },
  { name: "Fuel, LPG & Transport", weight: 0.12 },
  { name: "Packaging & Event Supplies", weight: 0.1 },
  { name: "Waste / Sanitation", weight: 0.05 },
  { name: "Bank Fees", weight: 0.04 },
  { name: "Refunds / Adjustments", weight: 0.04 },
  { name: "Other Operating Expense", weight: 0.02 },
];

// Revenue-split weight matches lib/owner-financials/mock.ts's BRANCH_SPLIT.
// Rent/Utilities are flat, illustrative fixed costs, sized so they never
// crowd out the weighted categories even in the leanest branch-month.
const BRANCH_PROFILE: Record<string, { weight: number; rent: number; utilities: number }> = {
  cavite: { weight: 0.42, rent: 42_000, utilities: 14_000 },
  laguna: { weight: 0.25, rent: 30_000, utilities: 11_000 },
  "metro-manila": { weight: 0.33, rent: 48_000, utilities: 15_000 },
};

const VENDORS: Record<string, string[]> = {
  "Food & Ingredient Purchases": ["Cavite Wet Market Suppliers", "Pamana Meat & Poultry", "Metro Grocery Wholesale"],
  "Delivery & Logistics": ["Lalamove Business", "Grab Express Fleet", "In-house Delivery Van"],
  "Fuel, LPG & Transport": ["Petron Fleet Card", "Shell Fleet Card", "LPG Refill Station"],
  "Packaging & Event Supplies": ["Event Supplies PH", "EcoPack Distributors", "Party Needs Wholesale"],
  "Waste / Sanitation": ["Barangay Waste Collection", "Sanitation Services Co."],
  "Bank Fees": ["BDO Merchant Fees", "BPI Business Account"],
  "Refunds / Adjustments": ["Customer Refund", "Order Adjustment"],
  "Other Operating Expense": ["Miscellaneous", "General Supplies"],
  Rent: ["Branch Landlord"],
  Utilities: ["Meralco", "Manila Water", "Maynilad"],
};

function pick<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}
function jitter(n: number): number {
  return Math.round((n * (0.85 + Math.random() * 0.3)) / 10) * 10;
}
function randDay(max: number): number {
  return 1 + Math.floor(Math.random() * max);
}
const pad = (n: number) => String(n).padStart(2, "0");

type ExpenseRow = {
  expense_date: string;
  branch: string;
  category: string;
  vendor: string;
  amount: number;
  status: "Pending" | "Approved" | "Paid";
  notes: string;
};

export function buildRows(): ExpenseRow[] {
  const today = todayManila();
  const [todayYear, todayMonth, todayDay] = today.split("-").map(Number);

  // Sum each actual period's operationalExpense into its calendar month.
  const monthlyOpEx = new Map<number, number>();
  for (const p of financialPeriods) {
    if (p.kind !== "actual") continue;
    const monthIndex = Number(p.startDate.slice(5, 7)) - 1;
    monthlyOpEx.set(monthIndex, (monthlyOpEx.get(monthIndex) ?? 0) + p.operationalExpense);
  }

  const rows: ExpenseRow[] = [];

  for (const [monthIndex, opEx] of [...monthlyOpEx.entries()].sort((a, b) => a[0] - b[0])) {
    const monthNum = monthIndex + 1;
    const isCurrentMonth = monthIndex === todayMonth - 1 && todayYear === 2026;
    const daysInMonth = isCurrentMonth ? todayDay : MONTH_DAYS[monthIndex];

    for (const branch of BRANCHES) {
      const profile = BRANCH_PROFILE[branch.id];
      if (!profile) continue;

      const budget = Math.round(opEx * profile.weight * (0.92 + Math.random() * 0.16));
      const fixed = profile.rent + profile.utilities;
      const remaining = Math.max(5_000, budget - fixed);

      const entries: { category: string; amount: number }[] = [
        { category: "Rent", amount: profile.rent },
        { category: "Utilities", amount: profile.utilities },
        ...CATEGORY_WEIGHTS.map((cw) => ({ category: cw.name, amount: Math.round(remaining * cw.weight) })),
      ];

      for (const entry of entries) {
        if (entry.amount <= 0) continue;
        const day = randDay(daysInMonth);
        let status: ExpenseRow["status"] = "Paid";
        if (isCurrentMonth) {
          const roll = Math.random();
          status = roll < 0.55 ? "Paid" : roll < 0.8 ? "Approved" : "Pending";
        }
        rows.push({
          expense_date: `2026-${pad(monthNum)}-${pad(day)}`,
          branch: branch.id,
          category: entry.category,
          vendor: pick(VENDORS[entry.category] ?? [""]),
          amount: jitter(entry.amount),
          status,
          notes: "",
        });
      }
    }
  }

  return rows;
}

async function main() {
  const env = loadEnvLocal();
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  if (!FORCE) {
    const { count, error: checkError } = await supabase
      .from("admin_expenses")
      .select("id", { count: "exact", head: true })
      .gte("expense_date", "2026-01-01")
      .lte("expense_date", "2026-08-31");
    if (checkError) throw new Error(`Failed to check existing rows: ${checkError.message}`);
    if ((count ?? 0) > 0) {
      console.error(`admin_expenses already has ${count} row(s) dated Jan–Aug 2026. Re-run with --force to insert anyway.`);
      process.exit(1);
    }
  }

  const rows = buildRows();
  console.log(`Inserting ${rows.length} expense rows across Jan–Aug 2026...`);
  const { error: insertError } = await supabase.from("admin_expenses").insert(rows);
  if (insertError) throw new Error(`Failed to insert expenses: ${insertError.message}`);
  console.log(`Inserted ${rows.length} rows.`);
}

// Guarded so importing buildRows() elsewhere (e.g. for a dry-run check)
// never triggers a live insert as a side effect of module load.
if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/")}`) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
