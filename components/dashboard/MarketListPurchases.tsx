"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { formatPeso } from "@/lib/format";

type PurchaseLine = { id: string; ingredient: string; qty: string; cost: number };

// Client-local only — deliberately not persisted. A market list belongs to
// one kitchen on one day; there's no "the" list to save while multiple
// branches (or no branch) are in view, so this stays scratch-pad state that
// resets on reload rather than pretending to be a saved record.
export default function MarketListPurchases({ branchLabel }: { branchLabel: string | null }) {
  const [lines, setLines] = useState<PurchaseLine[]>([]);
  const [ingredient, setIngredient] = useState("");
  const [qty, setQty] = useState("");
  const [cost, setCost] = useState("");

  if (!branchLabel) {
    return (
      <div>
        <p className="text-sm font-semibold text-brand-900">What we bought</p>
        <p className="mt-1 text-xs text-gray-400">Ingredients and what they cost. A number at the end of a line is its price.</p>
        <div className="mt-4 rounded-lg border border-dashed border-gray-200 p-4 text-sm text-gray-400">
          Select a single branch to write its market list.
          <br />
          The list belongs to one kitchen on one day, so there&apos;s nowhere to save it while every branch is in view.
        </div>
      </div>
    );
  }

  function addLine() {
    if (!ingredient.trim()) return;
    const parsedCost = Number(cost) || 0;
    setLines((cur) => [...cur, { id: crypto.randomUUID(), ingredient: ingredient.trim(), qty: qty.trim(), cost: parsedCost }]);
    setIngredient("");
    setQty("");
    setCost("");
  }

  const total = lines.reduce((sum, l) => sum + l.cost, 0);

  return (
    <div>
      <p className="text-sm font-semibold text-brand-900">What we bought — {branchLabel}</p>
      <p className="mt-1 text-xs text-gray-400">Ingredients and what they cost. A number at the end of a line is its price.</p>

      <div className="mt-4 space-y-1.5">
        {lines.length === 0 ? (
          <p className="text-sm text-gray-400">Nothing recorded yet — add what you bought for this kitchen below.</p>
        ) : (
          lines.map((l) => (
            <div key={l.id} className="flex items-center justify-between gap-2 border-b border-gray-100 py-1.5 text-sm">
              <span className="text-brand-900">
                {l.ingredient}
                {l.qty && <span className="text-gray-400"> · {l.qty}</span>}
              </span>
              <div className="flex items-center gap-2">
                <span className="font-medium text-brand-900">{formatPeso(l.cost)}</span>
                <button onClick={() => setLines((cur) => cur.filter((x) => x.id !== l.id))} className="text-gray-300 hover:text-red-500">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))
        )}
        {lines.length > 0 && (
          <div className="flex items-center justify-between pt-1.5 text-sm font-semibold text-brand-900">
            <span>Total</span>
            <span>{formatPeso(total)}</span>
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <input
          value={ingredient}
          onChange={(e) => setIngredient(e.target.value)}
          placeholder="Ingredient"
          className="min-w-[8rem] flex-1 rounded-md border border-gray-200 px-2 py-1.5 text-sm outline-none focus:border-gold-400"
        />
        <input
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          placeholder="Qty (e.g. 5 kg)"
          className="w-28 rounded-md border border-gray-200 px-2 py-1.5 text-sm outline-none focus:border-gold-400"
        />
        <input
          value={cost}
          onChange={(e) => setCost(e.target.value)}
          placeholder="₱ Price"
          inputMode="decimal"
          className="w-24 rounded-md border border-gray-200 px-2 py-1.5 text-sm outline-none focus:border-gold-400"
        />
        <button
          onClick={addLine}
          className="flex items-center gap-1 rounded-md bg-brand-950 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-900"
        >
          <Plus size={13} /> Add
        </button>
      </div>
    </div>
  );
}
