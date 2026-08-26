"use client";

import { useState, type FormEvent } from "react";
import Modal from "@/components/ui/Modal";
import ExpenseFormFields from "./ExpenseFormFields";
import { updateExpenseAction } from "@/app/dashboard/admin-expenses/actions";
import type { Expense, NewExpense } from "@/lib/admin-expenses/types";

export default function EditExpenseModal({
  expense,
  onClose,
  onSaved,
}: {
  expense: Expense;
  onClose: () => void;
  onSaved: (updated: Expense) => void;
}) {
  const [draft, setDraft] = useState<NewExpense>({
    date: expense.date,
    branch: expense.branch,
    category: expense.category,
    vendor: expense.vendor,
    amount: expense.amount,
    status: expense.status,
    notes: expense.notes,
  });
  const [saving, setSaving] = useState(false);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (draft.amount <= 0) return;
    setSaving(true);
    try {
      const updated = await updateExpenseAction(expense.id, draft);
      onSaved(updated);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal isOpen onClose={onClose} title="Edit Expense" size="md">
      <form onSubmit={handleSave} className="space-y-3">
        <ExpenseFormFields draft={draft} onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))} />
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-gold-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gold-600 disabled:opacity-40"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
