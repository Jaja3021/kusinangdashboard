"use client";

import { useEffect, useState, type FormEvent } from "react";
import Modal from "@/components/ui/Modal";
import { saveComboAction } from "@/app/dashboard/menu/actions";
import { packageShape, flattenCombos, type PackageType, type MenuVariant } from "@/lib/menu/types";

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-brand-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";
const labelClass = "mb-1 block text-xs font-medium text-slate-500";

function newComboId(targetSlug: string, pax: number): string {
  const rand = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID().slice(0, 8) : `${Date.now()}`;
  return `${targetSlug}-${pax}-${rand}`;
}

function linesToArray(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

export type ComboEditing = { packageSlug: string; pax: number; paxLabel?: string; combo: MenuVariant };

// Adds or edits a single named combo (one row of the Packages tab's flat
// table) — a lighter-weight sibling to MenuBuilderModal's whole-package pax
// tier accordion. Add mode picks a Group, which decides which underlying
// package (usually Handaan Packages) the combo is written into; edit mode
// just patches the one combo in place.
export default function ComboModal({
  isOpen,
  onClose,
  mode,
  packages,
  editing,
  onSaved,
}: {
  isOpen: boolean;
  onClose: () => void;
  mode: "add" | "edit";
  packages: PackageType[];
  editing?: ComboEditing;
  onSaved: (updated: PackageType) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [groupChoice, setGroupChoice] = useState<string>("");
  const [customGroup, setCustomGroup] = useState("");

  const combos = flattenCombos(packages);
  const groups = Array.from(new Set(combos.map((c) => c.group))).sort();
  const groupToPackage = new Map<string, string>();
  for (const c of combos) if (!groupToPackage.has(c.group)) groupToPackage.set(c.group, c.packageSlug);

  const eligiblePackages = packages.filter((p) => packageShape(p) === "pax-tiered");
  const defaultTargetSlug = eligiblePackages[0]?.slug;

  useEffect(() => {
    if (isOpen && mode === "add") {
      setGroupChoice(groups[0] ?? "__new__");
      setCustomGroup("");
    }
    if (isOpen && mode === "edit" && editing) {
      setGroupChoice(editing.combo.group ?? "");
    }
  }, [isOpen, mode]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isOpen) return null;

  const isNewGroup = groupChoice === "__new__";
  const resolvedGroup = mode === "edit" ? groupChoice : isNewGroup ? customGroup.trim() : groupChoice;
  const targetSlug = mode === "edit" ? editing!.packageSlug : groupToPackage.get(resolvedGroup) ?? defaultTargetSlug;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const price = Number(data.get("basePrice") ?? 0);
    const group = String(data.get("group") ?? "").trim() || undefined;

    if (mode === "edit" && editing) {
      setSaving(true);
      try {
        const updated = await saveComboAction(editing.packageSlug, editing.pax, editing.paxLabel, {
          ...editing.combo,
          name,
          price,
          group,
        });
        onSaved(updated);
        onClose();
      } catch (err) {
        alert(err instanceof Error ? err.message : "Failed to save the combo.");
      } finally {
        setSaving(false);
      }
      return;
    }

    if (!targetSlug) {
      alert("No package to add this combo to yet — create a package first from the Grazing or Catering tab.");
      return;
    }
    const pax = Number(data.get("pax") ?? 0);
    const paxLabel = String(data.get("paxLabel") ?? "").trim() || undefined;
    if (!pax) {
      alert("Enter a pax count for this combo.");
      return;
    }
    const combo: MenuVariant = { id: newComboId(targetSlug, pax), name, price, mains: [], sides: [], snacks: [], group };
    setSaving(true);
    try {
      const updated = await saveComboAction(targetSlug, pax, paxLabel, combo);
      onSaved(updated);
      onClose();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to add the combo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={mode === "edit" ? "Edit Combo" : "Add Package"} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block text-sm">
          <span className={labelClass}>Package Name</span>
          <input
            name="name"
            required
            placeholder="e.g. Family Combo 1"
            defaultValue={mode === "edit" ? editing?.combo.name : undefined}
            className={inputClass}
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm">
            <span className={labelClass}>Base Price (₱)</span>
            <input
              type="number"
              name="basePrice"
              min={0}
              required
              defaultValue={mode === "edit" ? editing?.combo.price : undefined}
              className={inputClass}
            />
          </label>
          {mode === "add" ? (
            <label className="text-sm">
              <span className={labelClass}>PAX Label</span>
              <input name="paxLabel" placeholder="e.g. 15 pax" className={inputClass} />
            </label>
          ) : (
            <label className="text-sm">
              <span className={labelClass}>PAX</span>
              <input value={editing?.paxLabel ?? editing?.pax} disabled className={`${inputClass} bg-gray-50 text-slate-400`} />
            </label>
          )}
        </div>
        {mode === "add" && (
          <label className="block text-sm">
            <span className={labelClass}>PAX (number, for tier grouping)</span>
            <input type="number" name="pax" min={1} required placeholder="e.g. 15" className={inputClass} />
          </label>
        )}

        <label className="block text-sm">
          <span className={labelClass}>Group</span>
          <select
            name={isNewGroup ? undefined : "group"}
            value={groupChoice}
            onChange={(e) => setGroupChoice(e.target.value)}
            className={inputClass}
          >
            {groups.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
            <option value="__new__">+ New group…</option>
          </select>
        </label>
        {isNewGroup && (
          <label className="block text-sm">
            <span className={labelClass}>New group name</span>
            <input
              name="group"
              required
              value={customGroup}
              onChange={(e) => setCustomGroup(e.target.value)}
              placeholder="e.g. Hapag Pamilya"
              className={inputClass}
            />
          </label>
        )}

        {mode === "add" && eligiblePackages.length > 1 && (
          <p className="text-xs text-slate-400">
            Will be added to <span className="font-medium text-slate-600">{packages.find((p) => p.slug === targetSlug)?.name ?? "—"}</span>.
          </p>
        )}

        <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-gray-100">
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-gold-500 px-4 py-2 text-sm font-semibold text-white hover:bg-gold-600 disabled:opacity-60"
          >
            {mode === "edit" ? "Save Changes" : "Add Package"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
