"use client";

import { useMemo, useState, type FormEvent } from "react";
import { AlertCircle, FileSpreadsheet, Hourglass, Info, Plus, Trash2, Wallet } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import Badge, { BadgeTone } from "@/components/ui/Badge";
import DataTable, { Column } from "@/components/ui/DataTable";
import Modal from "@/components/ui/Modal";
import ScrollX from "@/components/ui/ScrollX";
import { useBranch } from "@/components/providers/BranchProvider";
import { ALL_BRANCHES, BRANCHES } from "@/lib/mt/branches";
import { formatPeso } from "@/lib/format";
import { createExpenseAction, deleteExpenseAction, updateExpenseStatusAction } from "@/app/dashboard/admin-expenses/actions";
import { EXPENSE_STATUSES, type Expense, type ExpenseStatus, type NewExpense } from "@/lib/admin-expenses/types";

const STATUS_TONE: Record<ExpenseStatus, BadgeTone> = { Pending: "amber", Approved: "blue", Paid: "green" };

const EMPTY_DRAFT: NewExpense = {
  date: new Date().toISOString().slice(0, 10),
  branch: "",
  category: "",
  vendor: "",
  amount: 0,
  status: "Pending",
  notes: "",
};

function branchLabel(id: string): string {
  return BRANCHES.find((b) => b.id === id)?.name ?? "Unassigned";
}

