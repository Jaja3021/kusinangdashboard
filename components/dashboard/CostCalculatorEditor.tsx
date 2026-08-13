"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Download, Plus, Trash2 } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { saveCostCalculationAction } from "@/app/dashboard/cost-calculator/actions";
import { downloadCsv, toCsv } from "@/lib/csv";
import { formatPeso } from "@/lib/format";
import { BRANCHES } from "@/lib/mt/branches";
import { COST_PRESETS } from "@/lib/costcalc/presets";
import {
  foodCostTotal,
  gpPct,
  grossMargin,
  totalCost,
  totalRevenue,
  type CostCalculation,
  type CostItem,
} from "@/lib/costcalc/types";

function newId(): string {
  return `item-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function blank(branch: string): Omit<CostCalculation, "id"> {
  return {
    branch,
    name: "New Calculation",
    paxCount: 100,
    sellingPricePerPax: 850,
    targetGpPct: 35,
    items: [{ id: newId(), name: "", qty: 1, unit: "pcs", costPerUnit: 0 }],
    labourCost: 0,
    overheadCost: 0,
  };
}

export default function CostCalculatorEditor({ saved }: { saved: CostCalculation[] }) {
  const [branchId, setBranchId] = useState(BRANCHES[0]?.id ?? "");
  const [savedCalcs, setSavedCalcs] = useState(saved);
  const [calc, setCalc] = useState<Omit<CostCalculation, "id">>(blank(branchId));
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  const branchInfo = BRANCHES.find((b) => b.id === branchId);
  const branchSaved = savedCalcs.filter((c) => c.branch === branchId);

  function switchBranch(id: string) {
    setBranchId(id);
    setCalc(blank(id));
  }

  function update<K extends keyof typeof calc>(key: K, value: (typeof calc)[K]) {
    setCalc((c) => ({ ...c, [key]: value }));
    setSavedFlash(false);
  }

  function updateItem(id: string, patch: Partial<CostItem>) {
    update(
      "items",
      calc.items.map((i) => (i.id === id ? { ...i, ...patch } : i)),
    );
  }

  function addItem() {
    update("items", [...calc.items, { id: newId(), name: "", qty: 1, unit: "pcs", costPerUnit: 0 }]);
  }

  function removeItem(id: string) {
    update("items", calc.items.filter((i) => i.id !== id));
  }

  function loadPreset(presetId: string) {
    const preset = COST_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setCalc((c) => ({
      ...c,
      name: preset.label,
      paxCount: preset.paxCount,
      items: preset.items.map((i) => ({ ...i, id: newId() })),
    }));
    setSavedFlash(false);
  }

  function loadSaved(id: string) {
    const found = branchSaved.find((c) => c.id === id);
    if (!found) return;
    const { id: _drop, ...rest } = found;
    setCalc(rest);
    setSavedFlash(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const result = await saveCostCalculationAction(calc);
      setSavedCalcs((cur) => [result, ...cur]);
      setSavedFlash(true);
    } finally {
      setSaving(false);
    }
  }

  function handleExportCsv() {
    const rows = calc.items.map((i) => ({ ...i, lineTotal: i.qty * i.costPerUnit }));
    const csv = toCsv(rows, [
      { key: "name", header: "Item Name" },
      { key: "qty", header: "Qty" },
      { key: "unit", header: "Unit" },
      { key: "costPerUnit", header: "Cost / Unit" },
      { key: "lineTotal", header: "Line Total" },
    ]);
    downloadCsv(`${calc.name.replace(/\s+/g, "-").toLowerCase() || "calculation"}.csv`, csv);
  }

  const foodCost = useMemo(() => foodCostTotal(calc.items), [calc.items]);
  const cost = totalCost(calc as CostCalculation);
  const revenue = totalRevenue(calc);
  const margin = grossMargin(calc as CostCalculation);
  const gp = gpPct(calc as CostCalculation);
  const onTarget = gp >= calc.targetGpPct;
  const costPerPax = calc.paxCount > 0 ? cost / calc.paxCount : 0;
  const profitPerPax = calc.paxCount > 0 ? margin / calc.paxCount : 0;

  return (
    <div>
      <PageHeader title="Food Cost & Margin Calculator" subtitle="Calculate true food cost, labour, and profit per event.">
        {branchSaved.length > 0 && (
          <select
            onChange={(e) => e.target.value && loadSaved(e.target.value)}
            defaultValue=""
            className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-gray-600"
          >
            <option value="">Saved ({branchSaved.length})</option>
            {branchSaved.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
        <button onClick={handleSave} disabled={saving} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40">
          {saving ? "Saving…" : "Save"}
        </button>
        <button onClick={handleExportCsv} className="flex items-center gap-1.5 rounded-lg bg-gold-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gold-600">
          <Download size={13} /> Export CSV
        </button>
      </PageHeader>

      <div className="mb-4 flex flex-wrap gap-2">
        {BRANCHES.map((b) => (
          <button
            key={b.id}
            onClick={() => switchBranch(b.id)}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
              b.id === branchId ? "border-brand-900 bg-brand-900 text-white" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            {b.name}
          </button>
        ))}
        {savedFlash && <span className="self-center text-xs text-emerald-600">Saved</span>}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <div className="rounded-lg border border-gray-200 bg-white p-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <label className="text-xs text-gray-500">
                Calculation Name
                <input value={calc.name} onChange={(e) => update("name", e.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm" />
              </label>
              <label className="text-xs text-gray-500">
                Pax Count
                <input type="number" value={calc.paxCount} onChange={(e) => update("paxCount", Number(e.target.value) || 0)} className="mt-1 w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm" />
              </label>
              <label className="text-xs text-gray-500">
                Selling Price / Pax (₱)
                <input type="number" value={calc.sellingPricePerPax} onChange={(e) => update("sellingPricePerPax", Number(e.target.value) || 0)} className="mt-1 w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm" />
              </label>
              <label className="text-xs text-gray-500">
                Target GP%
                <input type="number" value={calc.targetGpPct} onChange={(e) => update("targetGpPct", Number(e.target.value) || 0)} className="mt-1 w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm" />
              </label>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs text-gray-400">Load preset:</span>
              {COST_PRESETS.map((p) => (
                <button key={p.id} onClick={() => loadPreset(p.id)} className="rounded-full border border-gray-200 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-50">
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-5">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="font-display text-base font-semibold text-brand-900">Food Cost Items</h2>
                <p className="text-xs text-gray-400">Enter each ingredient or supply item</p>
              </div>
              <button onClick={addItem} className="flex items-center gap-1 rounded-lg bg-gold-500 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-gold-600">
                <Plus size={13} /> Add Item
              </button>
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs uppercase text-gray-500">
                  <th className="pb-2 text-left font-medium">Item Name</th>
                  <th className="w-16 pb-2 text-left font-medium">Qty</th>
                  <th className="w-24 pb-2 text-left font-medium">Unit</th>
                  <th className="w-28 pb-2 text-left font-medium">Cost / Unit (₱)</th>
                  <th className="w-24 pb-2 text-right font-medium">Line Total</th>
                  <th className="w-8 pb-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {calc.items.map((item) => (
                  <tr key={item.id}>
                    <td className="py-1.5 pr-2">
                      <input
                        value={item.name}
                        placeholder="e.g. Pork (per kilo)"
                        onChange={(e) => updateItem(item.id, { name: e.target.value })}
                        className="w-full rounded border border-gray-200 px-2 py-1 text-sm"
                      />
                    </td>
                    <td className="py-1.5 pr-2">
                      <input type="number" value={item.qty} onChange={(e) => updateItem(item.id, { qty: Number(e.target.value) || 0 })} className="w-full rounded border border-gray-200 px-2 py-1 text-sm" />
                    </td>
                    <td className="py-1.5 pr-2">
                      <select value={item.unit} onChange={(e) => updateItem(item.id, { unit: e.target.value })} className="w-full rounded border border-gray-200 px-2 py-1 text-sm">
                        {["pcs", "kg", "sacks", "tray", "tub", "lot"].map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-1.5 pr-2">
                      <input type="number" value={item.costPerUnit} onChange={(e) => updateItem(item.id, { costPerUnit: Number(e.target.value) || 0 })} className="w-full rounded border border-gray-200 px-2 py-1 text-sm" />
                    </td>
                    <td className="py-1.5 text-right font-medium text-brand-900">{formatPeso(item.qty * item.costPerUnit)}</td>
                    <td className="py-1.5 text-right">
                      <button onClick={() => removeItem(item.id)} className="text-gray-300 hover:text-red-500">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-2 flex justify-between border-t border-gray-100 pt-2 text-sm font-semibold">
              <span className="text-gray-600">Food Cost Total</span>
              <span className="text-brand-900">{formatPeso(foodCost)}</span>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-5">
            <h2 className="mb-3 font-display text-base font-semibold text-brand-900">Additional Costs</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="text-xs text-gray-500">
                Labour Cost (₱)
                <input type="number" value={calc.labourCost} onChange={(e) => update("labourCost", Number(e.target.value) || 0)} className="mt-1 w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm" />
              </label>
              <label className="text-xs text-gray-500">
                Overhead / Other (₱)
                <input type="number" value={calc.overheadCost} onChange={(e) => update("overheadCost", Number(e.target.value) || 0)} className="mt-1 w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm" />
              </label>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className={`rounded-lg border p-4 ${onTarget ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}>
            <p className={`flex items-center gap-1.5 text-sm font-semibold ${onTarget ? "text-emerald-700" : "text-red-600"}`}>
              <CheckCircle2 size={15} /> GP% {onTarget ? "On Target" : "Below Target"} (≥{calc.targetGpPct}%)
            </p>
            <div className="mt-2 h-2 rounded-full bg-white">
              <div className={`h-2 rounded-full ${onTarget ? "bg-emerald-500" : "bg-red-400"}`} style={{ width: `${Math.min(100, Math.max(0, gp))}%` }} />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Target: {calc.targetGpPct}% GP · Current: {gp.toFixed(1)}%
            </p>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Financial Summary</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Total Revenue</dt>
                <dd className="font-medium text-emerald-600">{formatPeso(revenue)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Food Cost</dt>
                <dd className="font-medium text-brand-900">{formatPeso(foodCost)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Labour Cost</dt>
                <dd className="font-medium text-brand-900">{formatPeso(calc.labourCost)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Overhead</dt>
                <dd className="font-medium text-brand-900">{formatPeso(calc.overheadCost)}</dd>
              </div>
              <div className="flex justify-between border-t border-gray-100 pt-2">
                <dt className="text-gray-500">Total Cost</dt>
                <dd className="font-medium text-red-500">{formatPeso(cost)}</dd>
              </div>
              <div className="flex justify-between rounded-md bg-gold-500/10 px-2 py-1.5">
                <dt className="font-medium text-gold-700">Gross Margin</dt>
                <dd className="font-semibold text-gold-700">{formatPeso(margin)}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Per Pax Breakdown</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Selling Price / Pax</dt>
                <dd className="font-medium text-brand-900">{formatPeso(calc.sellingPricePerPax)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Total Cost / Pax</dt>
                <dd className="font-medium text-brand-900">{formatPeso(costPerPax, { cents: true })}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Profit / Pax</dt>
                <dd className="font-semibold text-gold-600">{formatPeso(profitPerPax, { cents: true })}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Pax Count</dt>
                <dd className="font-medium text-brand-900">{calc.paxCount}</dd>
              </div>
            </dl>
          </div>

          <div className="overflow-hidden rounded-lg border border-emerald-200">
            <div className="flex items-center justify-between bg-emerald-500 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white">
              <span>Quote Summary</span>
              <span className="font-normal normal-case">{calc.name}</span>
            </div>
            <div className="space-y-2 bg-white p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">
                  Pax <span className="font-medium text-brand-900">{calc.paxCount}</span> × {formatPeso(calc.sellingPricePerPax)}/pax
                </span>
                <span className="font-medium text-brand-900">{formatPeso(revenue)}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Food Cost</span>
                <span>{formatPeso(foodCost)}</span>
              </div>
              <div className="flex justify-between text-red-500">
                <span>Total Cost</span>
                <span>{formatPeso(cost)}</span>
              </div>
              <div className={`rounded-lg p-4 text-center ${onTarget ? "bg-emerald-50" : "bg-red-50"}`}>
                <p className={`font-display text-2xl font-bold ${onTarget ? "text-emerald-600" : "text-red-500"}`}>{gp.toFixed(1)}%</p>
                <p className="text-xs text-gray-500">Gross Profit Margin</p>
                <p className="text-sm font-semibold text-brand-900">{formatPeso(margin)}</p>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">Target: {calc.targetGpPct}% GP</span>
                <span className={onTarget ? "font-medium text-emerald-600" : "font-medium text-red-500"}>
                  {onTarget ? "✓ On target" : "✗ Below target"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
