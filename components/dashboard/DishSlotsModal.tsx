"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ArrowUp, ArrowDown, X } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { formatPeso } from "@/lib/format";
import { saveDishSlotsAction } from "@/app/dashboard/menu/actions";
import {
  DISH_SLOT_CATEGORIES,
  SLOT_CATEGORY_CHIP,
  TRAY_SIZES,
  packageBasePriceInfo,
  type PackageType,
  type DishSlot,
  type DishSlotCategory,
  type TraySize,
} from "@/lib/menu/types";

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-brand-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";
const smallInputClass =
  "w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs text-brand-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";
const labelClass = "mb-1 block text-xs font-medium text-slate-500";

export default function DishSlotsModal({
  isOpen,
  onClose,
  pkg,
  allPackages,
  onSaved,
}: {
  isOpen: boolean;
  onClose: () => void;
  pkg: PackageType | null;
  allPackages: PackageType[];
  onSaved: (updated: PackageType) => void;
}) {
  const [slots, setSlots] = useState<DishSlot[]>([]);
  const [saving, setSaving] = useState(false);
  const [category, setCategory] = useState<DishSlotCategory>(DISH_SLOT_CATEGORIES[0]);
  const [traySize, setTraySize] = useState<TraySize>(TRAY_SIZES[0]);

  useEffect(() => {
    if (pkg) setSlots(pkg.dishSlots);
  }, [pkg]);

  if (!pkg) return null;

  const { paxLabel, price } = packageBasePriceInfo(pkg);

  function dishOptions(cat: DishSlotCategory): string[] {
    if (!pkg) return [];
    const ownMatch = (pkg.trayCatalog ?? []).filter((d) => d.category === cat).map((d) => d.name);
    if (ownMatch.length > 0) return ownMatch;
    const union = new Set(
      allPackages.flatMap((p) => (p.trayCatalog ?? []).filter((d) => d.category === cat).map((d) => d.name))
    );
    return [...union];
  }

  function moveSlot(index: number, dir: -1 | 1) {
    setSlots((prev) => {
      const next = prev.slice();
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function removeSlot(id: string) {
    setSlots((prev) => prev.filter((s) => s.id !== id));
  }

  function updateSlot(id: string, patch: Partial<DishSlot>) {
    setSlots((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  function handleAddSlot(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const dish = String(data.get("dish") ?? "").trim();
    if (!dish) return;
    const newSlot: DishSlot = {
      id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `slot-${Date.now()}`,
      category,
      dish,
      traySize,
      quantity: Math.max(1, Number(data.get("quantity") ?? 1)),
      swappable: data.get("swappable") === "on",
    };
    setSlots((prev) => [...prev, newSlot]);
    e.currentTarget.reset();
  }

  async function handleSave() {
    if (!pkg) return;
    setSaving(true);
    try {
      const updated = await saveDishSlotsAction(pkg.slug, slots);
      onSaved(updated);
      onClose();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save dish slots.");
    } finally {
      setSaving(false);
    }
  }

  const options = dishOptions(category);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`${pkg.name} — Dish Slots`} size="lg">
      <p className="-mt-2 mb-4 text-xs text-slate-400">
        {paxLabel} · {price != null ? formatPeso(price) : "—"} · {slots.length} slot{slots.length === 1 ? "" : "s"}
      </p>

      <ul className="space-y-2">
        {slots.length === 0 && <p className="text-sm text-slate-400">No dish slots yet — add one below.</p>}
        {slots.map((slot, i) => {
          const slotOptions = dishOptions(slot.category);
          return (
            <li key={slot.id} className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2">
              <span className="w-5 text-center text-xs font-semibold text-slate-400">{i + 1}</span>
              <span
                className={`whitespace-nowrap rounded-full px-2 py-1 text-xs font-semibold ${SLOT_CATEGORY_CHIP[slot.category]}`}
              >
                {slot.category}
              </span>
              <span className="whitespace-nowrap text-xs text-slate-500">
                {slot.traySize} ×{slot.quantity}
              </span>
              <div className="flex-1">
                {slot.swappable ? (
                  slotOptions.length > 0 ? (
                    <select
                      value={slot.dish}
                      onChange={(e) => updateSlot(slot.id, { dish: e.target.value })}
                      className={smallInputClass}
                    >
                      {!slotOptions.includes(slot.dish) && <option value={slot.dish}>{slot.dish}</option>}
                      {slotOptions.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={slot.dish}
                      onChange={(e) => updateSlot(slot.id, { dish: e.target.value })}
                      className={smallInputClass}
                    />
                  )
                ) : (
                  <span className="text-sm text-brand-900">
                    {slot.dish} <span className="text-xs text-slate-400">fixed</span>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 text-slate-400">
                <button
                  type="button"
                  onClick={() => moveSlot(i, -1)}
                  disabled={i === 0}
                  aria-label="Move up"
                  className="rounded p-1 hover:text-brand-700 disabled:opacity-30"
                >
                  <ArrowUp size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => moveSlot(i, 1)}
                  disabled={i === slots.length - 1}
                  aria-label="Move down"
                  className="rounded p-1 hover:text-brand-700 disabled:opacity-30"
                >
                  <ArrowDown size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => removeSlot(slot.id)}
                  aria-label="Remove"
                  className="rounded p-1 hover:text-red-600"
                >
                  <X size={14} />
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <form onSubmit={handleAddSlot} className="mt-4 rounded-lg border border-gray-200 p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Add Dish Slot</p>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm">
            <span className={labelClass}>Category</span>
            <select
              name="category"
              value={category}
              onChange={(e) => setCategory(e.target.value as DishSlotCategory)}
              className={inputClass}
            >
              {DISH_SLOT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className={labelClass}>Dish</span>
            {options.length > 0 ? (
              <select name="dish" defaultValue={options[0]} className={inputClass}>
                {options.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            ) : (
              <input name="dish" required placeholder="Dish name" className={inputClass} />
            )}
          </label>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="text-sm">
            <span className={labelClass}>Tray Size</span>
            <select
              name="traySize"
              value={traySize}
              onChange={(e) => setTraySize(e.target.value as TraySize)}
              className={inputClass}
            >
              {TRAY_SIZES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className={labelClass}>Quantity</span>
            <input type="number" name="quantity" min={1} defaultValue={1} className={inputClass} />
          </label>
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            name="swappable"
            defaultChecked
            className="h-4 w-4 rounded border-gray-300 text-brand-700 focus:ring-brand-500"
          />
          Customer can swap this dish
        </label>
        <div className="mt-3 flex justify-end">
          <button type="submit" className="rounded-lg bg-gold-500 px-4 py-2 text-sm font-semibold text-white hover:bg-gold-600">
            + Add Slot
          </button>
        </div>
      </form>

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
