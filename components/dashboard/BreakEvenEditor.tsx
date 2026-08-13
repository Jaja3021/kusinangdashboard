"use client";

import { useMemo, useState } from "react";
import { Activity, CircleDollarSign, TrendingUp, Wallet } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import { saveBreakEvenSettingsAction } from "@/app/dashboard/breakeven/actions";
import { BRANCHES } from "@/lib/mt/branches";
import { formatPeso } from "@/lib/format";
import {
  breakEvenEvents,
  contributionMargin,
  revenuePerEvent,
  scenarioAt,
  totalFixedCosts,
  type BreakEvenSettings,
} from "@/lib/breakeven/types";
import type { BreakEvenChartPoint } from "@/components/charts/BreakEvenChart";
import BreakEvenChart from "@/components/charts/BreakEvenChart";

const FIXED_FIELDS: { key: keyof BreakEvenSettings; label: string }[] = [
  { key: "rent", label: "Rent / Lease" },
  { key: "utilities", label: "Utilities" },
  { key: "staffSalaries", label: "Staff Salaries" },
  { key: "insurance", label: "Insurance" },
  { key: "marketing", label: "Marketing / Ads" },
  { key: "otherFixed", label: "Other Fixed" },
];

const SCENARIO_STEPS = [1, 2, 3, 4, 6, 8, 10, 12, 15, 20];

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="mb-3 block">
      <span className="mb-1 block text-xs font-medium text-gray-500">{label}</span>
      <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 px-2.5">
        <span className="text-sm text-gray-400">₱</span>
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          className="w-full bg-transparent py-2 pl-1.5 text-sm text-brand-900 outline-none"
        />
      </div>
    </label>
  );
}

