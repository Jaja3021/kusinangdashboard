"use server";

import { revalidatePath } from "next/cache";
import { createExpense, deleteExpense, updateExpenseStatus } from "@/lib/admin-expenses/data";
import type { Expense, ExpenseStatus, NewExpense } from "@/lib/admin-expenses/types";

// RLS ("Admin manage admin expenses", is_admin()) is the real authorization
// boundary — a non-admin's write simply fails.

export async function createExpenseAction(expense: NewExpense): Promise<Expense> {
  const created = await createExpense(expense);
  revalidatePath("/dashboard/admin-expenses");
  return created;
}

export async function updateExpenseStatusAction(id: string, status: ExpenseStatus): Promise<Expense> {
  const updated = await updateExpenseStatus(id, status);
  revalidatePath("/dashboard/admin-expenses");
  return updated;
}

export async function deleteExpenseAction(id: string): Promise<void> {
  await deleteExpense(id);
  revalidatePath("/dashboard/admin-expenses");
}
