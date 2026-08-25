"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { savePaxTiersAction } from "@/app/dashboard/menu/actions";
import type { PackageType, PaxTier, MenuVariant } from "@/lib/menu/types";

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-brand-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";
const smallInputClass =
  "w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs text-brand-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";
const labelClass = "mb-1 block text-xs font-medium text-slate-500";

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `combo-${Date.now()}`;
}

function linesToArray(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

export default function MenuBuilderModal({
  isOpen,
  onClose,
  pkg,
  onSaved,
}: {
  isOpen: boolean;
  onClose: () => void;
  pkg: PackageType | null;
  onSaved: (updated: PackageType) => void;
}) {
  const [tiers, setTiers] = useState<PaxTier[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (pkg) setTiers(pkg.paxTiers.slice().sort((a, b) => a.pax - b.pax));
  }, [pkg]);

  if (!pkg) return null;

  function updateTier(index: number, patch: Partial<PaxTier>) {
    setTiers((prev) => prev.map((t, i) => (i === index ? { ...t, ...patch } : t)));
  }

  function removeTier(index: number) {
    setTiers((prev) => prev.filter((_, i) => i !== index));
  }

  function addTier() {
    setTiers((prev) => [...prev, { pax: 0, paxLabel: "", menus: [] }]);
  }

  function updateCombo(tierIndex: number, comboId: string, patch: Partial<MenuVariant>) {
    setTiers((prev) =>
      prev.map((t, i) =>
        i === tierIndex ? { ...t, menus: t.menus.map((m) => (m.id === comboId ? { ...m, ...patch } : m)) } : t
      )
    );
  }

  function removeCombo(tierIndex: number, comboId: string) {
    setTiers((prev) =>
      prev.map((t, i) => (i === tierIndex ? { ...t, menus: t.menus.filter((m) => m.id !== comboId) } : t))
    );
  }

  function addCombo(tierIndex: number) {
    const combo: MenuVariant = { id: newId(), name: "", price: 0, mains: [], sides: [], snacks: [] };
    setTiers((prev) => prev.map((t, i) => (i === tierIndex ? { ...t, menus: [...t.menus, combo] } : t)));
  }

  async function handleSave() {
    if (!pkg) return;
    setSaving(true);
    try {
      const updated = await savePaxTiersAction(pkg.slug, tiers);
      onSaved(updated);
      onClose();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save the menu.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`${pkg.name} — Menu Builder`} size="lg">
      <p className="-mt-2 mb-4 text-xs text-slate-400">
        {tiers.length} pax tier{tiers.length === 1 ? "" : "s"} · {tiers.reduce((n, t) => n + t.menus.length, 0)} combo
        {tiers.reduce((n, t) => n + t.menus.length, 0) === 1 ? "" : "s"} total
      </p>

      <div className="space-y-3">
        {tiers.length === 0 && <p className="text-sm text-slate-400">No pax tiers yet — add one below.</p>}
        {tiers.map((tier, tierIndex) => (
          <details key={tierIndex} className="group rounded-lg border border-gray-200" open={tierIndex === 0}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2">
              <span className="flex flex-wrap items-center gap-2">
                <input
                  type="number"
                  value={tier.pax}
                  onChange={(e) => updateTier(tierIndex, { pax: Number(e.target.value) })}
                  className={`${smallInputClass} w-16`}
                  onClick={(e) => e.stopPropagation()}
                />
                <input
                  value={tier.paxLabel ?? ""}
                  onChange={(e) => updateTier(tierIndex, { paxLabel: e.target.value })}
                  placeholder="Pax label"
                  className={`${smallInputClass} w-28`}
                  onClick={(e) => e.stopPropagation()}
                />
                <span className="text-xs text-slate-400">
                  {tier.menus.length} combo{tier.menus.length === 1 ? "" : "s"}
                </span>
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  removeTier(tierIndex);
                }}
                aria-label="Remove tier"
                className="text-slate-400 hover:text-red-600"
              >
                <Trash2 size={16} />
              </button>
            </summary>

            <div className="space-y-3 border-t border-gray-100 px-3 py-3">
              {tier.menus.map((combo) => (
                <div key={combo.id} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="grid flex-1 grid-cols-2 gap-2">
                      <label className="text-sm">
                        <span className={labelClass}>Name</span>
                        <input
                          value={combo.name}
                          onChange={(e) => updateCombo(tierIndex, combo.id, { name: e.target.value })}
                          className={inputClass}
                        />
                      </label>
                      <label className="text-sm">
                        <span className={labelClass}>Price (₱)</span>
                        <input
                          type="number"
                          min={0}
                          value={combo.price}
                          onChange={(e) => updateCombo(tierIndex, combo.id, { price: Number(e.target.value) })}
                          className={inputClass}
                        />
                      </label>
                      <label className="col-span-2 text-sm">
                        <span className={labelClass}>Group</span>
                        <input
                          value={combo.group ?? ""}
                          onChange={(e) => updateCombo(tierIndex, combo.id, { group: e.target.value || undefined })}
                          placeholder="e.g. Hapag Pamilya"
                          className={inputClass}
                        />
                      </label>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeCombo(tierIndex, combo.id)}
                      aria-label="Remove combo"
                      className="mt-5 text-slate-400 hover:text-red-600"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    <label className="text-sm">
                      <span className={labelClass}>Mains (one per line)</span>
                      <textarea
                        rows={2}
                        defaultValue={combo.mains.join("\n")}
                        onBlur={(e) => updateCombo(tierIndex, combo.id, { mains: linesToArray(e.target.value) })}
                        className={inputClass}
                      />
                    </label>
                    <label className="text-sm">
                      <span className={labelClass}>Sides (one per line)</span>
                      <textarea
                        rows={2}
                        defaultValue={combo.sides.join("\n")}
                        onBlur={(e) => updateCombo(tierIndex, combo.id, { sides: linesToArray(e.target.value) })}
                        className={inputClass}
                      />
                    </label>
                    <label className="text-sm">
                      <span className={labelClass}>Snacks (one per line)</span>
                      <textarea
                        rows={2}
                        defaultValue={combo.snacks.join("\n")}
                        onBlur={(e) => updateCombo(tierIndex, combo.id, { snacks: linesToArray(e.target.value) })}
                        className={inputClass}
                      />
                    </label>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => addCombo(tierIndex)}
                className="rounded-lg border border-brand-200 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-50"
              >
                + Add Combo
              </button>
            </div>
          </details>
        ))}
      </div>

      <button
        type="button"
        onClick={addTier}
        className="mt-4 rounded-lg bg-gold-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gold-600"
      >
        + Add Pax Tier
      </button>

      <div className="mt-5 flex justify-end gap-2 border-t border-gray-100 pt-4">
        <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-gray-100">
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-gold-500 px-4 py-2 text-sm font-semibold text-white hover:bg-gold-600 disabled:opacity-60"
        >
          Save Changes
        </button>
      </div>
    </Modal>
  );
}
