"use client";

import { useMemo, useState, type FormEvent } from "react";
import { AlertTriangle, Boxes, Package, Plus, Trash2, TrendingDown } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import Badge, { BadgeTone } from "@/components/ui/Badge";
import DataTable, { Column } from "@/components/ui/DataTable";
import Modal from "@/components/ui/Modal";
import ScrollX from "@/components/ui/ScrollX";
import { useBranch } from "@/components/providers/BranchProvider";
import { ALL_BRANCHES, BRANCHES } from "@/lib/mt/branches";
import { formatPeso } from "@/lib/format";
import {
  createIngredientAction,
  createSupplierAction,
  deleteIngredientAction,
  deleteSupplierAction,
  receiveStockAction,
  recordMovementAction,
} from "@/app/dashboard/inventory/actions";
import { MOVEMENT_TYPES } from "@/lib/inventory/types";
import type {
  IngredientWithStock,
  MovementType,
  NewIngredient,
  NewSupplier,
  StockMovement,
  Supplier,
} from "@/lib/inventory/types";

const TABS = ["Overview", "Ingredients", "Stock", "Movements", "Suppliers"] as const;
type Tab = (typeof TABS)[number];

const EMPTY_INGREDIENT: NewIngredient = {
  name: "",
  category: "",
  purchaseUnit: "pc",
  purchaseQty: 1,
  baseUnit: "pc",
  unitCost: 0,
  reorderLevel: 0,
  supplierId: null,
};

const EMPTY_SUPPLIER: NewSupplier = {
  name: "",
  contactPerson: "",
  phone: "",
  email: "",
  category: "",
  notes: "",
};

function branchLabel(id: string): string {
  return BRANCHES.find((b) => b.id === id)?.name ?? id;
}

function fmtQty(n: number, unit: string): string {
  return `${Number(n.toFixed(2)).toLocaleString("en-PH")} ${unit}`;
}