export default function BreakEvenEditor({ settings }: { settings: BreakEvenSettings[] }) {
  const [saved, setSaved] = useState(settings);
  const [branchId, setBranchId] = useState(settings[0]?.branch ?? "");
  const [draft, setDraft] = useState<BreakEvenSettings | undefined>(
    settings.find((s) => s.branch === branchId),
  );
  const [savingState, setSavingState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const branchInfo = BRANCHES.find((b) => b.id === branchId);

  function switchBranch(id: string) {
    setBranchId(id);
    setDraft(saved.find((s) => s.branch === id));
    setSavingState("idle");
  }

  function update(key: keyof BreakEvenSettings, value: number) {
    setDraft((d) => (d ? { ...d, [key]: value } : d));
    setSavingState("idle");
  }

  function reset() {
    setDraft(saved.find((s) => s.branch === branchId));
    setSavingState("idle");
  }

  async function handleSave() {
    if (!draft) return;
    setSavingState("saving");
    try {
      await saveBreakEvenSettingsAction(draft);
      setSaved((cur) => cur.map((s) => (s.branch === draft.branch ? draft : s)));
      setSavingState("saved");
    } catch {
      setSavingState("error");
    }
  }

  const fixed = draft ? totalFixedCosts(draft) : 0;
  const perEvent = draft ? revenuePerEvent(draft) : 0;
  const margin = draft ? contributionMargin(draft) : 0;
  const marginPct = perEvent > 0 ? (margin / perEvent) * 100 : 0;
  const breakEven = draft ? breakEvenEvents(draft) : Infinity;

  const chartData: BreakEvenChartPoint[] = useMemo(() => {
    if (!draft) return [];
    const maxEvents = Number.isFinite(breakEven) ? Math.max(20, breakEven + 5) : 20;
    return Array.from({ length: maxEvents + 1 }, (_, events) => ({
      events,
      "Fixed Costs": fixed,
      Revenue: events * perEvent,
      "Total Costs": fixed + events * (draft.variableCostPerEvent ?? 0),
    }));
  }, [draft, fixed, perEvent, breakEven]);

  const scenarioRows = useMemo(() => {
    if (!draft) return [];
    const steps = new Set(SCENARIO_STEPS);
    if (Number.isFinite(breakEven)) steps.add(breakEven);
    return [...steps].sort((a, b) => a - b).map((events) => scenarioAt(draft, events));
  }, [draft, breakEven]);

  const dirty = draft && JSON.stringify(draft) !== JSON.stringify(saved.find((s) => s.branch === branchId));

  if (!draft) {
    return (
      <div>
        <PageHeader title="Break-even Dashboard" subtitle="Real-time profitability analysis." />
        <p className="text-sm text-gray-500">
          No branch settings found. Run supabase/breakeven_settings.sql in the Supabase SQL editor first.
        </p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Break-even Dashboard" subtitle={`Real-time profitability analysis · ${branchInfo?.name ?? branchId}`}>
        <button onClick={reset} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50">
          Reset
        </button>
        <button
          onClick={handleSave}
          disabled={savingState === "saving" || !dirty}
          className="rounded-lg bg-gold-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gold-600 disabled:opacity-40"
        >
          {savingState === "saving" ? "Saving…" : "Save Settings"}
        </button>
      </PageHeader>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {BRANCHES.map((b) => (
          <button
            key={b.id}
            onClick={() => switchBranch(b.id)}
            className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium ${
              b.id === branchId ? "border-brand-900 bg-brand-900 text-white" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${b.dot}`} />
            {b.name}
          </button>
        ))}
        {savingState === "saved" && <span className="text-xs text-emerald-600">Saved</span>}
        {savingState === "error" && <span className="text-xs text-red-500">Failed to save</span>}
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Break-even Point"
          value={Number.isFinite(breakEven) ? `${breakEven} events/mo` : "Unreachable"}
          sub={Number.isFinite(breakEven) ? `Needs ${formatPeso(breakEven * perEvent)} monthly revenue` : "Margin per event is zero or negative"}
          icon={<CircleDollarSign size={18} className="text-gold-600" />}
        />
        <StatCard
          label="Contribution Margin"
          value={formatPeso(margin)}
          sub={`${marginPct.toFixed(1)}% CM · per event`}
          icon={<TrendingUp size={18} className="text-emerald-500" />}
          valueColor="text-emerald-600"
        />
        <StatCard label="Total Fixed Costs" value={formatPeso(fixed)} sub="Monthly fixed overhead" icon={<Wallet size={18} className="text-blue-500" />} />
        <StatCard label="Avg Revenue / Event" value={formatPeso(perEvent)} sub={`${formatPeso(draft.sellingPricePerPax)}/pax × ${draft.avgPaxPerEvent} pax`} icon={<Activity size={18} className="text-purple-500" />} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-1">
          <div className="rounded-lg border border-gray-200 bg-white p-5">
            <h2 className="font-display text-base font-semibold text-brand-900">Monthly Fixed Costs</h2>
            <p className="mb-4 text-xs text-gray-400">Costs that don&apos;t change with event volume</p>
            {FIXED_FIELDS.map((f) => (
              <NumberField key={f.key} label={f.label} value={draft[f.key] as number} onChange={(v) => update(f.key, v)} />
            ))}
            <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-3">
              <span className="text-sm font-medium text-gray-600">Total Fixed</span>
              <span className="font-display text-lg font-bold text-red-500">{formatPeso(fixed)}</span>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-5">
            <h2 className="font-display text-base font-semibold text-brand-900">Variable Cost per Event</h2>
            <p className="mb-4 text-xs text-gray-400">Food, labour, transport — per event</p>
            <NumberField label="Variable Cost / Event" value={draft.variableCostPerEvent} onChange={(v) => update("variableCostPerEvent", v)} />
            <NumberField label="Avg Pax per Event" value={draft.avgPaxPerEvent} onChange={(v) => update("avgPaxPerEvent", v)} />
            <NumberField label="Selling Price / Pax" value={draft.sellingPricePerPax} onChange={(v) => update("sellingPricePerPax", v)} />
          </div>
        </div>

        <div className="space-y-4 xl:col-span-2">
          <div className="rounded-lg border border-gray-200 bg-white p-5">
            <h2 className="mb-4 font-display text-base font-semibold text-brand-900">Break-even Chart · {branchInfo?.name}</h2>
            <BreakEvenChart data={chartData} breakEvenPoint={breakEven} />
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-5">
            <h2 className="mb-4 font-display text-base font-semibold text-brand-900">Monthly Scenario Planner · {branchInfo?.name}</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-xs uppercase text-gray-500">
                    <th className="pb-2 text-left font-medium">Events / Month</th>
                    <th className="pb-2 text-right font-medium">Total Revenue</th>
                    <th className="pb-2 text-right font-medium">Total Costs</th>
                    <th className="pb-2 text-right font-medium">Net Profit / Loss</th>
                    <th className="pb-2 text-right font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {scenarioRows.map((row) => {
                    const isBreakEven = row.events === breakEven;
                    return (
                      <tr key={row.events} className={isBreakEven ? "bg-gold-500/5" : ""}>
                        <td className="py-2 font-medium text-brand-900">
                          {row.events} event{row.events === 1 ? "" : "s"}
                          {isBreakEven && <span className="ml-2 text-xs font-medium text-gold-600">← BREAK-EVEN</span>}
                        </td>
                        <td className="py-2 text-right text-emerald-600">{formatPeso(row.revenue)}</td>
                        <td className="py-2 text-right text-red-500">{formatPeso(row.totalCosts)}</td>
                        <td className={`py-2 text-right font-medium ${row.profit >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                          {row.profit >= 0 ? "+" : ""}
                          {formatPeso(row.profit)}
                        </td>
                        <td className="py-2 text-right">
                          <span className={`rounded px-2 py-0.5 text-xs font-medium ${row.profit >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                            {row.profit >= 0 ? "PROFIT" : "LOSS"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-lg bg-brand-950 p-5 text-sm text-brand-100">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-300">Insight Summary · {branchInfo?.name}</p>
            <ul className="space-y-1.5">
              <li>
                To cover fixed costs of <span className="font-semibold text-gold-400">{formatPeso(fixed)}</span>/month, you need at least{" "}
                <span className="font-semibold text-gold-400">{Number.isFinite(breakEven) ? breakEven : "∞"} events</span> per month.
              </li>
              <li>
                Each event contributes <span className="font-semibold text-emerald-400">{formatPeso(margin)}</span> ({marginPct.toFixed(1)}%) toward fixed costs and profit.
              </li>
              <li>
                Modeled revenue per event ({branchInfo?.name}): <span className="font-semibold text-white">{formatPeso(perEvent)}</span>.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
