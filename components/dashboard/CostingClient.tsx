"use client";

import { useMemo, useState, type FormEvent } from "react";
import { AlertCircle, CheckCircle2, FileText, Percent, Plus, Trash2 } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import Badge, { BadgeTone } from "@/components/ui/Badge";
import DataTable, { Column } from "@/components/ui/DataTable";
import Modal from "@/components/ui/Modal";
import ScrollX from "@/components/ui/ScrollX";
import { formatPeso } from "@/lib/format";
import { createIngredientAction } from "@/app/dashboard/inventory/actions";
import { addRecipeItemAction, createRecipeAction, deleteRecipeAction, removeRecipeItemAction, updateRecipeAction } from "@/app/dashboard/costing/actions";
import { cogs, grossMargin, grossMarginPct, ingredientCost, type NewRecipe, type RecipeWithItems } from "@/lib/costing/types";
import type { Ingredient } from "@/lib/inventory/types";
import type { StockMovement } from "@/lib/inventory/types";

const TABS = ["Recipes", "Margins", "Price History", "Packaging", "Reports"] as const;
type Tab = (typeof TABS)[number];

const EMPTY_RECIPE: NewRecipe = { name: "", size: "", category: "", srp: 0, laborCost: 0, overheadCost: 0 };
const EMPTY_INGREDIENT_DRAFT = { name: "", category: "", baseUnit: "pc", unitCost: 0 };

function marginTone(pct: number): BadgeTone {
  if (pct >= 35) return "green";
  if (pct >= 15) return "amber";
  return "red";
}

