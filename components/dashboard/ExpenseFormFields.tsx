"use client";

import { BRANCHES } from "@/lib/mt/branches";
import CategoryCombobox from "./CategoryCombobox";
import { EXPENSE_STATUSES, type ExpenseStatus, type NewExpense } from "@/lib/admin-expenses/types";

const inputClass =
  "w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-brand-900 outline-none focus:border-gold-400";
const labelClass = "mb-1 block text-xs font-medium text-gray-500";

/** Category combobox, branch/date, amount/status, and notes — shared by the
 * Add Expense and Edit Expense forms so the two never drift. */
export default function ExpenseFormFields({
  draft,
  onChange,
}: {
  draft: NewExpense;
  onChange: (patch: Partial<NewExpense>) => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <span className={labelClass}>Category</span>
        <CategoryCombobox value={draft.category} onChange={(category) => onChange({ category })} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className={labelClass}>Branch</span>
          <select value={draft.branch} onChange={(e) => onChange({ branch: e.target.value })} className={inputClass}>
            <option value="">Select branch…</option>
            {BRANCHES.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={labelClass}>Entry Date</span>
          <input type="date" required value={draft.date} onChange={(e) => onChange({ date: e.target.value })} className={inputClass} />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className={labelClass}>Amount (₱)</span>
          <input
            type="number"
            min={0}
            step="any"
            required
            value={draft.amount || ""}
            onChange={(e) => onChange({ amount: Number(e.target.value) || 0 })}
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className={labelClass}>Payment Status</span>
          <select
            value={draft.status}
            onChange={(e) => onChange({ status: e.target.value as ExpenseStatus })}
            className={inputClass}
          >
            {EXPENSE_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
      </div>

      <label className="block">
        <span className={labelClass}>Notes</span>
        <textarea
          value={draft.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
          rows={2}
          placeholder="Optional"
          className={inputClass}
        />
      </label>
    </div>
  );
}
