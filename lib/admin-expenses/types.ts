export const EXPENSE_STATUSES = ["Pending", "Approved", "Paid"] as const;
export type ExpenseStatus = (typeof EXPENSE_STATUSES)[number];

export type Expense = {
  id: string;
  date: string;
  branch: string;
  category: string;
  vendor: string;
  amount: number;
  status: ExpenseStatus;
  notes: string;
  /** Who logged the entry — set server-side from the signed-in account, not
   * user-editable. */
  loggedBy: string;
};

export type NewExpense = Omit<Expense, "id" | "loggedBy">;

/** Fields editable after creation (via the Edit action) — everything except
 * id and loggedBy, which never change once set. */
export type ExpensePatch = Partial<Omit<Expense, "id" | "loggedBy">>;