export default function CostingClient({
  recipes: initialRecipes,
  ingredients: initialIngredients,
  priceHistory,
}: {
  recipes: RecipeWithItems[];
  ingredients: Ingredient[];
  priceHistory: StockMovement[];
}) {
  const [tab, setTab] = useState<Tab>("Recipes");
  const [recipes, setRecipes] = useState(initialRecipes);
  const [ingredients, setIngredients] = useState(initialIngredients);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");

  const [addModal, setAddModal] = useState(false);
  const [addDraft, setAddDraft] = useState<NewRecipe>(EMPTY_RECIPE);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [useExisting, setUseExisting] = useState(true);
  const [itemDraft, setItemDraft] = useState({ ingredientId: "", qty: 0 });
  const [newIngredientDraft, setNewIngredientDraft] = useState(EMPTY_INGREDIENT_DRAFT);

  const [packagingModal, setPackagingModal] = useState(false);
  const [packagingDraft, setPackagingDraft] = useState(EMPTY_INGREDIENT_DRAFT);

  const detailRecipe = recipes.find((r) => r.id === detailId) ?? null;

  const categories = useMemo(() => ["All", ...Array.from(new Set(recipes.map((r) => r.category).filter(Boolean)))], [recipes]);

  const filteredRecipes = useMemo(() => {
    return recipes.filter((r) => {
      if (categoryFilter !== "All" && r.category !== categoryFilter) return false;
      if (search.trim() && !r.name.toLowerCase().includes(search.trim().toLowerCase())) return false;
      return true;
    });
  }, [recipes, categoryFilter, search]);

  const stats = useMemo(() => {
    const costed = recipes.filter((r) => r.items.length > 0);
    const incomplete = recipes.length - costed.length;
    const avgMargin = costed.length > 0 ? costed.reduce((sum, r) => sum + grossMarginPct(r), 0) / costed.length : 0;
    return { total: recipes.length, costed: costed.length, incomplete, avgMargin };
  }, [recipes]);

  async function handleAddRecipe(e: FormEvent) {
    e.preventDefault();
    if (!addDraft.name.trim()) return;
    setSaving(true);
    try {
      const created = await createRecipeAction(addDraft);
      const withItems: RecipeWithItems = { ...created, items: [] };
      setRecipes((cur) => [...cur, withItems].sort((a, b) => a.name.localeCompare(b.name)));
      setAddModal(false);
      setAddDraft(EMPTY_RECIPE);
      setDetailId(created.id);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteRecipe(id: string) {
    const prior = recipes;
    setRecipes((cur) => cur.filter((r) => r.id !== id));
    if (detailId === id) setDetailId(null);
    try {
      await deleteRecipeAction(id);
    } catch {
      setRecipes(prior);
    }
  }

  async function saveRecipeFields(patch: Partial<NewRecipe>) {
    if (!detailRecipe) return;
    const updated = await updateRecipeAction(detailRecipe.id, patch);
    setRecipes((cur) => cur.map((r) => (r.id === detailRecipe.id ? { ...r, ...updated } : r)));
  }

  async function handleAddItem(e: FormEvent) {
    e.preventDefault();
    if (!detailRecipe || itemDraft.qty <= 0) return;
    setSaving(true);
    try {
      let ingredientId = itemDraft.ingredientId;
      let unitCost: number;

      if (useExisting) {
        const ing = ingredients.find((i) => i.id === ingredientId);
        if (!ing) return;
        unitCost = ing.unitCost;
      } else {
        if (!newIngredientDraft.name.trim()) return;
        const created = await createIngredientAction({
          name: newIngredientDraft.name,
          category: newIngredientDraft.category || "Uncategorized",
          purchaseUnit: newIngredientDraft.baseUnit,
          purchaseQty: 1,
          baseUnit: newIngredientDraft.baseUnit,
          unitCost: newIngredientDraft.unitCost,
          reorderLevel: 0,
          supplierId: null,
        });
        setIngredients((cur) => [...cur, created].sort((a, b) => a.name.localeCompare(b.name)));
        ingredientId = created.id;
        unitCost = created.unitCost;
      }

      const item = await addRecipeItemAction({ recipeId: detailRecipe.id, ingredientId, qty: itemDraft.qty, unitCost });
      setRecipes((cur) => cur.map((r) => (r.id === detailRecipe.id ? { ...r, items: [...r.items, item] } : r)));
      setItemDraft({ ingredientId: "", qty: 0 });
      setNewIngredientDraft(EMPTY_INGREDIENT_DRAFT);
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveItem(itemId: string) {
    if (!detailRecipe) return;
    const prior = detailRecipe.items;
    setRecipes((cur) => cur.map((r) => (r.id === detailRecipe.id ? { ...r, items: r.items.filter((i) => i.id !== itemId) } : r)));
    try {
      await removeRecipeItemAction(itemId);
    } catch {
      setRecipes((cur) => cur.map((r) => (r.id === detailRecipe.id ? { ...r, items: prior } : r)));
    }
  }

  async function handleAddPackaging(e: FormEvent) {
    e.preventDefault();
    if (!packagingDraft.name.trim()) return;
    setSaving(true);
    try {
      const created = await createIngredientAction({
        name: packagingDraft.name,
        category: "Packaging",
        purchaseUnit: packagingDraft.baseUnit,
        purchaseQty: 1,
        baseUnit: packagingDraft.baseUnit,
        unitCost: packagingDraft.unitCost,
        reorderLevel: 0,
        supplierId: null,
      });
      setIngredients((cur) => [...cur, created].sort((a, b) => a.name.localeCompare(b.name)));
      setPackagingModal(false);
      setPackagingDraft(EMPTY_INGREDIENT_DRAFT);
    } finally {
      setSaving(false);
    }
  }

  const recipeColumns: Column<RecipeWithItems>[] = [
    { key: "name", header: "Dish", render: (r) => (
      <button onClick={() => setDetailId(r.id)} className="font-medium text-brand-900 hover:text-gold-600">{r.name}</button>
    ) },
    { key: "size", header: "Size", render: (r) => r.size || "—" },
    { key: "category", header: "Category" },
    { key: "items", header: "# Ingr.", render: (r) => r.items.length },
    { key: "cogs", header: "COGS (₱)", render: (r) => formatPeso(cogs(r)) },
    { key: "srp", header: "SRP (₱)", render: (r) => formatPeso(r.srp) },
    { key: "margin", header: "Margin", render: (r) => <Badge label={`${grossMarginPct(r).toFixed(1)}%`} tone={marginTone(grossMarginPct(r))} /> },
    { key: "status", header: "Status", render: (r) => r.items.length > 0 ? <Badge label="Costed" tone="green" /> : <Badge label="Incomplete" tone="amber" /> },
    { key: "actions", header: "", render: (r) => (
      <button onClick={() => handleDeleteRecipe(r.id)} className="text-gray-400 hover:text-red-500" aria-label="Delete recipe"><Trash2 size={14} /></button>
    ) },
  ];

  const marginColumns: Column<RecipeWithItems>[] = [
    { key: "name", header: "Dish", render: (r) => <span className="font-medium text-brand-900">{r.name}</span> },
    { key: "category", header: "Category" },
    { key: "cogs", header: "COGS", render: (r) => formatPeso(cogs(r)) },
    { key: "srp", header: "SRP", render: (r) => formatPeso(r.srp) },
    { key: "margin", header: "Gross Margin", render: (r) => formatPeso(grossMargin(r)) },
    { key: "marginPct", header: "Margin %", render: (r) => <Badge label={`${grossMarginPct(r).toFixed(1)}%`} tone={marginTone(grossMarginPct(r))} /> },
  ];

  const receipts = useMemo(() => priceHistory.filter((m) => m.type === "Receive").sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [priceHistory]);

  const priceHistoryColumns: Column<StockMovement>[] = [
    { key: "createdAt", header: "Date", render: (r) => new Date(r.createdAt).toLocaleDateString("en-PH", { dateStyle: "medium" }) },
    { key: "ingredientName", header: "Ingredient", render: (r) => <span className="font-medium text-brand-900">{r.ingredientName}</span> },
    { key: "qty", header: "Qty Received", render: (r) => r.qty },
    { key: "unitCost", header: "Cost / Unit", render: (r) => (r.unitCost != null ? formatPeso(r.unitCost, { cents: true }) : "—") },
    { key: "reference", header: "Reference", render: (r) => r.reference || "—" },
  ];

  const packagingItems = useMemo(() => ingredients.filter((i) => i.category.toLowerCase() === "packaging"), [ingredients]);

  const packagingColumns: Column<Ingredient>[] = [
    { key: "name", header: "Item", render: (r) => <span className="font-medium text-brand-900">{r.name}</span> },
    { key: "conversion", header: "Purchase → Base", render: (r) => `1 ${r.purchaseUnit} = ${r.purchaseQty} ${r.baseUnit}` },
    { key: "unitCost", header: "Cost / Unit", render: (r) => `${formatPeso(r.unitCost, { cents: true })}/${r.baseUnit}` },
    { key: "reorderLevel", header: "Reorder Level", render: (r) => `${r.reorderLevel} ${r.baseUnit}` },
  ];

  const reportStats = useMemo(() => {
    const costed = recipes.filter((r) => r.items.length > 0);
    const totalCogs = costed.reduce((sum, r) => sum + cogs(r), 0);
    const sorted = [...costed].sort((a, b) => grossMarginPct(b) - grossMarginPct(a));
    const byCategory = new Map<string, { count: number; marginSum: number }>();
    for (const r of costed) {
      const cur = byCategory.get(r.category) ?? { count: 0, marginSum: 0 };
      byCategory.set(r.category, { count: cur.count + 1, marginSum: cur.marginSum + grossMarginPct(r) });
    }
    return {
      totalCogs,
      avgCogs: costed.length > 0 ? totalCogs / costed.length : 0,
      best: sorted[0] ?? null,
      worst: sorted[sorted.length - 1] ?? null,
      categoryRows: Array.from(byCategory.entries()).map(([category, v]) => ({ category, count: v.count, avgMargin: v.marginSum / v.count })),
    };
  }, [recipes]);

  return (
    <div>
      <PageHeader title="Costing" subtitle="Recipe costing, dish margins, ingredient price tracking and packaging costs." />

      <div className="mb-6 flex gap-1 border-b border-gray-200">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${tab === t ? "border-gold-500 text-brand-900" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === "Recipes" && (
        <div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Total Recipes" value={stats.total} icon={<FileText size={18} className="text-gold-600" />} />
            <StatCard label="Costed" value={stats.costed} icon={<CheckCircle2 size={18} className="text-emerald-500" />} />
            <StatCard label="Incomplete" value={stats.incomplete} sub="Missing ingredient data" icon={<AlertCircle size={18} className="text-amber-500" />} />
            <StatCard label="Avg Gross Margin" value={`${stats.avgMargin.toFixed(1)}%`} icon={<Percent size={18} className="text-gold-600" />} />
          </div>

          <div className="mt-6 mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search dish…"
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-brand-900 outline-none focus:border-gold-400"
              />
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm text-brand-900 outline-none focus:border-gold-400">
                {categories.map((c) => (
                  <option key={c} value={c}>{c === "All" ? "All Categories" : c}</option>
                ))}
              </select>
            </div>
            <button onClick={() => setAddModal(true)} className="flex items-center gap-1.5 rounded-lg bg-gold-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gold-600">
              <Plus size={14} /> Add Recipe
            </button>
          </div>

          {filteredRecipes.length === 0 ? (
            <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-400">No recipes found.</div>
          ) : (
            <ScrollX>
              <DataTable columns={recipeColumns} rows={filteredRecipes} />
            </ScrollX>
          )}
        </div>
      )}

      {tab === "Margins" && (
        <ScrollX>
          <DataTable columns={marginColumns} rows={[...recipes].sort((a, b) => grossMarginPct(a) - grossMarginPct(b))} />
        </ScrollX>
      )}

      {tab === "Price History" && (
        receipts.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-400">No stock receipts yet. Receive stock in Inventory to build price history.</div>
        ) : (
          <ScrollX>
            <DataTable columns={priceHistoryColumns} rows={receipts} />
          </ScrollX>
        )
      )}

      {tab === "Packaging" && (
        <div>
          <div className="mb-4 flex justify-end">
            <button onClick={() => setPackagingModal(true)} className="flex items-center gap-1.5 rounded-lg bg-gold-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gold-600">
              <Plus size={14} /> Add Packaging Item
            </button>
          </div>
          {packagingItems.length === 0 ? (
            <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-400">No packaging items yet.</div>
          ) : (
            <ScrollX>
              <DataTable columns={packagingColumns} rows={packagingItems} />
            </ScrollX>
          )}
        </div>
      )}

      {tab === "Reports" && (
        <div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Total COGS (Costed Dishes)" value={reportStats.totalCogs} format="money" icon={<FileText size={18} className="text-gold-600" />} />
            <StatCard label="Avg COGS / Dish" value={reportStats.avgCogs} format="money" icon={<FileText size={18} className="text-gold-600" />} />
            <StatCard label="Best Margin" value={reportStats.best ? `${grossMarginPct(reportStats.best).toFixed(1)}%` : "—"} sub={reportStats.best?.name} icon={<Percent size={18} className="text-emerald-500" />} valueColor="text-emerald-600" />
            <StatCard label="Lowest Margin" value={reportStats.worst ? `${grossMarginPct(reportStats.worst).toFixed(1)}%` : "—"} sub={reportStats.worst?.name} icon={<Percent size={18} className="text-red-500" />} valueColor="text-red-500" />
          </div>
          <div className="mt-6 rounded-lg border border-gray-200 bg-white p-5">
            <h2 className="mb-4 font-display text-base font-semibold text-brand-900">Margin by Category</h2>
            {reportStats.categoryRows.length === 0 ? (
              <p className="text-sm text-gray-400">No costed recipes yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-xs uppercase text-gray-500">
                    <th className="pb-2 text-left font-medium">Category</th>
                    <th className="pb-2 text-right font-medium"># Recipes</th>
                    <th className="pb-2 text-right font-medium">Avg Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {reportStats.categoryRows.map((row) => (
                    <tr key={row.category}>
                      <td className="py-2 font-medium text-brand-900">{row.category}</td>
                      <td className="py-2 text-right text-gray-600">{row.count}</td>
                      <td className="py-2 text-right"><Badge label={`${row.avgMargin.toFixed(1)}%`} tone={marginTone(row.avgMargin)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Add Recipe */}
      <Modal isOpen={addModal} onClose={() => setAddModal(false)} title="Add Recipe" size="md">
        <form onSubmit={handleAddRecipe} className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-500">Dish Name</span>
            <input required value={addDraft.name} onChange={(e) => setAddDraft((d) => ({ ...d, name: e.target.value }))} className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-brand-900 outline-none focus:border-gold-400" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">Size</span>
              <input value={addDraft.size} onChange={(e) => setAddDraft((d) => ({ ...d, size: e.target.value }))} placeholder="e.g. Family" className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-brand-900 outline-none focus:border-gold-400" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">Category</span>
              <input value={addDraft.category} onChange={(e) => setAddDraft((d) => ({ ...d, category: e.target.value }))} className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-brand-900 outline-none focus:border-gold-400" />
            </label>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">SRP (₱)</span>
              <input type="number" min={0} step="any" value={addDraft.srp} onChange={(e) => setAddDraft((d) => ({ ...d, srp: Number(e.target.value) || 0 }))} className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-brand-900 outline-none focus:border-gold-400" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">Labor (₱)</span>
              <input type="number" min={0} step="any" value={addDraft.laborCost} onChange={(e) => setAddDraft((d) => ({ ...d, laborCost: Number(e.target.value) || 0 }))} className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-brand-900 outline-none focus:border-gold-400" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">Overhead (₱)</span>
              <input type="number" min={0} step="any" value={addDraft.overheadCost} onChange={(e) => setAddDraft((d) => ({ ...d, overheadCost: Number(e.target.value) || 0 }))} className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-brand-900 outline-none focus:border-gold-400" />
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setAddModal(false)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving} className="rounded-lg bg-gold-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gold-600 disabled:opacity-40">{saving ? "Adding…" : "Add & Cost Recipe"}</button>
          </div>
        </form>
      </Modal>

      {/* Recipe Detail / BOM Editor */}
      <Modal isOpen={detailRecipe !== null} onClose={() => setDetailId(null)} title={detailRecipe ? `${detailRecipe.name}${detailRecipe.size ? ` — ${detailRecipe.size}` : ""}` : ""} size="2xl">
        {detailRecipe && (
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-3">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-gray-500">SRP (₱)</span>
                <input type="number" min={0} step="any" defaultValue={detailRecipe.srp} onBlur={(e) => saveRecipeFields({ srp: Number(e.target.value) || 0 })} className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-brand-900 outline-none focus:border-gold-400" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-gray-500">Labor (₱)</span>
                <input type="number" min={0} step="any" defaultValue={detailRecipe.laborCost} onBlur={(e) => saveRecipeFields({ laborCost: Number(e.target.value) || 0 })} className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-brand-900 outline-none focus:border-gold-400" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-gray-500">Overhead (₱)</span>
                <input type="number" min={0} step="any" defaultValue={detailRecipe.overheadCost} onBlur={(e) => saveRecipeFields({ overheadCost: Number(e.target.value) || 0 })} className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-brand-900 outline-none focus:border-gold-400" />
              </label>
            </div>

            <div className="rounded-lg border border-gray-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-xs uppercase text-gray-500">
                    <th className="px-3 py-2 text-left font-medium">Ingredient</th>
                    <th className="px-3 py-2 text-right font-medium">Qty</th>
                    <th className="px-3 py-2 text-right font-medium">Cost/Unit</th>
                    <th className="px-3 py-2 text-right font-medium">Line Cost</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {detailRecipe.items.length === 0 && (
                    <tr><td colSpan={5} className="px-3 py-4 text-center text-gray-400">No ingredients added yet.</td></tr>
                  )}
                  {detailRecipe.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-3 py-2 font-medium text-brand-900">{item.ingredientName}</td>
                      <td className="px-3 py-2 text-right">{item.qty} {item.unit}</td>
                      <td className="px-3 py-2 text-right">{formatPeso(item.unitCost, { cents: true })}</td>
                      <td className="px-3 py-2 text-right">{formatPeso(item.qty * item.unitCost, { cents: true })}</td>
                      <td className="px-3 py-2 text-right">
                        <button onClick={() => handleRemoveItem(item.id)} className="text-gray-400 hover:text-red-500" aria-label="Remove ingredient"><Trash2 size={13} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <form onSubmit={handleAddItem} className="rounded-lg border border-dashed border-gray-200 p-3">
              <div className="mb-2 flex gap-2 text-xs">
                <button type="button" onClick={() => setUseExisting(true)} className={`rounded px-2 py-1 font-medium ${useExisting ? "bg-brand-900 text-white" : "bg-gray-100 text-gray-500"}`}>Existing Ingredient</button>
                <button type="button" onClick={() => setUseExisting(false)} className={`rounded px-2 py-1 font-medium ${!useExisting ? "bg-brand-900 text-white" : "bg-gray-100 text-gray-500"}`}>New Ingredient</button>
              </div>
              <div className="flex flex-wrap items-end gap-2">
                {useExisting ? (
                  <select value={itemDraft.ingredientId} onChange={(e) => setItemDraft((d) => ({ ...d, ingredientId: e.target.value }))} className="min-w-[10rem] flex-1 rounded-lg border border-gray-200 bg-white px-2 py-2 text-sm text-brand-900 outline-none focus:border-gold-400">
                    <option value="">Select ingredient…</option>
                    {ingredients.map((i) => (
                      <option key={i.id} value={i.id}>{i.name} ({formatPeso(i.unitCost, { cents: true })}/{i.baseUnit})</option>
                    ))}
                  </select>
                ) : (
                  <>
                    <input placeholder="Name" value={newIngredientDraft.name} onChange={(e) => setNewIngredientDraft((d) => ({ ...d, name: e.target.value }))} className="w-28 rounded-lg border border-gray-200 bg-white px-2 py-2 text-sm text-brand-900 outline-none focus:border-gold-400" />
                    <input placeholder="Unit (kg, pc…)" value={newIngredientDraft.baseUnit} onChange={(e) => setNewIngredientDraft((d) => ({ ...d, baseUnit: e.target.value }))} className="w-24 rounded-lg border border-gray-200 bg-white px-2 py-2 text-sm text-brand-900 outline-none focus:border-gold-400" />
                    <input type="number" min={0} step="any" placeholder="₱/unit" value={newIngredientDraft.unitCost} onChange={(e) => setNewIngredientDraft((d) => ({ ...d, unitCost: Number(e.target.value) || 0 }))} className="w-20 rounded-lg border border-gray-200 bg-white px-2 py-2 text-sm text-brand-900 outline-none focus:border-gold-400" />
                  </>
                )}
                <input type="number" min={0} step="any" required placeholder="Qty" value={itemDraft.qty || ""} onChange={(e) => setItemDraft((d) => ({ ...d, qty: Number(e.target.value) || 0 }))} className="w-20 rounded-lg border border-gray-200 bg-white px-2 py-2 text-sm text-brand-900 outline-none focus:border-gold-400" />
                <button type="submit" disabled={saving} className="rounded-lg bg-gold-500 px-3 py-2 text-xs font-semibold text-white hover:bg-gold-600 disabled:opacity-40">Add</button>
              </div>
            </form>

            <div className="flex items-center justify-between rounded-lg bg-brand-950 px-4 py-3 text-sm text-brand-100">
              <span>Ingredients {formatPeso(ingredientCost(detailRecipe))} · COGS {formatPeso(cogs(detailRecipe))}</span>
              <span className="font-semibold text-gold-400">Margin {formatPeso(grossMargin(detailRecipe))} ({grossMarginPct(detailRecipe).toFixed(1)}%)</span>
            </div>
          </div>
        )}
      </Modal>

      {/* Add Packaging Item */}
      <Modal isOpen={packagingModal} onClose={() => setPackagingModal(false)} title="Add Packaging Item" size="sm">
        <form onSubmit={handleAddPackaging} className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-500">Name</span>
            <input required value={packagingDraft.name} onChange={(e) => setPackagingDraft((d) => ({ ...d, name: e.target.value }))} className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-brand-900 outline-none focus:border-gold-400" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">Unit</span>
              <input value={packagingDraft.baseUnit} onChange={(e) => setPackagingDraft((d) => ({ ...d, baseUnit: e.target.value }))} placeholder="pc" className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-brand-900 outline-none focus:border-gold-400" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">Cost / Unit (₱)</span>
              <input type="number" min={0} step="any" value={packagingDraft.unitCost} onChange={(e) => setPackagingDraft((d) => ({ ...d, unitCost: Number(e.target.value) || 0 }))} className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-brand-900 outline-none focus:border-gold-400" />
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setPackagingModal(false)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving} className="rounded-lg bg-gold-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gold-600 disabled:opacity-40">{saving ? "Adding…" : "Add Item"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
