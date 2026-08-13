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
};

export type NewExpense = Omit<Expense, "id">;
