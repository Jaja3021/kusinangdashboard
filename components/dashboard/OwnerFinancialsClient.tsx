"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Landmark, Info, Pencil, Plus, Trash2, TrendingDown, Wallet, PiggyBank } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import Badge, { type BadgeTone } from "@/components/ui/Badge";
import DataTable, { type Column } from "@/components/ui/DataTable";
import Modal from "@/components/ui/Modal";
import ScrollX from "@/components/ui/ScrollX";
import { formatPeso } from "@/lib/format";
import { useAuth } from "@/components/providers/AuthProvider";
import OwnerTrendChart, { type OwnerTrendPoint } from "@/components/charts/OwnerTrendChart";
import ExpenseBreakdownChart, { type ExpenseBreakdownPoint } from "@/components/charts/ExpenseBreakdownChart";
import { OWNER_FINANCIALS_TODAY } from "@/lib/owner-financials/mock";
import {
  restrictedCompensation,
  totalCapturedExpense,
  contribution,
  periodLabel,
  type FinancialPeriod,
  type CompensationEntry,
  type CompensationKind,
  type OwnerDistribution,
  type ChangeEntry,
  type ChangeAction,
} from "@/lib/owner-financials/types";

const ACTION_TONE: Record<ChangeAction, BadgeTone> = { CREATE: "green", UPDATE: "blue", DELETE: "red" };
const COMP_TONE: Record<CompensationKind, BadgeTone> = { Salary: "blue", Commission: "gold", Bonus: "green" };
const COMP_KINDS: CompensationKind[] = ["Salary", "Commission", "Bonus"];

const SHORT_DATE = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
const WHEN_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "numeric",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  second: "2-digit",
});

function shortLabel(dateKey: string): string {
  const d = new Date(`${dateKey}T00:00:00`);
  return Number.isNaN(d.getTime()) ? dateKey : SHORT_DATE.format(d);
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : WHEN_FORMAT.format(d);
}

/** Percentage change, tolerant of a zero or negative base (a swing to/from a loss shouldn't divide-by-zero). */
function pctChange(curr: number, prev: number): number | null {
  if (prev === 0) return curr === 0 ? 0 : null;
  return Math.round(((curr - prev) / Math.abs(prev)) * 1000) / 10;
}

type PeriodFormValues = {
  startDate: string;
  endDate: string;
  sales: number;
  operationalExpense: number;
  salary: number;
  commissions: number;
  bonuses: number;
};

const EMPTY_PERIOD: PeriodFormValues = {
  startDate: "",
  endDate: "",
  sales: 0,
  operationalExpense: 0,
  salary: 0,
  commissions: 0,
  bonuses: 0,
};

type CompFormValues = { periodId: string; person: string; role: string; kind: CompensationKind; amount: number; note: string };
const emptyCompDraft = (firstPeriodId: string): CompFormValues => ({
  periodId: firstPeriodId,
  person: "",
  role: "",
  kind: "Salary",
  amount: 0,
  note: "",
});

type DistFormValues = { periodId: string; date: string; recipient: string; method: string; amount: number; note: string };
const emptyDistDraft = (firstPeriodId: string): DistFormValues => ({
  periodId: firstPeriodId,
  date: new Date().toISOString().slice(0, 10),
  recipient: "",
  method: "Bank Transfer",
  amount: 0,
  note: "",
});

