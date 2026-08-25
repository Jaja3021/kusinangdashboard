export type PeriodKind = "actual" | "projected";

export type FinancialPeriod = {
  id: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  kind: PeriodKind;
  sales: number;
  operationalExpense: number;
  salary: number;
  commissions: number;
  bonuses: number;
};

export type NewFinancialPeriod = Omit<FinancialPeriod, "id" | "kind">;

export type CompensationKind = "Salary" | "Commission" | "Bonus";

export type CompensationEntry = {
  id: string;
  periodId: string;
  person: string;
  role: string;
  kind: CompensationKind;
  amount: number;
  note: string;
};

export type NewCompensationEntry = Omit<CompensationEntry, "id">;

export type OwnerDistribution = {
  id: string;
  periodId: string;
  date: string; // YYYY-MM-DD
  recipient: string;
  method: string;
  amount: number;
  note: string;
};

export type NewOwnerDistribution = Omit<OwnerDistribution, "id">;

export type ChangeAction = "CREATE" | "UPDATE" | "DELETE";

export type ChangeEntry = {
  id: string;
  at: string; // ISO timestamp
  who: string;
  action: ChangeAction;
  periodLabel: string;
  details: string;
};

// ---------- Derived figures ----------
// Kept beside the type (same convention as lib/breakeven/types.ts and
// lib/costing/types.ts) so every consumer computes these the same way.

/** Salary + commissions + bonuses — compensation that is never shown on Admin Expenses. */
export function restrictedCompensation(p: Pick<FinancialPeriod, "salary" | "commissions" | "bonuses">): number {
  return p.salary + p.commissions + p.bonuses;
}

/** Operational expense + restricted compensation. */
export function totalCapturedExpense(p: Pick<FinancialPeriod, "operationalExpense" | "salary" | "commissions" | "bonuses">): number {
  return p.operationalExpense + restrictedCompensation(p);
}

/** Sales minus everything captured as expense. Owner distributions are deliberately excluded. */
export function contribution(p: Pick<FinancialPeriod, "sales" | "operationalExpense" | "salary" | "commissions" | "bonuses">): number {
  return p.sales - totalCapturedExpense(p);
}

const SHORT_DATE = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

function formatDateKey(dateKey: string): string {
  const d = new Date(`${dateKey}T00:00:00`);
  return Number.isNaN(d.getTime()) ? dateKey : SHORT_DATE.format(d);
}

/** "2026-01-01 → 2026-01-16" style label used across the table and history. */
export function periodLabel(p: Pick<FinancialPeriod, "startDate" | "endDate">): string {
  return `${p.startDate} → ${p.endDate}`;
}

/** Human-friendly variant ("Jan 1, 2026 – Jan 15, 2026") for KPI subtitles. */
export function periodLabelLong(p: Pick<FinancialPeriod, "startDate" | "endDate">): string {
  return `${formatDateKey(p.startDate)} – ${formatDateKey(p.endDate)}`;
}
