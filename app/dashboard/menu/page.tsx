"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, ListChecks } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Modal from "@/components/ui/Modal";
import { BranchBadge } from "@/components/ui/Badge";
import {
  menuPackages as initialPackages,
  menuDishes as initialDishes,
  grazingSpreads as initialGrazing,
  cateringPackages as initialCatering,
  packedMeals as initialPackedMeals,
  formatPeso,
  BRANCHES,
  type MenuPackage,
} from "@/lib/dummy-data";

type TabKey = "packages" | "dishes" | "grazing" | "catering" | "packed";

const TAB_CONFIG: Record<TabKey, { label: string; groups: string[]; showPax: boolean; addLabel: string; itemNoun: string }> = {
  packages: {
    label: "Packages",
    groups: ["Family Combos", "Feast Combos", "Premium", "XXXL Combos", "2 XXXL Combos", "Named Packages", "Special Package"],
    showPax: true,
    addLabel: "Add Package",
    itemNoun: "Package",
  },
  dishes: {
    label: "Dishes",
    groups: ["Ulam", "Rice & Noodles", "Soups", "Appetizers", "Dessert", "Kakanin"],
    showPax: false,
    addLabel: "Add Dish",
    itemNoun: "Dish",
  },
  grazing: { label: "Grazing", groups: ["Grazing"], showPax: true, addLabel: "Add Grazing Package", itemNoun: "Package" },
  catering: { label: "Catering", groups: ["Catering"], showPax: true, addLabel: "Add Catering Package", itemNoun: "Package" },
  packed: { label: "Packed Meals", groups: ["Packed Meals"], showPax: true, addLabel: "Add Packed Meal", itemNoun: "Meal" },
};

const BRANCH_OPTIONS = ["Both", ...BRANCHES];

type FormState = {
  code: string;
  name: string;
  pax: string;
  basePrice: string;
  group: string;
  branch: string;
  active: boolean;
  inclusions: string;
};

function emptyForm(group: string): FormState {
  return { code: "", name: "", pax: "", basePrice: "", group, branch: "Both", active: true, inclusions: "" };
}

function toFormState(item: MenuPackage): FormState {
  return {
    code: item.code,
    name: item.name,
    pax: item.pax,
    basePrice: String(item.basePrice),
    group: item.group,
    branch: item.branch,
    active: item.active,
    inclusions: item.inclusions.join(", "),
  };
}

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-brand-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";
const labelClass = "mb-1 block text-xs font-medium text-slate-500";