function BreakdownCard({ title, rows }: { title: string; rows: { label: string; amount: number }[] }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      <h2 className="mb-3 font-display text-base font-semibold text-brand-900">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-gray-400">No entries yet.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.label} className="flex items-center justify-between text-sm">
              <span className="text-gray-600">{r.label}</span>
              <span className="font-medium text-brand-900">{formatPeso(r.amount)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function AdminExpensesClient({ expenses: initialExpenses }: { expenses: Expense[] }) {
  const { selectedBranch } = useBranch();
  const [expenses, setExpenses] = useState(initialExpenses);
  const [addModal, setAddModal] = useState(false);
  const [draft, setDraft] = useState<NewExpense>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);

  const branchMatch = selectedBranch === ALL_BRANCHES ? null : BRANCHES.find((b) => b.name === selectedBranch);
  const scoped = branchMatch ? expenses.filter((e) => e.branch === branchMatch.id) : expenses;

  const stats = useMemo(() => {
    const total = scoped.reduce((sum, e) => sum + e.amount, 0);
    const missing = scoped.filter((e) => !e.branch || !e.category).length;
    const pendingPayment = scoped.filter((e) => e.status !== "Paid").reduce((sum, e) => sum + e.amount, 0);
    return { total, count: scoped.length, missing, pendingPayment };
  }, [scoped]);

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of scoped) {
      const key = e.category || "Uncategorized";
      map.set(key, (map.get(key) ?? 0) + e.amount);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).map(([label, amount]) => ({ label, amount }));
  }, [scoped]);

  const byBranch = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of scoped) {
      const key = branchLabel(e.branch);
      map.set(key, (map.get(key) ?? 0) + e.amount);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).map(([label, amount]) => ({ label, amount }));
  }, [scoped]);

  const paymentStatus = useMemo(() => {
    const sums: Record<ExpenseStatus, number> = { Pending: 0, Approved: 0, Paid: 0 };
    for (const e of scoped) sums[e.status] += e.amount;
    return sums;
  }, [scoped]);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (draft.amount <= 0) return;
    setSaving(true);
    try {
      const created = await createExpenseAction(draft);
      setExpenses((cur) => [created, ...cur]);
      setAddModal(false);
      setDraft(EMPTY_DRAFT);
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(id: string, status: ExpenseStatus) {
    const prior = expenses;
    setExpenses((cur) => cur.map((e) => (e.id === id ? { ...e, status } : e)));
    try {
      await updateExpenseStatusAction(id, status);
    } catch {
      setExpenses(prior);
    }
  }

  async function handleDelete(id: string) {
    const prior = expenses;
    setExpenses((cur) => cur.filter((e) => e.id !== id));
    try {
      await deleteExpenseAction(id);
    } catch {
      setExpenses(prior);
    }
  }

  const columns: Column<Expense>[] = [
    { key: "date", header: "Date" },
    { key: "branch", header: "Branch", render: (r) => branchLabel(r.branch) },
    { key: "category", header: "Category", render: (r) => r.category || "—" },
    { key: "vendor", header: "Vendor", render: (r) => <span className="font-medium text-brand-900">{r.vendor || "—"}</span> },
    { key: "amount", header: "Amount", render: (r) => formatPeso(r.amount) },
    {
      key: "status",
      header: "Status",
      render: (r) => (
        <select
          value={r.status}
          onChange={(e) => handleStatusChange(r.id, e.target.value as ExpenseStatus)}
          className={`rounded-full border-0 px-2.5 py-1 text-xs font-medium outline-none ring-1 ring-inset ${
            STATUS_TONE[r.status] === "green" ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20" :
            STATUS_TONE[r.status] === "blue" ? "bg-sky-50 text-sky-700 ring-sky-600/20" :
            "bg-amber-50 text-amber-700 ring-amber-600/20"
          }`}
        >
          {EXPENSE_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (r) => (
        <button onClick={() => handleDelete(r.id)} className="text-gray-400 hover:text-red-500" aria-label="Delete expense">
          <Trash2 size={14} />
        </button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Admin Expenses" subtitle="Operational expense tracking, by branch and category.">
        <button onClick={() => setAddModal(true)} className="flex items-center gap-1.5 rounded-lg bg-gold-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gold-600">
          <Plus size={14} /> Add Expense
        </button>
      </PageHeader>

      <div className="mb-6 flex items-start gap-2 rounded-lg border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-800">
        <Info size={16} className="mt-0.5 flex-shrink-0" />
        <span>Operational expenses only — salary, commissions, bonuses, and owner distributions are never shown here.</span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Operational Expense" value={stats.total} format="money" tone="red" valueColor="text-red-500" icon={<FileSpreadsheet size={18} className="text-red-500" />} />
        <StatCard label="Total Entries" value={stats.count} icon={<FileSpreadsheet size={18} className="text-gray-500" />} />
        <StatCard label="Missing Branch/Category" value={stats.missing} tone="yellow" icon={<AlertCircle size={18} className="text-amber-500" />} />
        <StatCard label="Pending Payment" value={stats.pendingPayment} format="money" tone="blue" valueColor="text-blue-600" icon={<Hourglass size={18} className="text-blue-500" />} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <BreakdownCard title="Expense by Category" rows={byCategory} />
        <BreakdownCard title="Expense by Branch" rows={byBranch} />
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="mb-3 font-display text-base font-semibold text-brand-900">Payment Status</h2>
          <ul className="space-y-2">
            {EXPENSE_STATUSES.map((s) => (
              <li key={s} className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{s}</span>
                <span className="font-medium text-brand-900">{formatPeso(paymentStatus[s])}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-gray-200 bg-white">
        <div className="px-5 py-3">
          <h2 className="font-display text-base font-semibold text-brand-900">All Entries</h2>
          <p className="text-xs text-gray-400">{scoped.length} entries</p>
        </div>
        {scoped.length === 0 ? (
          <p className="px-5 pb-5 text-sm text-gray-400">No expenses logged yet.</p>
        ) : (
          <ScrollX>
            <DataTable columns={columns} rows={scoped} />
          </ScrollX>
        )}
      </div>

      <Modal isOpen={addModal} onClose={() => setAddModal(false)} title="Add Expense" size="md">
        <form onSubmit={handleAdd} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">Date</span>
              <input type="date" required value={draft.date} onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))} className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-brand-900 outline-none focus:border-gold-400" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">Branch</span>
              <select value={draft.branch} onChange={(e) => setDraft((d) => ({ ...d, branch: e.target.value }))} className="w-full rounded-lg border border-gray-200 bg-gray-50 px-2 py-2 text-sm text-brand-900 outline-none focus:border-gold-400">
                <option value="">—</option>
                {BRANCHES.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">Category</span>
              <input value={draft.category} onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))} placeholder="e.g. Utilities" className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-brand-900 outline-none focus:border-gold-400" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">Vendor</span>
              <input value={draft.vendor} onChange={(e) => setDraft((d) => ({ ...d, vendor: e.target.value }))} className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-brand-900 outline-none focus:border-gold-400" />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">Amount (₱)</span>
              <input type="number" min={0} step="any" required value={draft.amount || ""} onChange={(e) => setDraft((d) => ({ ...d, amount: Number(e.target.value) || 0 }))} className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-brand-900 outline-none focus:border-gold-400" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">Status</span>
              <select value={draft.status} onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value as ExpenseStatus }))} className="w-full rounded-lg border border-gray-200 bg-gray-50 px-2 py-2 text-sm text-brand-900 outline-none focus:border-gold-400">
                {EXPENSE_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-500">Notes</span>
            <textarea value={draft.notes} onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))} rows={2} className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-brand-900 outline-none focus:border-gold-400" />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setAddModal(false)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving} className="rounded-lg bg-gold-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gold-600 disabled:opacity-40">{saving ? "Adding…" : "Add Expense"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