export default function InventoryClient({
  ingredients: initialIngredients,
  suppliers: initialSuppliers,
  movements: initialMovements,
}: {
  ingredients: IngredientWithStock[];
  suppliers: Supplier[];
  movements: StockMovement[];
}) {
  const { selectedBranch } = useBranch();
  const [tab, setTab] = useState<Tab>("Overview");
  const [ingredients, setIngredients] = useState(initialIngredients);
  const [suppliers, setSuppliers] = useState(initialSuppliers);
  const [movements, setMovements] = useState(initialMovements);

  const [ingredientModal, setIngredientModal] = useState(false);
  const [ingredientDraft, setIngredientDraft] = useState<NewIngredient>(EMPTY_INGREDIENT);
  const [supplierModal, setSupplierModal] = useState(false);
  const [supplierDraft, setSupplierDraft] = useState<NewSupplier>(EMPTY_SUPPLIER);
  const [receiveModal, setReceiveModal] = useState<IngredientWithStock | null>(null);
  const [receiveDraft, setReceiveDraft] = useState({ branch: BRANCHES[0].id, qty: 0, unitCost: 0, reference: "" });
  const [movementModal, setMovementModal] = useState<IngredientWithStock | null>(null);
  const [movementDraft, setMovementDraft] = useState({ branch: BRANCHES[0].id, type: "Usage" as MovementType, qty: 0, reference: "" });
  const [saving, setSaving] = useState(false);

  const branchMatch = selectedBranch === ALL_BRANCHES ? null : BRANCHES.find((b) => b.name === selectedBranch);

  function stockFor(ing: IngredientWithStock): number {
    return branchMatch ? (ing.stockByBranch[branchMatch.id] ?? 0) : ing.totalStock;
  }

  const stats = useMemo(() => {
    const totalSkus = ingredients.length;
    const reorderItems = ingredients.filter((i) => stockFor(i) <= i.reorderLevel).length;
    const outOfStock = ingredients.filter((i) => stockFor(i) <= 0).length;
    const stockValue = ingredients.reduce((sum, i) => sum + stockFor(i) * i.unitCost, 0);
    return { totalSkus, reorderItems, outOfStock, stockValue };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ingredients, branchMatch]);

  const scopedMovements = branchMatch ? movements.filter((m) => m.branch === branchMatch.id) : movements;

  async function handleCreateIngredient(e: FormEvent) {
    e.preventDefault();
    if (!ingredientDraft.name.trim()) return;
    setSaving(true);
    try {
      const created = await createIngredientAction(ingredientDraft);
      setIngredients((cur) => [...cur, { ...created, stockByBranch: {}, totalStock: 0 }].sort((a, b) => a.name.localeCompare(b.name)));
      setIngredientModal(false);
      setIngredientDraft(EMPTY_INGREDIENT);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteIngredient(id: string) {
    const prior = ingredients;
    setIngredients((cur) => cur.filter((i) => i.id !== id));
    try {
      await deleteIngredientAction(id);
    } catch {
      setIngredients(prior);
    }
  }

  async function handleCreateSupplier(e: FormEvent) {
    e.preventDefault();
    if (!supplierDraft.name.trim()) return;
    setSaving(true);
    try {
      const created = await createSupplierAction(supplierDraft);
      setSuppliers((cur) => [...cur, created].sort((a, b) => a.name.localeCompare(b.name)));
      setSupplierModal(false);
      setSupplierDraft(EMPTY_SUPPLIER);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteSupplier(id: string) {
    const prior = suppliers;
    setSuppliers((cur) => cur.filter((s) => s.id !== id));
    try {
      await deleteSupplierAction(id);
    } catch {
      setSuppliers(prior);
    }
  }

  function openReceive(ing: IngredientWithStock) {
    setReceiveDraft({ branch: branchMatch?.id ?? BRANCHES[0].id, qty: 0, unitCost: ing.unitCost, reference: "" });
    setReceiveModal(ing);
  }

  async function handleReceive(e: FormEvent) {
    e.preventDefault();
    if (!receiveModal || receiveDraft.qty <= 0) return;
    setSaving(true);
    try {
      const { newUnitCost, newQty, movement } = await receiveStockAction({
        ingredientId: receiveModal.id,
        branch: receiveDraft.branch,
        qty: receiveDraft.qty,
        unitCost: receiveDraft.unitCost,
        reference: receiveDraft.reference,
      });
      setIngredients((cur) =>
        cur.map((i) =>
          i.id === receiveModal.id
            ? { ...i, unitCost: newUnitCost, stockByBranch: { ...i.stockByBranch, [receiveDraft.branch]: newQty }, totalStock: i.totalStock - (i.stockByBranch[receiveDraft.branch] ?? 0) + newQty }
            : i,
        ),
      );
      setMovements((cur) => [movement, ...cur]);
      setReceiveModal(null);
    } finally {
      setSaving(false);
    }
  }

  function openMovement(ing: IngredientWithStock) {
    setMovementDraft({ branch: branchMatch?.id ?? BRANCHES[0].id, type: "Usage", qty: 0, reference: "" });
    setMovementModal(ing);
  }

  async function handleMovement(e: FormEvent) {
    e.preventDefault();
    if (!movementModal || movementDraft.qty <= 0) return;
    setSaving(true);
    const signedQty = movementDraft.type === "Adjustment" ? movementDraft.qty : -Math.abs(movementDraft.qty);
    try {
      const { newQty, movement } = await recordMovementAction({
        ingredientId: movementModal.id,
        branch: movementDraft.branch,
        type: movementDraft.type,
        qty: signedQty,
        unitCost: null,
        reference: movementDraft.reference,
      });
      setIngredients((cur) =>
        cur.map((i) =>
          i.id === movementModal.id
            ? { ...i, stockByBranch: { ...i.stockByBranch, [movementDraft.branch]: newQty }, totalStock: i.totalStock - (i.stockByBranch[movementDraft.branch] ?? 0) + newQty }
            : i,
        ),
      );
      setMovements((cur) => [movement, ...cur]);
      setMovementModal(null);
    } finally {
      setSaving(false);
    }
  }

  const ingredientColumns: Column<IngredientWithStock>[] = [
    { key: "name", header: "Ingredient", render: (r) => <span className="font-medium text-brand-900">{r.name}</span> },
    { key: "category", header: "Category" },
    { key: "conversion", header: "Purchase → Base", render: (r) => `1 ${r.purchaseUnit} = ${r.purchaseQty} ${r.baseUnit}` },
    { key: "unitCost", header: `Cost / ${"unit"}`, render: (r) => `${formatPeso(r.unitCost, { cents: true })}/${r.baseUnit}` },
    { key: "reorderLevel", header: "Reorder Level", render: (r) => fmtQty(r.reorderLevel, r.baseUnit) },
    { key: "supplier", header: "Supplier", render: (r) => suppliers.find((s) => s.id === r.supplierId)?.name ?? "—" },
    {
      key: "actions",
      header: "",
      render: (r) => (
        <button onClick={() => handleDeleteIngredient(r.id)} className="text-gray-400 hover:text-red-500" aria-label="Delete ingredient">
          <Trash2 size={14} />
        </button>
      ),
    },
  ];

  const stockColumns: Column<IngredientWithStock>[] = [
    { key: "name", header: "Item", render: (r) => <span className="font-medium text-brand-900">{r.name}</span> },
    { key: "category", header: "Category" },
    { key: "stock", header: "In Stock", render: (r) => fmtQty(stockFor(r), r.baseUnit) },
    { key: "reorderLevel", header: "Reorder Level", render: (r) => fmtQty(r.reorderLevel, r.baseUnit) },
    {
      key: "status",
      header: "Status",
      render: (r) => {
        const qty = stockFor(r);
        if (qty <= 0) return <Badge label="Out of Stock" tone="red" />;
        if (qty <= r.reorderLevel) return <Badge label="Low Stock" tone="amber" />;
        return <Badge label="In Stock" tone="green" />;
      },
    },
    {
      key: "actions",
      header: "",
      render: (r) => (
        <div className="flex items-center gap-3">
          <button onClick={() => openReceive(r)} className="text-xs font-medium text-gold-600 hover:text-gold-700">
            Receive
          </button>
          <button onClick={() => openMovement(r)} className="text-xs font-medium text-gray-500 hover:text-gray-700">
            Adjust
          </button>
        </div>
      ),
    },
  ];

  const movementTone: Record<MovementType, BadgeTone> = { Receive: "green", Usage: "blue", Adjustment: "slate", Waste: "red" };

  const movementColumns: Column<StockMovement>[] = [
    { key: "createdAt", header: "Date", render: (r) => new Date(r.createdAt).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" }) },
    { key: "ingredientName", header: "Ingredient", render: (r) => <span className="font-medium text-brand-900">{r.ingredientName}</span> },
    { key: "type", header: "Type", render: (r) => <Badge label={r.type} tone={movementTone[r.type]} /> },
    { key: "qty", header: "Qty", render: (r) => (r.qty > 0 ? `+${r.qty}` : r.qty) },
    { key: "branch", header: "Location", render: (r) => branchLabel(r.branch) },
    { key: "reference", header: "Reference", render: (r) => r.reference || "—" },
  ];

  const supplierColumns: Column<Supplier>[] = [
    { key: "name", header: "Supplier", render: (r) => <span className="font-medium text-brand-900">{r.name}</span> },
    { key: "category", header: "Supplies" },
    { key: "contactPerson", header: "Contact" },
    { key: "phone", header: "Phone" },
    { key: "email", header: "Email" },
    {
      key: "actions",
      header: "",
      render: (r) => (
        <button onClick={() => handleDeleteSupplier(r.id)} className="text-gray-400 hover:text-red-500" aria-label="Delete supplier">
          <Trash2 size={14} />
        </button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Inventory" subtitle="Track stock levels, movements, and suppliers across all branches." />

      <div className="mb-6 flex gap-1 border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
              tab === t ? "border-gold-500 text-brand-900" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Overview" && (
        <div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Total SKUs" value={stats.totalSkus} icon={<Boxes size={18} className="text-gold-600" />} />
            <StatCard label="Reorder Items" value={stats.reorderItems} icon={<AlertTriangle size={18} className="text-amber-500" />} />
            <StatCard label="Out of Stock" value={stats.outOfStock} icon={<Package size={18} className="text-red-500" />} />
            <StatCard label="Stock Value" value={stats.stockValue} format="money" icon={<TrendingDown size={18} className="text-gold-600" />} />
          </div>
          <div className="mt-6 rounded-lg border border-gray-200 bg-white">
            <div className="flex items-center justify-between px-5 py-3">
              <h2 className="font-display text-base font-semibold text-brand-900">Recent Movements</h2>
              <button onClick={() => setTab("Movements")} className="text-xs font-medium text-gold-600 hover:text-gold-700">
                View all →
              </button>
            </div>
            {scopedMovements.length === 0 ? (
              <p className="px-5 pb-5 text-sm text-gray-400">No movements yet. Add ingredients and receive stock to get started.</p>
            ) : (
              <ScrollX>
                <DataTable columns={movementColumns} rows={scopedMovements.slice(0, 8)} />
              </ScrollX>
            )}
          </div>
        </div>
      )}

      {tab === "Ingredients" && (
        <div>
          <div className="mb-4 flex justify-end">
            <button
              onClick={() => setIngredientModal(true)}
              className="flex items-center gap-1.5 rounded-lg bg-gold-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gold-600"
            >
              <Plus size={14} /> Add Ingredient
            </button>
          </div>
          <ScrollX>
            <DataTable columns={ingredientColumns} rows={ingredients} />
          </ScrollX>
        </div>
      )}

      {tab === "Stock" && (
        <ScrollX>
          <DataTable columns={stockColumns} rows={ingredients} />
        </ScrollX>
      )}

      {tab === "Movements" && (
        <ScrollX>
          <DataTable columns={movementColumns} rows={scopedMovements} />
        </ScrollX>
      )}

      {tab === "Suppliers" && (
        <div>
          <div className="mb-4 flex justify-end">
            <button
              onClick={() => setSupplierModal(true)}
              className="flex items-center gap-1.5 rounded-lg bg-gold-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gold-600"
            >
              <Plus size={14} /> Add Supplier
            </button>
          </div>
          <ScrollX>
            <DataTable columns={supplierColumns} rows={suppliers} />
          </ScrollX>
        </div>
      )}

      {/* Add Ingredient */}
      <Modal isOpen={ingredientModal} onClose={() => setIngredientModal(false)} title="Add Ingredient" size="md">
        <form onSubmit={handleCreateIngredient} className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-500">Name</span>
            <input
              required
              value={ingredientDraft.name}
              onChange={(e) => setIngredientDraft((d) => ({ ...d, name: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-brand-900 outline-none focus:border-gold-400"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">Category</span>
              <input
                value={ingredientDraft.category}
                onChange={(e) => setIngredientDraft((d) => ({ ...d, category: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-brand-900 outline-none focus:border-gold-400"
                placeholder="e.g. Dry Goods"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">Supplier</span>
              <select
                value={ingredientDraft.supplierId ?? ""}
                onChange={(e) => setIngredientDraft((d) => ({ ...d, supplierId: e.target.value || null }))}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-2 py-2 text-sm text-brand-900 outline-none focus:border-gold-400"
              >
                <option value="">—</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">Purchase Unit</span>
              <input
                value={ingredientDraft.purchaseUnit}
                onChange={(e) => setIngredientDraft((d) => ({ ...d, purchaseUnit: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-brand-900 outline-none focus:border-gold-400"
                placeholder="sack"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">= Qty</span>
              <input
                type="number"
                min={0}
                step="any"
                value={ingredientDraft.purchaseQty}
                onChange={(e) => setIngredientDraft((d) => ({ ...d, purchaseQty: Number(e.target.value) || 0 }))}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-brand-900 outline-none focus:border-gold-400"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">Base Unit</span>
              <input
                value={ingredientDraft.baseUnit}
                onChange={(e) => setIngredientDraft((d) => ({ ...d, baseUnit: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-brand-900 outline-none focus:border-gold-400"
                placeholder="kg"
              />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">Starting Cost / Base Unit</span>
              <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 px-2.5">
                <span className="text-sm text-gray-400">₱</span>
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={ingredientDraft.unitCost}
                  onChange={(e) => setIngredientDraft((d) => ({ ...d, unitCost: Number(e.target.value) || 0 }))}
                  className="w-full bg-transparent py-2 pl-1.5 text-sm text-brand-900 outline-none"
                />
              </div>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">Reorder Level (base unit)</span>
              <input
                type="number"
                min={0}
                step="any"
                value={ingredientDraft.reorderLevel}
                onChange={(e) => setIngredientDraft((d) => ({ ...d, reorderLevel: Number(e.target.value) || 0 }))}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-brand-900 outline-none focus:border-gold-400"
              />
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setIngredientModal(false)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="rounded-lg bg-gold-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gold-600 disabled:opacity-40">
              {saving ? "Adding…" : "Add Ingredient"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Supplier */}
      <Modal isOpen={supplierModal} onClose={() => setSupplierModal(false)} title="Add Supplier" size="md">
        <form onSubmit={handleCreateSupplier} className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-500">Supplier Name</span>
            <input
              required
              value={supplierDraft.name}
              onChange={(e) => setSupplierDraft((d) => ({ ...d, name: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-brand-900 outline-none focus:border-gold-400"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">Supplies</span>
              <input
                value={supplierDraft.category}
                onChange={(e) => setSupplierDraft((d) => ({ ...d, category: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-brand-900 outline-none focus:border-gold-400"
                placeholder="e.g. Meat & Poultry"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">Contact Person</span>
              <input
                value={supplierDraft.contactPerson}
                onChange={(e) => setSupplierDraft((d) => ({ ...d, contactPerson: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-brand-900 outline-none focus:border-gold-400"
              />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">Phone</span>
              <input
                value={supplierDraft.phone}
                onChange={(e) => setSupplierDraft((d) => ({ ...d, phone: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-brand-900 outline-none focus:border-gold-400"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">Email</span>
              <input
                type="email"
                value={supplierDraft.email}
                onChange={(e) => setSupplierDraft((d) => ({ ...d, email: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-brand-900 outline-none focus:border-gold-400"
              />
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-500">Notes</span>
            <textarea
              value={supplierDraft.notes}
              onChange={(e) => setSupplierDraft((d) => ({ ...d, notes: e.target.value }))}
              rows={2}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-brand-900 outline-none focus:border-gold-400"
            />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setSupplierModal(false)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="rounded-lg bg-gold-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gold-600 disabled:opacity-40">
              {saving ? "Adding…" : "Add Supplier"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Receive Stock */}
      <Modal isOpen={receiveModal !== null} onClose={() => setReceiveModal(null)} title={`Receive Stock — ${receiveModal?.name ?? ""}`} size="sm">
        <form onSubmit={handleReceive} className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-500">Branch</span>
            <select
              value={receiveDraft.branch}
              onChange={(e) => setReceiveDraft((d) => ({ ...d, branch: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-2 py-2 text-sm text-brand-900 outline-none focus:border-gold-400"
            >
              {BRANCHES.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">Qty ({receiveModal?.baseUnit})</span>
              <input
                type="number"
                min={0}
                step="any"
                required
                value={receiveDraft.qty}
                onChange={(e) => setReceiveDraft((d) => ({ ...d, qty: Number(e.target.value) || 0 }))}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-brand-900 outline-none focus:border-gold-400"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">Cost / {receiveModal?.baseUnit}</span>
              <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 px-2.5">
                <span className="text-sm text-gray-400">₱</span>
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={receiveDraft.unitCost}
                  onChange={(e) => setReceiveDraft((d) => ({ ...d, unitCost: Number(e.target.value) || 0 }))}
                  className="w-full bg-transparent py-2 pl-1.5 text-sm text-brand-900 outline-none"
                />
              </div>
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-500">Reference</span>
            <input
              value={receiveDraft.reference}
              onChange={(e) => setReceiveDraft((d) => ({ ...d, reference: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-brand-900 outline-none focus:border-gold-400"
              placeholder="PO number, delivery note…"
            />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setReceiveModal(null)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="rounded-lg bg-gold-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gold-600 disabled:opacity-40">
              {saving ? "Saving…" : "Receive"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Usage / Waste / Adjustment */}
      <Modal isOpen={movementModal !== null} onClose={() => setMovementModal(null)} title={`Adjust Stock — ${movementModal?.name ?? ""}`} size="sm">
        <form onSubmit={handleMovement} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">Branch</span>
              <select
                value={movementDraft.branch}
                onChange={(e) => setMovementDraft((d) => ({ ...d, branch: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-2 py-2 text-sm text-brand-900 outline-none focus:border-gold-400"
              >
                {BRANCHES.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">Type</span>
              <select
                value={movementDraft.type}
                onChange={(e) => setMovementDraft((d) => ({ ...d, type: e.target.value as MovementType }))}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-2 py-2 text-sm text-brand-900 outline-none focus:border-gold-400"
              >
                {MOVEMENT_TYPES.filter((t) => t !== "Receive").map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-500">
              {movementDraft.type === "Adjustment" ? `Qty change (${movementModal?.baseUnit}, use − to subtract)` : `Qty (${movementModal?.baseUnit})`}
            </span>
            <input
              type="number"
              step="any"
              required
              value={movementDraft.qty}
              onChange={(e) => setMovementDraft((d) => ({ ...d, qty: Number(e.target.value) || 0 }))}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-brand-900 outline-none focus:border-gold-400"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-500">Reference / Note</span>
            <input
              value={movementDraft.reference}
              onChange={(e) => setMovementDraft((d) => ({ ...d, reference: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-brand-900 outline-none focus:border-gold-400"
            />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setMovementModal(null)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="rounded-lg bg-gold-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gold-600 disabled:opacity-40">
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
