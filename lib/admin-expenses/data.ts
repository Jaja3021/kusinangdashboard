import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { logActivity } from "@/lib/activity-log/data";
import { formatPeso } from "@/lib/format";
import { BRANCHES } from "@/lib/mt/branches";
import type { Expense, ExpensePatch, ExpenseStatus, NewExpense } from "./types";

type Row = {
  id: string;
  expense_date: string;
  branch: string;
  category: string;
  vendor: string;
  amount: number;
  status: ExpenseStatus;
  notes: string;
  logged_by: string;
};

const COLUMNS = "id, expense_date, branch, category, vendor, amount, status, notes, logged_by";

function branchLabel(id: string): string {
  return BRANCHES.find((b) => b.id === id)?.name ?? (id || "—");
}

function rowToExpense(row: Row): Expense {
  return {
    id: row.id,
    date: row.expense_date,
    branch: row.branch,
    category: row.category,
    vendor: row.vendor,
    amount: row.amount,
    status: row.status,
    notes: row.notes,
    loggedBy: row.logged_by,
  };
}

export async function getExpenses(): Promise<Expense[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.from("admin_expenses").select(COLUMNS).order("expense_date", { ascending: false });
  if (error) throw new Error(`Failed to load admin expenses: ${error.message}`);
  return (data as Row[]).map(rowToExpense);
}

export async function createExpense(expense: NewExpense): Promise<Expense> {
  const supabase = createSupabaseServerClient();
  const user = await getCurrentUser();
  const { data, error } = await supabase
    .from("admin_expenses")
    .insert({
      expense_date: expense.date,
      branch: expense.branch,
      category: expense.category,
      vendor: expense.vendor,
      amount: expense.amount,
      status: expense.status,
      notes: expense.notes,
      logged_by: user?.name ?? "Unknown",
    })
    .select(COLUMNS)
    .single();
  if (error) throw new Error(`Failed to create expense: ${error.message}`);
  const created = rowToExpense(data as Row);
  await logActivity({
    module: "Admin Expenses",
    action: "CREATE",
    entity: "Expense",
    name: created.vendor || created.category || "Expense",
    details: `${formatPeso(created.amount)} · ${created.category || "Uncategorized"} · ${branchLabel(created.branch)}`,
  });
  return created;
}

export async function updateExpenseStatus(id: string, status: ExpenseStatus): Promise<Expense> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.from("admin_expenses").update({ status }).eq("id", id).select(COLUMNS).single();
  if (error) throw new Error(`Failed to update expense: ${error.message}`);
  const updated = rowToExpense(data as Row);
  await logActivity({
    module: "Admin Expenses",
    action: "UPDATE",
    entity: "Expense",
    name: updated.vendor || updated.category || "Expense",
    details: `Status → ${status}`,
  });
  return updated;
}

export async function updateExpense(id: string, patch: ExpensePatch): Promise<Expense> {
  const supabase = createSupabaseServerClient();
  const dbPatch: Record<string, unknown> = {};
  if (patch.date !== undefined) dbPatch.expense_date = patch.date;
  if (patch.branch !== undefined) dbPatch.branch = patch.branch;
  if (patch.category !== undefined) dbPatch.category = patch.category;
  if (patch.vendor !== undefined) dbPatch.vendor = patch.vendor;
  if (patch.amount !== undefined) dbPatch.amount = patch.amount;
  if (patch.status !== undefined) dbPatch.status = patch.status;
  if (patch.notes !== undefined) dbPatch.notes = patch.notes;

  const { data, error } = await supabase.from("admin_expenses").update(dbPatch).eq("id", id).select(COLUMNS).single();
  if (error) throw new Error(`Failed to update expense: ${error.message}`);
  const updated = rowToExpense(data as Row);
  await logActivity({
    module: "Admin Expenses",
    action: "UPDATE",
    entity: "Expense",
    name: updated.vendor || updated.category || "Expense",
    details: `Edited · ${formatPeso(updated.amount)} · ${updated.category || "Uncategorized"}`,
  });
  return updated;
}

export async function deleteExpense(id: string): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { data: existing } = await supabase.from("admin_expenses").select("vendor, category").eq("id", id).maybeSingle();
  const { error } = await supabase.from("admin_expenses").delete().eq("id", id);
  if (error) throw new Error(`Failed to delete expense: ${error.message}`);
  const row = existing as { vendor: string; category: string } | null;
  await logActivity({ module: "Admin Expenses", action: "DELETE", entity: "Expense", name: row?.vendor || row?.category || "" });
}