export default function OwnerFinancialsClient({
  periods: initialPeriods,
  compensationEntries: initialComp,
  ownerDistributions: initialDist,
  changeHistory: initialHistory,
}: {
  periods: FinancialPeriod[];
  compensationEntries: CompensationEntry[];
  ownerDistributions: OwnerDistribution[];
  changeHistory: ChangeEntry[];
}) {
  const { user } = useAuth();
  const who = user?.name || "Owner";

  const [periods, setPeriods] = useState(initialPeriods);
  const [compEntries, setCompEntries] = useState(initialComp);
  const [distributions, setDistributions] = useState(initialDist);
  const [history, setHistory] = useState(initialHistory);

  const [addPeriodModal, setAddPeriodModal] = useState(false);
  const [editPeriod, setEditPeriod] = useState<FinancialPeriod | null>(null);
  const [periodDraft, setPeriodDraft] = useState<PeriodFormValues>(EMPTY_PERIOD);

  const [addCompModal, setAddCompModal] = useState(false);
  const [compDraft, setCompDraft] = useState<CompFormValues>(emptyCompDraft(periods[0]?.id ?? ""));

  const [addDistModal, setAddDistModal] = useState(false);
  const [distDraft, setDistDraft] = useState<DistFormValues>(emptyDistDraft(periods[0]?.id ?? ""));

  const periodMap = useMemo(() => new Map(periods.map((p) => [p.id, p])), [periods]);
  const actual = useMemo(() => periods.filter((p) => p.kind === "actual"), [periods]);

  function pushHistory(action: ChangeAction, label: string, details: string) {
    setHistory((cur) => [
      { id: `OF-H-${Date.now()}`, at: new Date().toISOString(), who, action, periodLabel: label, details },
      ...cur,
    ]);
  }

  // ---------- KPI totals (actual periods only) + period-over-period trend ----------
  const totals = useMemo(() => {
    const sales = actual.reduce((s, p) => s + p.sales, 0);
    const expense = actual.reduce((s, p) => s + totalCapturedExpense(p), 0);
    const compensation = actual.reduce((s, p) => s + restrictedCompensation(p), 0);
    return { sales, expense, compensation, contribution: sales - expense };
  }, [actual]);

  const trend = useMemo(() => {
    if (actual.length < 2) return null;
    const latest = actual[actual.length - 1];
    const prior = actual[actual.length - 2];
    return {
      sales: pctChange(latest.sales, prior.sales),
      expense: pctChange(totalCapturedExpense(latest), totalCapturedExpense(prior)),
      compensation: pctChange(restrictedCompensation(latest), restrictedCompensation(prior)),
      contribution: pctChange(contribution(latest), contribution(prior)),
    };
  }, [actual]);

  const trendData: OwnerTrendPoint[] = useMemo(
    () =>
      periods.map((p) => ({
        period: shortLabel(p.startDate),
        sales: p.sales,
        totalExpense: totalCapturedExpense(p),
        contribution: contribution(p),
      })),
    [periods],
  );

  const expenseData: ExpenseBreakdownPoint[] = useMemo(
    () =>
      periods.map((p) => ({
        period: shortLabel(p.startDate),
        operational: p.operationalExpense,
        salary: p.salary,
        commissions: p.commissions,
        bonuses: p.bonuses,
      })),
    [periods],
  );

  // ---------- Period CRUD ----------
  function openAddPeriod() {
    setPeriodDraft(EMPTY_PERIOD);
    setAddPeriodModal(true);
  }

  function openEditPeriod(p: FinancialPeriod) {
    setEditPeriod(p);
    setPeriodDraft({
      startDate: p.startDate,
      endDate: p.endDate,
      sales: p.sales,
      operationalExpense: p.operationalExpense,
      salary: p.salary,
      commissions: p.commissions,
      bonuses: p.bonuses,
    });
  }

  function handleAddPeriod(e: FormEvent) {
    e.preventDefault();
    if (!periodDraft.startDate || !periodDraft.endDate) return;
    const kind = periodDraft.endDate <= OWNER_FINANCIALS_TODAY ? "actual" : "projected";
    const created: FinancialPeriod = { id: `OF-P-${Date.now()}`, kind, ...periodDraft };
    setPeriods((cur) => [...cur, created].sort((a, b) => a.startDate.localeCompare(b.startDate)));
    pushHistory(
      "CREATE",
      periodLabel(created),
      `Sales ${formatPeso(created.sales)} · Opex ${formatPeso(created.operationalExpense)} · Salary ${formatPeso(created.salary)} · Commissions ${formatPeso(created.commissions)} · Bonuses ${formatPeso(created.bonuses)}`,
    );
    setAddPeriodModal(false);
  }

  function handleEditPeriod(e: FormEvent) {
    e.preventDefault();
    if (!editPeriod) return;
    const updated: FinancialPeriod = { ...editPeriod, ...periodDraft };
    setPeriods((cur) => cur.map((p) => (p.id === updated.id ? updated : p)));
    pushHistory(
      "UPDATE",
      periodLabel(updated),
      `Sales ${formatPeso(updated.sales)} · Opex ${formatPeso(updated.operationalExpense)} · Salary ${formatPeso(updated.salary)} · Commissions ${formatPeso(updated.commissions)} · Bonuses ${formatPeso(updated.bonuses)}`,
    );
    setEditPeriod(null);
  }

  function handleDeletePeriod(id: string) {
    const target = periodMap.get(id);
    if (!target) return;
    setPeriods((cur) => cur.filter((p) => p.id !== id));
    setCompEntries((cur) => cur.filter((c) => c.periodId !== id));
    setDistributions((cur) => cur.filter((d) => d.periodId !== id));
    pushHistory(
      "DELETE",
      periodLabel(target),
      `Sales ${formatPeso(target.sales)} · Opex ${formatPeso(target.operationalExpense)} · Salary ${formatPeso(target.salary)} · Commissions ${formatPeso(target.commissions)} · Bonuses ${formatPeso(target.bonuses)}`,
    );
  }

  // ---------- Compensation CRUD ----------
  function handleAddComp(e: FormEvent) {
    e.preventDefault();
    if (!compDraft.periodId || !compDraft.person || compDraft.amount <= 0) return;
    const created: CompensationEntry = { id: `OF-C-${Date.now()}`, ...compDraft };
    setCompEntries((cur) => [created, ...cur]);
    const p = periodMap.get(created.periodId);
    pushHistory("CREATE", p ? periodLabel(p) : "—", `${created.kind} · ${created.person} · ${formatPeso(created.amount)}`);
    setAddCompModal(false);
  }

  function handleDeleteComp(id: string) {
    const target = compEntries.find((c) => c.id === id);
    if (!target) return;
    setCompEntries((cur) => cur.filter((c) => c.id !== id));
    const p = periodMap.get(target.periodId);
    pushHistory("DELETE", p ? periodLabel(p) : "—", `${target.kind} · ${target.person} · ${formatPeso(target.amount)}`);
  }

  // ---------- Owner distribution CRUD ----------
  function handleAddDist(e: FormEvent) {
    e.preventDefault();
    if (!distDraft.periodId || !distDraft.recipient || distDraft.amount <= 0) return;
    const created: OwnerDistribution = { id: `OF-D-${Date.now()}`, ...distDraft };
    setDistributions((cur) => [created, ...cur]);
    const p = periodMap.get(created.periodId);
    pushHistory("CREATE", p ? periodLabel(p) : "—", `Distribution · ${created.recipient} · ${formatPeso(created.amount)}`);
    setAddDistModal(false);
  }

  function handleDeleteDist(id: string) {
    const target = distributions.find((d) => d.id === id);
    if (!target) return;
    setDistributions((cur) => cur.filter((d) => d.id !== id));
    const p = periodMap.get(target.periodId);
    pushHistory("DELETE", p ? periodLabel(p) : "—", `Distribution · ${target.recipient} · ${formatPeso(target.amount)}`);
  }

  // ---------- Columns ----------
  const periodColumns: Column<FinancialPeriod>[] = [
    {
      key: "period",
      header: "Period",
      render: (r) => (
        <div className="flex items-center gap-2">
          <span className={`font-medium ${r.kind === "projected" ? "text-gray-400" : "text-brand-900"}`}>{periodLabel(r)}</span>
          {r.kind === "projected" && <Badge label="Projected" tone="amber" />}
        </div>
      ),
    },
    { key: "sales", header: "Sales", render: (r) => <span className={r.kind === "projected" ? "text-gray-400" : ""}>{formatPeso(r.sales)}</span> },
    {
      key: "operationalExpense",
      header: "Operational Expense",
      render: (r) => <span className={r.kind === "projected" ? "text-gray-400" : ""}>{formatPeso(r.operationalExpense)}</span>,
    },
    {
      key: "restrictedCompensation",
      header: "Restricted Compensation",
      render: (r) => <span className={r.kind === "projected" ? "text-gray-400" : ""}>{formatPeso(restrictedCompensation(r))}</span>,
    },
    {
      key: "totalCapturedExpense",
      header: "Total Captured Expense",
      render: (r) => <span className={`font-medium ${r.kind === "projected" ? "text-gray-400" : "text-brand-900"}`}>{formatPeso(totalCapturedExpense(r))}</span>,
    },
    {
      key: "contribution",
      header: "Contribution",
      render: (r) => {
        const c = contribution(r);
        const tone = r.kind === "projected" ? "text-gray-400" : c >= 0 ? "text-emerald-600" : "text-red-500";
        return <span className={`font-medium ${tone}`}>{formatPeso(c)}</span>;
      },
    },
    {
      key: "actions",
      header: "",
      render: (r) => (
        <div className="flex items-center gap-2">
          <button onClick={() => openEditPeriod(r)} className="text-gray-400 hover:text-brand-700" aria-label="Edit period">
            <Pencil size={14} />
          </button>
          <button onClick={() => handleDeletePeriod(r.id)} className="text-gray-400 hover:text-red-500" aria-label="Delete period">
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  const compColumns: Column<CompensationEntry>[] = [
    { key: "period", header: "Period", render: (r) => (periodMap.has(r.periodId) ? periodLabel(periodMap.get(r.periodId)!) : "—") },
    { key: "person", header: "Person", render: (r) => <span className="font-medium text-brand-900">{r.person}</span> },
    { key: "role", header: "Role", render: (r) => r.role || "—" },
    { key: "kind", header: "Kind", render: (r) => <Badge label={r.kind} tone={COMP_TONE[r.kind]} /> },
    { key: "amount", header: "Amount", render: (r) => formatPeso(r.amount) },
    { key: "note", header: "Note", render: (r) => r.note || "—" },
    {
      key: "actions",
      header: "",
      render: (r) => (
        <button onClick={() => handleDeleteComp(r.id)} className="text-gray-400 hover:text-red-500" aria-label="Delete entry">
          <Trash2 size={14} />
        </button>
      ),
    },
  ];

  const distColumns: Column<OwnerDistribution>[] = [
    { key: "date", header: "Date" },
    { key: "period", header: "Period", render: (r) => (periodMap.has(r.periodId) ? periodLabel(periodMap.get(r.periodId)!) : "—") },
    { key: "recipient", header: "Recipient", render: (r) => <span className="font-medium text-brand-900">{r.recipient}</span> },
    { key: "method", header: "Method" },
    { key: "amount", header: "Amount", render: (r) => formatPeso(r.amount) },
    { key: "note", header: "Note", render: (r) => r.note || "—" },
    {
      key: "actions",
      header: "",
      render: (r) => (
        <button onClick={() => handleDeleteDist(r.id)} className="text-gray-400 hover:text-red-500" aria-label="Delete distribution">
          <Trash2 size={14} />
        </button>
      ),
    },
  ];

  const historyColumns: Column<ChangeEntry>[] = [
    { key: "when", header: "When", render: (r) => formatWhen(r.at) },
    { key: "who", header: "Who", render: (r) => <span className="font-medium text-brand-900">{r.who}</span> },
    { key: "action", header: "Action", render: (r) => <Badge label={r.action} tone={ACTION_TONE[r.action]} /> },
    { key: "period", header: "Period", render: (r) => r.periodLabel },
    { key: "details", header: "Details", render: (r) => r.details || "—" },
  ];

  const compTotal = compEntries.reduce((s, c) => s + c.amount, 0);
  const distTotal = distributions.reduce((s, d) => s + d.amount, 0);

  return (
    <div>
      <PageHeader title="Owner Financial Dashboard" subtitle="Sales, expenses, and compensation by period">
        <button
          onClick={openAddPeriod}
          className="flex items-center gap-1.5 rounded-lg bg-gold-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gold-600"
        >
          <Plus size={14} /> Add Period
        </button>
      </PageHeader>

      <div className="mb-6 flex items-start gap-2 rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <Landmark size={16} className="mt-0.5 flex-shrink-0" />
        <span>Includes sales, salary, commissions, bonuses, and contribution. Every change here is permanently logged.</span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Sales Captured"
          value={totals.sales}
          format="money"
          tone="gold"
          valueColor="text-gold-600"
          icon={<Wallet size={18} className="text-gold-600" />}
          trend={trend?.sales ?? undefined}
          trendLabel="vs prior period"
        />
        <StatCard
          label="Total Captured Expense"
          value={totals.expense}
          format="money"
          tone="red"
          valueColor="text-red-500"
          icon={<TrendingDown size={18} className="text-red-500" />}
          trend={trend?.expense ?? undefined}
          trendLabel="vs prior period"
        />
        <StatCard
          label="Restricted Compensation"
          value={totals.compensation}
          format="money"
          tone="purple"
          valueColor="text-purple-600"
          icon={<Landmark size={18} className="text-purple-600" />}
          trend={trend?.compensation ?? undefined}
          trendLabel="vs prior period"
        />
        <StatCard
          label="Contribution"
          value={totals.contribution}
          format="money"
          tone="green"
          valueColor="text-emerald-600"
          icon={<PiggyBank size={18} className="text-emerald-600" />}
          trend={trend?.contribution ?? undefined}
          trendLabel="vs prior period"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="font-display text-lg font-semibold text-brand-900">Financial Trend</h2>
          <p className="mb-2 text-xs text-slate-400">Sales, expense, and contribution by period</p>
          <OwnerTrendChart data={trendData} />
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="font-display text-lg font-semibold text-brand-900">Expense Breakdown</h2>
          <p className="mb-2 text-xs text-slate-400">Where the captured expense goes, by period</p>
          <ExpenseBreakdownChart data={expenseData} />
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-gray-200 bg-white">
        <div className="px-5 py-3">
          <h2 className="font-display text-base font-semibold text-brand-900">Period Summary</h2>
          <p className="text-xs text-gray-400">{periods.length} periods</p>
        </div>
        <ScrollX>
          <DataTable columns={periodColumns} rows={periods} />
        </ScrollX>
      </div>

      <div className="mt-6 rounded-lg border border-gray-200 bg-white">
        <div className="flex items-start justify-between gap-3 px-5 py-3">
          <div>
            <h2 className="font-display text-base font-semibold text-brand-900">Compensation Breakdown</h2>
            <p className="text-xs text-gray-400">
              {compEntries.length} entries · {formatPeso(compTotal)} total
            </p>
          </div>
          <button
            onClick={() => {
              setCompDraft(emptyCompDraft(periods[0]?.id ?? ""));
              setAddCompModal(true);
            }}
            className="flex flex-shrink-0 items-center gap-1.5 rounded-lg bg-gold-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gold-600"
          >
            <Plus size={14} /> Add Entry
          </button>
        </div>
        {compEntries.length === 0 ? (
          <p className="px-5 pb-5 text-sm text-gray-400">No compensation entries yet.</p>
        ) : (
          <ScrollX>
            <DataTable columns={compColumns} rows={compEntries} />
          </ScrollX>
        )}
      </div>

      <div className="mt-6 rounded-lg border border-gray-200 bg-white">
        <div className="flex items-start justify-between gap-3 px-5 py-3">
          <div>
            <h2 className="font-display text-base font-semibold text-brand-900">Owner Distributions</h2>
            <p className="text-xs text-gray-400">
              {distributions.length} entries · {formatPeso(distTotal)} total · excluded from expense/profit KPIs
            </p>
          </div>
          <button
            onClick={() => {
              setDistDraft(emptyDistDraft(periods[0]?.id ?? ""));
              setAddDistModal(true);
            }}
            className="flex flex-shrink-0 items-center gap-1.5 rounded-lg bg-gold-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gold-600"
          >
            <Plus size={14} /> Add Distribution
          </button>
        </div>
        {distributions.length === 0 ? (
          <p className="px-5 pb-5 text-sm text-gray-400">No distributions recorded yet.</p>
        ) : (
          <ScrollX>
            <DataTable columns={distColumns} rows={distributions} />
          </ScrollX>
        )}
      </div>

      <div className="mt-6 rounded-lg border border-gray-200 bg-white">
        <div className="px-5 py-3">
          <h2 className="font-display text-base font-semibold text-brand-900">Change History</h2>
          <p className="text-xs text-gray-400">Every create/update/delete on this page, permanently recorded</p>
        </div>
        <div className="flex items-start gap-2 px-5 pb-3 text-xs text-gray-400">
          <Info size={13} className="mt-0.5 flex-shrink-0" />
          <span>Session-only for this mock — resets on reload.</span>
        </div>
        <ScrollX>
          <DataTable columns={historyColumns} rows={history} />
        </ScrollX>
      </div>

      {/* Add / Edit Period */}
      <Modal
        isOpen={addPeriodModal || editPeriod != null}
        onClose={() => {
          setAddPeriodModal(false);
          setEditPeriod(null);
        }}
        title={editPeriod ? "Edit Period" : "Add Period"}
        size="md"
      >
        <form onSubmit={editPeriod ? handleEditPeriod : handleAddPeriod} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">Start Date</span>
              <input
                type="date"
                required
                disabled={!!editPeriod}
                value={periodDraft.startDate}
                onChange={(e) => setPeriodDraft((d) => ({ ...d, startDate: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-brand-900 outline-none focus:border-gold-400 disabled:opacity-60"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">End Date</span>
              <input
                type="date"
                required
                disabled={!!editPeriod}
                value={periodDraft.endDate}
                onChange={(e) => setPeriodDraft((d) => ({ ...d, endDate: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-brand-900 outline-none focus:border-gold-400 disabled:opacity-60"
              />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">Sales (₱)</span>
              <input
                type="number"
                min={0}
                step="any"
                required
                value={periodDraft.sales || ""}
                onChange={(e) => setPeriodDraft((d) => ({ ...d, sales: Number(e.target.value) || 0 }))}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-brand-900 outline-none focus:border-gold-400"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">Operational Expense (₱)</span>
              <input
                type="number"
                min={0}
                step="any"
                value={periodDraft.operationalExpense || ""}
                onChange={(e) => setPeriodDraft((d) => ({ ...d, operationalExpense: Number(e.target.value) || 0 }))}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-brand-900 outline-none focus:border-gold-400"
              />
            </label>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">Salary (₱)</span>
              <input
                type="number"
                min={0}
                step="any"
                value={periodDraft.salary || ""}
                onChange={(e) => setPeriodDraft((d) => ({ ...d, salary: Number(e.target.value) || 0 }))}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-brand-900 outline-none focus:border-gold-400"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">Commissions (₱)</span>
              <input
                type="number"
                min={0}
                step="any"
                value={periodDraft.commissions || ""}
                onChange={(e) => setPeriodDraft((d) => ({ ...d, commissions: Number(e.target.value) || 0 }))}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-brand-900 outline-none focus:border-gold-400"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">Bonuses (₱)</span>
              <input
                type="number"
                min={0}
                step="any"
                value={periodDraft.bonuses || ""}
                onChange={(e) => setPeriodDraft((d) => ({ ...d, bonuses: Number(e.target.value) || 0 }))}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-brand-900 outline-none focus:border-gold-400"
              />
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setAddPeriodModal(false);
                setEditPeriod(null);
              }}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button type="submit" className="rounded-lg bg-gold-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gold-600">
              {editPeriod ? "Save Changes" : "Add Period"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Compensation Entry */}
      <Modal isOpen={addCompModal} onClose={() => setAddCompModal(false)} title="Add Compensation Entry" size="md">
        <form onSubmit={handleAddComp} className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-500">Period</span>
            <select
              value={compDraft.periodId}
              onChange={(e) => setCompDraft((d) => ({ ...d, periodId: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-2 py-2 text-sm text-brand-900 outline-none focus:border-gold-400"
            >
              {periods.map((p) => (
                <option key={p.id} value={p.id}>
                  {periodLabel(p)} {p.kind === "projected" ? "(Projected)" : ""}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">Person</span>
              <input
                required
                value={compDraft.person}
                onChange={(e) => setCompDraft((d) => ({ ...d, person: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-brand-900 outline-none focus:border-gold-400"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">Role</span>
              <input
                value={compDraft.role}
                onChange={(e) => setCompDraft((d) => ({ ...d, role: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-brand-900 outline-none focus:border-gold-400"
              />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">Kind</span>
              <select
                value={compDraft.kind}
                onChange={(e) => setCompDraft((d) => ({ ...d, kind: e.target.value as CompensationKind }))}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-2 py-2 text-sm text-brand-900 outline-none focus:border-gold-400"
              >
                {COMP_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">Amount (₱)</span>
              <input
                type="number"
                min={0}
                step="any"
                required
                value={compDraft.amount || ""}
                onChange={(e) => setCompDraft((d) => ({ ...d, amount: Number(e.target.value) || 0 }))}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-brand-900 outline-none focus:border-gold-400"
              />
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-500">Note</span>
            <textarea
              value={compDraft.note}
              onChange={(e) => setCompDraft((d) => ({ ...d, note: e.target.value }))}
              rows={2}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-brand-900 outline-none focus:border-gold-400"
            />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setAddCompModal(false)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" className="rounded-lg bg-gold-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gold-600">
              Add Entry
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Owner Distribution */}
      <Modal isOpen={addDistModal} onClose={() => setAddDistModal(false)} title="Add Distribution" size="md">
        <form onSubmit={handleAddDist} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">Date</span>
              <input
                type="date"
                required
                value={distDraft.date}
                onChange={(e) => setDistDraft((d) => ({ ...d, date: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-brand-900 outline-none focus:border-gold-400"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">Period</span>
              <select
                value={distDraft.periodId}
                onChange={(e) => setDistDraft((d) => ({ ...d, periodId: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-2 py-2 text-sm text-brand-900 outline-none focus:border-gold-400"
              >
                {periods.map((p) => (
                  <option key={p.id} value={p.id}>
                    {periodLabel(p)} {p.kind === "projected" ? "(Projected)" : ""}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">Recipient</span>
              <input
                required
                value={distDraft.recipient}
                onChange={(e) => setDistDraft((d) => ({ ...d, recipient: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-brand-900 outline-none focus:border-gold-400"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">Method</span>
              <input
                value={distDraft.method}
                onChange={(e) => setDistDraft((d) => ({ ...d, method: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-brand-900 outline-none focus:border-gold-400"
              />
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-500">Amount (₱)</span>
            <input
              type="number"
              min={0}
              step="any"
              required
              value={distDraft.amount || ""}
              onChange={(e) => setDistDraft((d) => ({ ...d, amount: Number(e.target.value) || 0 }))}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-brand-900 outline-none focus:border-gold-400"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-500">Note</span>
            <textarea
              value={distDraft.note}
              onChange={(e) => setDistDraft((d) => ({ ...d, note: e.target.value }))}
              rows={2}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-brand-900 outline-none focus:border-gold-400"
            />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setAddDistModal(false)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" className="rounded-lg bg-gold-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gold-600">
              Add Distribution
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