export default function MenuPackagesPage() {
  const [data, setData] = useState<Record<TabKey, MenuPackage[]>>({
    packages: initialPackages,
    dishes: initialDishes,
    grazing: initialGrazing,
    catering: initialCatering,
    packed: initialPackedMeals,
  });
  const [activeTab, setActiveTab] = useState<TabKey>("packages");
  const [activeGroup, setActiveGroup] = useState<string>("All");
  const [modal, setModal] = useState<{ mode: "add" | "edit" | "view"; item?: MenuPackage } | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm(TAB_CONFIG.packages.groups[0]));

  const config = TAB_CONFIG[activeTab];
  const rows = data[activeTab];
  const visibleRows = activeGroup === "All" ? rows : rows.filter((r) => r.group === activeGroup);

  function switchTab(tab: TabKey) {
    setActiveTab(tab);
    setActiveGroup("All");
  }

  function toggleActive(id: string) {
    setData((prev) => ({
      ...prev,
      [activeTab]: prev[activeTab].map((r) => (r.id === id ? { ...r, active: !r.active } : r)),
    }));
  }

  function removeItem(id: string, name: string) {
    if (typeof window !== "undefined" && !window.confirm(`Remove "${name}" from the menu?`)) return;
    setData((prev) => ({ ...prev, [activeTab]: prev[activeTab].filter((r) => r.id !== id) }));
  }

  function openAdd() {
    setForm(emptyForm(config.groups[0]));
    setModal({ mode: "add" });
  }

  function openEdit(item: MenuPackage) {
    setForm(toFormState(item));
    setModal({ mode: "edit", item });
  }

  function openView(item: MenuPackage) {
    setModal({ mode: "view", item });
  }

  function closeModal() {
    setModal(null);
  }

  function saveForm() {
    if (!form.name.trim()) return;
    const inclusions = form.inclusions
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const basePrice = Number(form.basePrice) || 0;

    if (modal?.mode === "edit" && modal.item) {
      const editedId = modal.item.id;
      setData((prev) => ({
        ...prev,
        [activeTab]: prev[activeTab].map((r) =>
          r.id === editedId
            ? { ...r, code: form.code, name: form.name, pax: form.pax, basePrice, group: form.group, branch: form.branch as MenuPackage["branch"], active: form.active, inclusions }
            : r
        ),
      }));
    } else {
      const newItem: MenuPackage = {
        id: `${activeTab}-${Date.now()}`,
        code: form.code || form.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 24),
        name: form.name,
        pax: form.pax,
        basePrice,
        group: form.group,
        branch: form.branch as MenuPackage["branch"],
        active: form.active,
        inclusions,
      };
      setData((prev) => ({ ...prev, [activeTab]: [newItem, ...prev[activeTab]] }));
    }
    closeModal();
  }

  const modalTitle =
    modal?.mode === "view" ? modal.item?.name : modal?.mode === "edit" ? `Edit ${config.itemNoun}` : config.addLabel;

  return (
    <div>
      <PageHeader title="Menu / Packages" subtitle="Manage packages and dishes — changes sync to Meal Builder">
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-1.5 rounded-lg bg-gold-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-gold-600"
        >
          <Plus size={16} />
          {config.addLabel}
        </button>
      </PageHeader>

      <div className="flex flex-wrap gap-6 border-b border-gray-200">
        {(Object.keys(TAB_CONFIG) as TabKey[]).map((key) => (
          <button
            key={key}
            onClick={() => switchTab(key)}
            className={`-mb-px whitespace-nowrap border-b-2 pb-3 text-sm font-medium transition-colors ${
              activeTab === key ? "border-brand-900 text-brand-900" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {TAB_CONFIG[key].label} <span className="text-slate-400">({data[key].length})</span>
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        <button
          onClick={() => setActiveGroup("All")}
          className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
            activeGroup === "All" ? "bg-brand-900 text-white" : "text-slate-500 hover:bg-gray-100"
          }`}
        >
          All
        </button>
        {config.groups.map((g) => (
          <button
            key={g}
            onClick={() => setActiveGroup(g)}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              activeGroup === g ? "bg-brand-900 text-white" : "text-slate-500 hover:bg-gray-100"
            }`}
          >
            {g}
          </button>
        ))}
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {config.showPax ? "Package" : "Dish"}
                </th>
                {config.showPax && (
                  <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Pax</th>
                )}
                <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Base Price</th>
                <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Group</th>
                <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Branch</th>
                <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Active</th>
                <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.length === 0 && (
                <tr>
                  <td colSpan={config.showPax ? 7 : 6} className="px-5 py-8 text-center text-sm text-slate-400">
                    No items in this category yet.
                  </td>
                </tr>
              )}
              {visibleRows.map((row) => (
                <tr key={row.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-brand-900">{row.name}</p>
                    <p className="text-xs text-slate-400">{row.code}</p>
                  </td>
                  {config.showPax && <td className="whitespace-nowrap px-5 py-3.5 text-slate-700">{row.pax}</td>}
                  <td className="whitespace-nowrap px-5 py-3.5 text-slate-700">{formatPeso(row.basePrice)}</td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-slate-700">{row.group}</td>
                  <td className="whitespace-nowrap px-5 py-3.5">
                    <BranchBadge branch={row.branch} />
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5">
                    <button
                      type="button"
                      onClick={() => toggleActive(row.id)}
                      aria-pressed={row.active}
                      aria-label={row.active ? "Deactivate" : "Activate"}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                        row.active ? "bg-emerald-500" : "bg-gray-300"
                      }`}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                          row.active ? "translate-x-[18px]" : "translate-x-[2px]"
                        }`}
                      />
                    </button>
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5">
                    <div className="flex items-center gap-3 text-slate-400">
                      <button type="button" onClick={() => openView(row)} aria-label="View details" className="transition-colors hover:text-brand-700">
                        <ListChecks size={16} />
                      </button>
                      <button type="button" onClick={() => openEdit(row)} aria-label="Edit" className="transition-colors hover:text-brand-700">
                        <Pencil size={16} />
                      </button>
                      <button type="button" onClick={() => removeItem(row.id, row.name)} aria-label="Delete" className="transition-colors hover:text-red-600">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={modal !== null} onClose={closeModal} title={modalTitle} size="md">
        {modal?.mode === "view" && modal.item && (
          <div className="space-y-4 text-sm">
            <p className="text-xs uppercase tracking-wide text-slate-400">{modal.item.code}</p>
            <div className="grid grid-cols-2 gap-4">
              {config.showPax && (
                <div>
                  <p className="text-xs text-slate-400">Pax</p>
                  <p className="font-medium text-brand-900">{modal.item.pax || "—"}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-slate-400">Base Price</p>
                <p className="font-medium text-brand-900">{formatPeso(modal.item.basePrice)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Group</p>
                <p className="font-medium text-brand-900">{modal.item.group}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Branch</p>
                <p className="font-medium text-brand-900">{modal.item.branch}</p>
              </div>
            </div>
            {modal.item.inclusions.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs text-slate-400">Inclusions</p>
                <ul className="space-y-1">
                  {modal.item.inclusions.map((inc) => (
                    <li key={inc} className="flex items-center gap-2 text-slate-600">
                      <span className="h-1 w-1 shrink-0 rounded-full bg-brand-400" />
                      {inc}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {(modal?.mode === "add" || modal?.mode === "edit") && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveForm();
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-3">
              <label className="col-span-2 text-sm">
                <span className={labelClass}>Name</span>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} />
              </label>
              <label className="text-sm">
                <span className={labelClass}>Code</span>
                <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="auto" className={inputClass} />
              </label>
              {config.showPax && (
                <label className="text-sm">
                  <span className={labelClass}>Pax</span>
                  <input value={form.pax} onChange={(e) => setForm({ ...form, pax: e.target.value })} placeholder="e.g. 15 pax" className={inputClass} />
                </label>
              )}
              <label className="text-sm">
                <span className={labelClass}>Base Price (₱)</span>
                <input required type="number" min="0" value={form.basePrice} onChange={(e) => setForm({ ...form, basePrice: e.target.value })} className={inputClass} />
              </label>
              <label className="text-sm">
                <span className={labelClass}>Group</span>
                <select value={form.group} onChange={(e) => setForm({ ...form, group: e.target.value })} className={inputClass}>
                  {config.groups.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                <span className={labelClass}>Branch</span>
                <select value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })} className={inputClass}>
                  {BRANCH_OPTIONS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </label>
              {config.showPax && (
                <label className="col-span-2 text-sm">
                  <span className={labelClass}>Inclusions (comma separated)</span>
                  <textarea value={form.inclusions} onChange={(e) => setForm({ ...form, inclusions: e.target.value })} rows={2} className={inputClass} />
                </label>
              )}
              <label className="col-span-2 flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-brand-700 focus:ring-brand-500"
                />
                Active
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={closeModal} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-gray-100">
                Cancel
              </button>
              <button type="submit" className="rounded-lg bg-gold-500 px-4 py-2 text-sm font-semibold text-white hover:bg-gold-600">
                {modal?.mode === "edit" ? "Save Changes" : "Add"}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
