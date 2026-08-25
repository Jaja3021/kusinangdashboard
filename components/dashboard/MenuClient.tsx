"use client";

import { Fragment, useState, type FormEvent } from "react";
import { Plus, Pencil, Trash2, ListOrdered, ChevronDown } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Modal from "@/components/ui/Modal";
import ScrollX from "@/components/ui/ScrollX";
import DishSlotsModal from "@/components/dashboard/DishSlotsModal";
import MenuBuilderModal from "@/components/dashboard/MenuBuilderModal";
import ComboModal, { type ComboEditing } from "@/components/dashboard/ComboModal";
import { formatPeso } from "@/lib/format";
import {
  createPackageAction,
  updatePackageDetailsAction,
  setPackageActiveAction,
  deletePackageAction,
  savePaxTierAction,
  deletePaxTierAction,
  deleteComboAction,
  saveTrayDishAction,
  deleteTrayDishAction,
  savePackedMealCategoryAction,
  deletePackedMealCategoryAction,
} from "@/app/dashboard/menu/actions";
import type { NewPackageInput, PackageDetailsInput } from "@/lib/menu/data";
import {
  packageCategories,
  packageShape,
  isTrayCartPackage,
  isPackedMealPackage,
  isHeadCountPackage,
  packageBasePriceInfo,
  flattenCombos,
  TRAY_CATEGORIES,
  TRAY_SIZES,
  PACKED_MEAL_CATEGORIES,
  PACKAGE_BRANCHES,
  branchLabel,
  trayDishId,
  packedMealQtyTiers,
  type PackageType,
  type PackageCategory,
  type PackageShape,
  type TrayCategory,
  type TrayDish,
  type PackedMealCategory,
  type ComboRow,
} from "@/lib/menu/types";

type TabKey = "packages" | "grazing" | "catering" | "packed" | "dishes";

const TABS: { key: TabKey; label: string }[] = [
  { key: "packages", label: "Packages" },
  { key: "grazing", label: "Grazing" },
  { key: "catering", label: "Catering" },
  { key: "packed", label: "Packed Meals" },
  { key: "dishes", label: "Dishes" },
];

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-brand-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";
const smallInputClass =
  "w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs text-brand-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";
const labelClass = "mb-1 block text-xs font-medium text-slate-500";
const dangerButtonClass = "text-xs font-semibold text-red-600 hover:underline";
const smallSubmitClass =
  "rounded-lg border border-brand-200 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-50";

function branchesLabel(branch?: string[] | null): string {
  if (!branch || branch.length === 0) return "All branches";
  return branch.map(branchLabel).join(", ");
}

function fd(data: FormData, key: string): string {
  return String(data.get(key) ?? "").trim();
}
function fdNum(data: FormData, key: string): number {
  return Number(data.get(key) ?? 0);
}
function fdLines(data: FormData, key: string): string[] {
  return fd(data, key)
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}
function fdBranches(data: FormData): string[] | null {
  const value = fd(data, "branch");
  return value ? [value] : null;
}

export default function MenuClient({ packages: initialPackages }: { packages: PackageType[] }) {
  const [packages, setPackages] = useState<PackageType[]>(initialPackages);
  const [tab, setTab] = useState<TabKey>("packages");
  const [saving, setSaving] = useState(false);
  const [packageGroupFilter, setPackageGroupFilter] = useState<string>("All");
  const [dishCategoryFilter, setDishCategoryFilter] = useState<TrayCategory | "All">("All");
  const [editingDishId, setEditingDishId] = useState<string | null>(null);

  const [packageModal, setPackageModal] = useState<{ mode: "add" | "edit"; item?: PackageType } | null>(null);
  const [addShape, setAddShape] = useState<PackageShape>("pax-tiered");
  const [addCategory, setAddCategory] = useState<PackageCategory>("Tray Orders");

  const [dishModal, setDishModal] = useState<{ packageSlug: string; dish?: TrayDish } | null>(null);
  const [pmModal, setPmModal] = useState<{ packageSlug: string; category?: PackedMealCategory } | null>(null);
  const [dishSlotsModal, setDishSlotsModal] = useState<PackageType | null>(null);
  const [menuBuilderModal, setMenuBuilderModal] = useState<PackageType | null>(null);
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);
  const [comboModal, setComboModal] = useState<{ mode: "add" | "edit"; editing?: ComboEditing } | null>(null);

  function upsertLocal(updated: PackageType): PackageType {
    setPackages((prev) => {
      const idx = prev.findIndex((p) => p.slug === updated.slug);
      return idx >= 0 ? prev.map((p, i) => (i === idx ? updated : p)) : [updated, ...prev];
    });
    return updated;
  }

  function openAdd(category: PackageCategory, shape: PackageShape) {
    setAddCategory(category);
    setAddShape(shape);
    setPackageModal({ mode: "add" });
  }

  function openEdit(pkg: PackageType) {
    setPackageModal({ mode: "edit", item: pkg });
  }

  async function toggleActive(pkg: PackageType) {
    const updated = await setPackageActiveAction(pkg.slug, !pkg.active);
    upsertLocal(updated);
    // Keep the edit modal's own Active switch in sync when toggled from
    // inside that modal — upsertLocal only touches the table's copy.
    setPackageModal((prev) => (prev?.mode === "edit" && prev.item?.slug === updated.slug ? { mode: "edit", item: updated } : prev));
  }

  async function removePackage(pkg: PackageType) {
    if (typeof window !== "undefined" && !window.confirm(`Delete "${pkg.name}"? This removes it from the storefront immediately.`)) return;
    await deletePackageAction(pkg.slug);
    setPackages((prev) => prev.filter((p) => p.slug !== pkg.slug));
  }

  async function handlePackageSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setSaving(true);
    try {
      if (packageModal?.mode === "edit" && packageModal.item) {
        const item = packageModal.item;
        const input: PackageDetailsInput = {
          name: fd(data, "name"),
          category: fd(data, "category") as PackageCategory,
          description: fd(data, "description"),
          recommended: data.get("recommended") === "on",
          branch: fdBranches(data),
          inclusions: fdLines(data, "inclusions"),
          addOns: fdLines(data, "addOns"),
        };
        const quickEditsTier =
          !isHeadCountPackage(item) && !isTrayCartPackage(item) && !isPackedMealPackage(item)
            ? item.paxTiers.slice().sort((a, b) => a.pax - b.pax)[0]
            : undefined;
        if (isHeadCountPackage(item)) {
          input.pricePerHead = fdNum(data, "pricePerHead");
          input.minimumHeadCount = fdNum(data, "minimumHeadCount");
        }
        let updated = await updatePackageDetailsAction(item.slug, input);
        // Base Price / PAX Label are a quick-edit shortcut for the first pax
        // tier — the full tier list (add/remove tiers, per-tier pricing) still
        // lives in the "More details" pax-tier editor below.
        if (quickEditsTier) {
          updated = await savePaxTierAction(item.slug, {
            ...quickEditsTier,
            paxLabel: fd(data, "paxLabel") || undefined,
            menus: [{ ...quickEditsTier.menus[0], price: fdNum(data, "basePrice") }],
          });
        }
        upsertLocal(updated);
        setPackageModal({ mode: "edit", item: updated });
      } else {
        const slug = fd(data, "slug");
        if (!/^[a-z0-9-]+$/.test(slug)) {
          alert("Slug must be lowercase letters, numbers, and hyphens only.");
          return;
        }
        if (packages.some((p) => p.slug === slug)) {
          alert(`A package with slug "${slug}" already exists.`);
          return;
        }
        const input: NewPackageInput = {
          shape: addShape,
          slug,
          name: fd(data, "name"),
          category: addCategory,
          description: fd(data, "description"),
          recommended: data.get("recommended") === "on",
          branch: fdBranches(data),
          inclusions: fdLines(data, "inclusions"),
          addOns: fdLines(data, "addOns"),
        };
        if (addShape === "head-count") {
          input.pricePerHead = fdNum(data, "pricePerHead");
          input.minimumHeadCount = fdNum(data, "minimumHeadCount");
        }
        let created = await createPackageAction(input);
        const basePrice = fd(data, "basePrice");
        if ((addShape === "pax-tiered" || addShape === "fixed-menu") && basePrice) {
          const paxLabel = fd(data, "paxLabel");
          const pax = parseInt(paxLabel.match(/\d+/)?.[0] ?? "1", 10) || 1;
          created = await savePaxTierAction(created.slug, {
            pax,
            paxLabel: paxLabel || undefined,
            menus: [
              {
                id: `${created.slug}-${pax}`,
                name: "Full Spread",
                price: fdNum(data, "basePrice"),
                mains: [],
                sides: [],
                snacks: [],
                group: fd(data, "group") || undefined,
              },
            ],
          });
        }
        upsertLocal(created);
        setPackageModal(null);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  async function handleTierSubmit(e: FormEvent<HTMLFormElement>, packageSlug: string) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const pax = fdNum(data, "pax");
    const paxLabel = fd(data, "paxLabel");
    const menuName = fd(data, "menuName") || "Full Spread";
    const price = fdNum(data, "price");
    const updated = await savePaxTierAction(packageSlug, {
      pax,
      paxLabel: paxLabel || undefined,
      menus: [{ id: `${packageSlug}-${pax}`, name: menuName, price, mains: [], sides: [], snacks: [] }],
    });
    upsertLocal(updated);
    setPackageModal({ mode: "edit", item: updated });
    e.currentTarget.reset();
  }

  async function handleTierDelete(packageSlug: string, pax: number) {
    if (typeof window !== "undefined" && !window.confirm(`Remove the ${pax}-pax tier?`)) return;
    const updated = await deletePaxTierAction(packageSlug, pax);
    upsertLocal(updated);
    setPackageModal({ mode: "edit", item: updated });
  }

  async function handleDishSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!dishModal) return;
    const data = new FormData(e.currentTarget);
    const packageSlug = fd(data, "packageSlug") || dishModal.packageSlug;
    const name = fd(data, "name");
    const id = dishModal.dish?.id || trayDishId(name);
    const dish: TrayDish = {
      id,
      name,
      category: fd(data, "category") as TrayCategory,
      prices: {
        Family: fdNum(data, "price-Family"),
        Feast: fdNum(data, "price-Feast"),
        XXXL: fdNum(data, "price-XXXL"),
      },
    };
    const updated = await saveTrayDishAction(packageSlug, dish);
    upsertLocal(updated);
    setDishModal(null);
  }

  async function handleDishDelete(packageSlug: string, dish: TrayDish) {
    if (typeof window !== "undefined" && !window.confirm(`Remove "${dish.name}"?`)) return;
    const updated = await deleteTrayDishAction(packageSlug, dish.id);
    upsertLocal(updated);
  }

  async function handleDishInlineSave(e: FormEvent<HTMLFormElement>, packageSlug: string, dish: TrayDish) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const updated = await saveTrayDishAction(packageSlug, {
      ...dish,
      prices: {
        Family: fdNum(data, "price-Family"),
        Feast: fdNum(data, "price-Feast"),
        XXXL: fdNum(data, "price-XXXL"),
      },
    });
    upsertLocal(updated);
    setEditingDishId(null);
  }

  async function handlePmSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!pmModal) return;
    const data = new FormData(e.currentTarget);
    const packageSlug = fd(data, "packageSlug") || pmModal.packageSlug;
    const category = (pmModal.category ?? (fd(data, "category") as PackedMealCategory)) as PackedMealCategory;
    const tag = fd(data, "tag");
    const updated = await savePackedMealCategoryAction(packageSlug, {
      category,
      tag: tag || undefined,
      description: fd(data, "description"),
      dishes: fdLines(data, "dishes"),
      tiers: packedMealQtyTiers(fdNum(data, "price25"), fdNum(data, "price50"), fdNum(data, "price100")),
    });
    upsertLocal(updated);
    setPmModal(null);
  }

  async function handleComboDelete(combo: ComboRow) {
    if (typeof window !== "undefined" && !window.confirm(`Delete "${combo.comboName}"?`)) return;
    const updated = await deleteComboAction(combo.packageSlug, combo.pax, combo.id);
    upsertLocal(updated);
  }

  function handleComboEdit(combo: ComboRow) {
    const pkg = packages.find((p) => p.slug === combo.packageSlug);
    const tier = pkg?.paxTiers.find((t) => t.pax === combo.pax);
    const menu = tier?.menus.find((m) => m.id === combo.id);
    if (!pkg || !tier || !menu) return;
    setComboModal({ mode: "edit", editing: { packageSlug: pkg.slug, pax: tier.pax, paxLabel: tier.paxLabel, combo: menu } });
  }

  async function handlePmDelete(packageSlug: string, category: string) {
    if (typeof window !== "undefined" && !window.confirm(`Remove the "${category}" category?`)) return;
    const updated = await deletePackedMealCategoryAction(packageSlug, category);
    upsertLocal(updated);
  }

  const editItem = packageModal?.mode === "edit" ? packageModal.item : undefined;
  const shapeForModal = editItem ? packageShape(editItem) : addShape;
  // The first pax tier, quick-editable via the top-level Base Price / PAX
  // Label fields — only for shapes that price off a single tier. Tray-cart
  // and packed-meal packages price per dish (Dishes / Packed Meals tabs);
  // head-count packages use pricePerHead/minimumHeadCount instead.
  const quickEditTier =
    editItem && shapeForModal !== "head-count" && shapeForModal !== "tray-cart" && shapeForModal !== "packed-meal"
      ? editItem.paxTiers.slice().sort((a, b) => a.pax - b.pax)[0]
      : undefined;

  const trayPackages = packages.filter(isTrayCartPackage);
  const packedPackages = packages.filter(isPackedMealPackage);

  // The Packages tab is a flat, per-combo table (Handaan Packages' ~40+ named
  // combos across pax tiers, flattened) rather than one row per package —
  // this is what the storefront's /order flow actually presents as distinct
  // choices, and what the filter chips below group by.
  const comboRows = flattenCombos(packages);
  const packageGroups = ["All", ...Array.from(new Set(comboRows.map((c) => c.group)))];

  const tabCounts: Record<TabKey, number> = {
    packages: comboRows.length,
    grazing: packages.filter((p) => p.category === "Grazing").length,
    catering: packages.filter((p) => p.category === "Full-Service Catering").length,
    packed: packedPackages.reduce((n, p) => n + (p.packedMealCatalog?.length ?? 0), 0),
    dishes: trayPackages.reduce((n, p) => n + (p.trayCatalog?.length ?? 0), 0),
  };

  // The header's Add button is contextual per tab — it stands in for what
  // used to be separate in-page "+ Add ..." links scattered across tabs.
  const headerAction: { label: string; onClick: () => void } = (() => {
    switch (tab) {
      case "grazing":
        return { label: "Add Package", onClick: () => openAdd("Grazing", "fixed-menu") };
      case "catering":
        return { label: "Add Package", onClick: () => openAdd("Full-Service Catering", "head-count") };
      case "packed":
        return packedPackages.length === 0
          ? { label: "Add Package", onClick: () => openAdd("Tray Orders", "packed-meal") }
          : { label: "Add Category", onClick: () => setPmModal({ packageSlug: packedPackages[0].slug }) };
      case "dishes":
        return trayPackages.length === 0
          ? { label: "Add Package", onClick: () => openAdd("Tray Orders", "tray-cart") }
          : { label: "Add Dish", onClick: () => setDishModal({ packageSlug: trayPackages[0].slug }) };
      case "packages":
      default:
        return { label: "Add Package", onClick: () => setComboModal({ mode: "add" }) };
    }
  })();

  // Packages without a Group tag on their first combo (tray-cart/packed-meal/
  // head-count shapes, or untagged pax-tiered ones) fall back to their
  // Category — used by the Grazing/Catering tabs' package-level table below.
  function packageGroupLabel(pkg: PackageType): string {
    return pkg.paxTiers[0]?.menus[0]?.group || pkg.category;
  }

  function renderComboTable(rows: ComboRow[], emptyLabel: string) {
    return (
      <div className="mt-4 overflow-hidden rounded-lg border border-gray-200 bg-white">
        <ScrollX>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Package</th>
                <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Pax</th>
                <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Base Price</th>
                <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Group</th>
                <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Branch</th>
                <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Active</th>
                <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-sm text-slate-400">
                    {emptyLabel}
                  </td>
                </tr>
              )}
              {rows.map((row) => {
                const pkg = packages.find((p) => p.slug === row.packageSlug);
                return (
                  <tr key={row.key} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-brand-900">{row.comboName}</p>
                      <p className="text-xs text-slate-400">{row.id}</p>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-slate-700">{row.paxLabel}</td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-slate-700">{formatPeso(row.price)}</td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-slate-700">{row.group}</td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-slate-700">{branchesLabel(row.branch)}</td>
                    <td className="whitespace-nowrap px-5 py-3.5">
                      <button
                        type="button"
                        onClick={() => pkg && toggleActive(pkg)}
                        aria-pressed={row.active}
                        aria-label={row.active ? "Hide from storefront" : "Show on storefront"}
                        title={
                          row.active
                            ? "Visible on the storefront — click to hide the whole package"
                            : "Hidden from the storefront — click to show the whole package"
                        }
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
                        <button
                          type="button"
                          onClick={() => pkg && setDishSlotsModal(pkg)}
                          aria-label="Dish Slots"
                          title="Dish Slots"
                          className="transition-colors hover:text-brand-700"
                        >
                          <ListOrdered size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleComboEdit(row)}
                          aria-label="Edit"
                          title="Edit combo"
                          className="transition-colors hover:text-brand-700"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleComboDelete(row)}
                          aria-label="Delete"
                          title="Delete combo"
                          className="transition-colors hover:text-red-600"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </ScrollX>
      </div>
    );
  }

  function renderPackageTable(rows: PackageType[], emptyLabel: string) {
    return (
      <div className="mt-4 overflow-hidden rounded-lg border border-gray-200 bg-white">
        <ScrollX>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Package</th>
                <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Pax</th>
                <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Base Price</th>
                <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Group</th>
                <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Branch</th>
                <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Active</th>
                <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-sm text-slate-400">
                    {emptyLabel}
                  </td>
                </tr>
              )}
              {rows.map((row) => {
                const { paxLabel, price } = packageBasePriceInfo(row);
                const expanded = expandedSlug === row.slug;
                return (
                  <Fragment key={row.slug}>
                    <tr className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                      <td className="px-5 py-3.5">
                        <div className="flex items-start gap-1.5">
                          {row.paxTiers.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setExpandedSlug(expanded ? null : row.slug)}
                              aria-label={expanded ? "Collapse" : "Expand"}
                              className="mt-0.5 text-slate-400 transition-transform hover:text-brand-700"
                            >
                              <ChevronDown size={14} className={`transition-transform ${expanded ? "rotate-180" : ""}`} />
                            </button>
                          )}
                          <div>
                            <p className="font-medium text-brand-900">{row.name}</p>
                            <p className="text-xs text-slate-400">{row.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-slate-700">{paxLabel}</td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-slate-700">{price != null ? formatPeso(price) : "—"}</td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-slate-700">{packageGroupLabel(row)}</td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-slate-700">{branchesLabel(row.branch)}</td>
                      <td className="whitespace-nowrap px-5 py-3.5">
                        <button
                          type="button"
                          onClick={() => toggleActive(row)}
                          aria-pressed={row.active}
                          aria-label={row.active ? "Hide from storefront" : "Show on storefront"}
                          title={row.active ? "Visible on the storefront — click to hide" : "Hidden from the storefront — click to show"}
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
                          <button
                            type="button"
                            onClick={() => setDishSlotsModal(row)}
                            aria-label="Dish Slots"
                            title="Dish Slots"
                            className="transition-colors hover:text-brand-700"
                          >
                            <ListOrdered size={16} />
                          </button>
                          <button type="button" onClick={() => openEdit(row)} aria-label="Edit" className="transition-colors hover:text-brand-700">
                            <Pencil size={16} />
                          </button>
                          <button type="button" onClick={() => removePackage(row)} aria-label="Delete" className="transition-colors hover:text-red-600">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expanded && row.paxTiers.length > 0 && (
                      <tr className="border-b border-gray-100 bg-gray-50/60 last:border-0">
                        <td colSpan={7} className="px-5 py-3">
                          <div className="space-y-3">
                            {row.paxTiers
                              .slice()
                              .sort((a, b) => a.pax - b.pax)
                              .map((tier) => (
                                <div key={tier.pax}>
                                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    {tier.paxLabel ?? `${tier.pax} pax`}
                                  </p>
                                  <ul className="mt-1 space-y-0.5 text-sm text-slate-700">
                                    {tier.menus.length === 0 && <li className="text-slate-400">No combos yet.</li>}
                                    {tier.menus.map((menu) => (
                                      <li key={menu.id}>
                                        {menu.name}
                                        {menu.group && <span className="text-slate-400"> — {menu.group}</span>} —{" "}
                                        {formatPeso(menu.price)}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </ScrollX>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Menu / Packages" subtitle="Manage packages — changes sync straight to the herbies storefront">
        <button
          onClick={headerAction.onClick}
          className="inline-flex items-center gap-1.5 rounded-lg bg-gold-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-gold-600"
        >
          <Plus size={16} />
          {headerAction.label}
        </button>
      </PageHeader>

      <div className="flex flex-wrap gap-6 border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`-mb-px whitespace-nowrap border-b-2 pb-3 text-sm font-medium transition-colors ${
              tab === t.key ? "border-brand-900 text-brand-900" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label} ({tabCounts[t.key]})
          </button>
        ))}
      </div>

      {tab === "packages" && (
        <>
          <div className="mt-4 flex flex-wrap gap-2">
            {packageGroups.map((g) => (
              <button
                key={g}
                onClick={() => setPackageGroupFilter(g)}
                className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                  packageGroupFilter === g ? "bg-brand-900 text-white" : "bg-gray-100 text-slate-600 hover:bg-gray-200"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
          {renderComboTable(
            packageGroupFilter === "All" ? comboRows : comboRows.filter((c) => c.group === packageGroupFilter),
            "No packages yet."
          )}
        </>
      )}

      {tab === "grazing" && (
        <>{renderPackageTable(packages.filter((p) => p.category === "Grazing"), "No grazing packages yet.")}</>
      )}

      {tab === "catering" && (
        <>{renderPackageTable(packages.filter((p) => p.category === "Full-Service Catering"), "No catering packages yet.")}</>
      )}

      {tab === "packed" && (
        <div className="mt-4 overflow-hidden rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-200 bg-gray-50 px-5 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Packed Meal Categories</p>
          </div>
          <ScrollX>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Package</th>
                  <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Category</th>
                  <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Tag</th>
                  <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Dishes</th>
                  <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Pricing (25/50/100+)</th>
                  <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {packedPackages.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-sm text-slate-400">
                      No packed-meal package yet — create one first.
                    </td>
                  </tr>
                )}
                {packedPackages.flatMap((pkg) =>
                  (pkg.packedMealCatalog ?? []).map((cat) => (
                    <tr key={`${pkg.slug}-${cat.category}`} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                      <td className="px-5 py-3.5 text-slate-700">{pkg.name}</td>
                      <td className="whitespace-nowrap px-5 py-3.5 font-medium text-brand-900">{cat.category}</td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-slate-700">{cat.tag || "—"}</td>
                      <td className="px-5 py-3.5 text-slate-700">{cat.dishes.length} dishes</td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-slate-700">
                        {cat.tiers.map((t) => formatPeso(t.pricePerPc)).join(" / ")}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5">
                        <div className="flex items-center gap-3 text-slate-400">
                          <button
                            type="button"
                            onClick={() => setPmModal({ packageSlug: pkg.slug, category: cat.category })}
                            aria-label="Edit"
                            className="transition-colors hover:text-brand-700"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePmDelete(pkg.slug, cat.category)}
                            aria-label="Delete"
                            className="transition-colors hover:text-red-600"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </ScrollX>
        </div>
      )}

      {tab === "dishes" && (
        <>
          <div className="mt-4 flex flex-wrap gap-2">
            {(["All", ...TRAY_CATEGORIES] as const).map((c) => (
              <button
                key={c}
                onClick={() => setDishCategoryFilter(c)}
                className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                  dishCategoryFilter === c ? "bg-brand-900 text-white" : "bg-gray-100 text-slate-600 hover:bg-gray-200"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="mt-3 overflow-hidden rounded-lg border border-gray-200 bg-white">
            <ScrollX>
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Dish</th>
                    <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Category</th>
                    <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Family (₱)</th>
                    <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Feast (₱)</th>
                    <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">XXXL (₱)</th>
                    <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Prices</th>
                  </tr>
                </thead>
                <tbody>
                  {trayPackages.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-center text-sm text-slate-400">
                        No tray-cart package yet — create one first.
                      </td>
                    </tr>
                  )}
                  {trayPackages.flatMap((pkg) =>
                    (pkg.trayCatalog ?? [])
                      .filter((dish) => dishCategoryFilter === "All" || dish.category === dishCategoryFilter)
                      .map((dish) =>
                        editingDishId === dish.id ? (
                          <tr key={`${pkg.slug}-${dish.id}`} className="border-b border-gray-100 bg-brand-50/40 last:border-0">
                            <td colSpan={6} className="px-5 py-3">
                              <form
                                onSubmit={(e) => handleDishInlineSave(e, pkg.slug, dish)}
                                className="flex flex-wrap items-end gap-3"
                              >
                                <span className="text-sm font-medium text-brand-900">{dish.name}</span>
                                <span className="whitespace-nowrap text-xs text-slate-500">{dish.category}</span>
                                <label className="text-xs text-slate-500">
                                  Family
                                  <input
                                    type="number"
                                    name="price-Family"
                                    min={0}
                                    defaultValue={dish.prices.Family}
                                    className={`${smallInputClass} w-24`}
                                  />
                                </label>
                                <label className="text-xs text-slate-500">
                                  Feast
                                  <input
                                    type="number"
                                    name="price-Feast"
                                    min={0}
                                    defaultValue={dish.prices.Feast}
                                    className={`${smallInputClass} w-24`}
                                  />
                                </label>
                                <label className="text-xs text-slate-500">
                                  XXXL
                                  <input
                                    type="number"
                                    name="price-XXXL"
                                    min={0}
                                    defaultValue={dish.prices.XXXL}
                                    className={`${smallInputClass} w-24`}
                                  />
                                </label>
                                <button type="submit" className={smallSubmitClass}>
                                  Save
                                </button>
                                <button type="button" onClick={() => setEditingDishId(null)} className="text-lg leading-none text-slate-400 hover:text-slate-600">
                                  ×
                                </button>
                              </form>
                            </td>
                          </tr>
                        ) : (
                          <tr key={`${pkg.slug}-${dish.id}`} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                            <td className="whitespace-nowrap px-5 py-3.5 font-medium text-brand-900">{dish.name}</td>
                            <td className="whitespace-nowrap px-5 py-3.5 text-slate-700">{dish.category}</td>
                            <td className="whitespace-nowrap px-5 py-3.5 text-slate-700">{formatPeso(dish.prices.Family)}</td>
                            <td className="whitespace-nowrap px-5 py-3.5 text-slate-700">{formatPeso(dish.prices.Feast)}</td>
                            <td className="whitespace-nowrap px-5 py-3.5 text-slate-700">{formatPeso(dish.prices.XXXL)}</td>
                            <td className="whitespace-nowrap px-5 py-3.5">
                              <div className="flex items-center gap-3">
                                <button
                                  type="button"
                                  onClick={() => setEditingDishId(dish.id)}
                                  className="rounded-lg border border-brand-200 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-50"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDishDelete(pkg.slug, dish)}
                                  aria-label="Delete"
                                  className="text-slate-400 transition-colors hover:text-red-600"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      )
                  )}
                </tbody>
              </table>
            </ScrollX>
          </div>
        </>
      )}

      {/* Add / Edit package */}
      <Modal isOpen={packageModal !== null} onClose={() => setPackageModal(null)} title={editItem ? editItem.name : "Add Package"} size="lg">
        <form onSubmit={handlePackageSubmit} className="space-y-4">
          {!editItem && (
            <label className="block text-sm">
              <span className={labelClass}>Slug (unique, url-safe)</span>
              <input name="slug" required pattern="[a-z0-9-]+" placeholder="e.g. party-trays" className={inputClass} />
            </label>
          )}
          {editItem && (
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm">
                <span className={labelClass}>Slug</span>
                <input value={editItem.slug} disabled className={`${inputClass} bg-gray-50 text-slate-400`} />
              </label>
              <label className="text-sm">
                <span className={labelClass}>Category</span>
                <select name="category" required defaultValue={editItem.category} className={inputClass}>
                  {packageCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

          <label className="block text-sm">
            <span className={labelClass}>Package Name</span>
            <input name="name" required defaultValue={editItem?.name} className={inputClass} />
          </label>

          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              name="recommended"
              defaultChecked={editItem?.recommended}
              className="h-4 w-4 rounded border-gray-300 text-brand-700 focus:ring-brand-500"
            />
            Mark as Recommended
          </label>

          {shapeForModal === "head-count" ? (
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm">
                <span className={labelClass}>Price per head (₱)</span>
                <input type="number" name="pricePerHead" required min={0} defaultValue={editItem?.pricePerHead ?? ""} className={inputClass} />
              </label>
              <label className="text-sm">
                <span className={labelClass}>Minimum head count</span>
                <input type="number" name="minimumHeadCount" required min={1} defaultValue={editItem?.minimumHeadCount ?? ""} className={inputClass} />
              </label>
            </div>
          ) : (
            (quickEditTier || (!editItem && (addShape === "pax-tiered" || addShape === "fixed-menu"))) && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-sm">
                    <span className={labelClass}>Base Price (₱)</span>
                    <input
                      type="number"
                      name="basePrice"
                      min={0}
                      defaultValue={quickEditTier?.menus[0]?.price ?? ""}
                      className={inputClass}
                    />
                  </label>
                  <label className="text-sm">
                    <span className={labelClass}>PAX Label</span>
                    <input
                      name="paxLabel"
                      placeholder="e.g. 15 pax"
                      defaultValue={quickEditTier ? quickEditTier.paxLabel ?? `${quickEditTier.pax} pax` : ""}
                      className={inputClass}
                    />
                  </label>
                </div>
                <label className="block text-sm">
                  <span className={labelClass}>Group</span>
                  <input
                    name="group"
                    placeholder="e.g. Family Combos"
                    defaultValue={quickEditTier?.menus[0]?.group ?? ""}
                    className={inputClass}
                  />
                </label>
              </>
            )
          )}

          <label className="block text-sm">
            <span className={labelClass}>Branch</span>
            <select name="branch" defaultValue={editItem?.branch?.[0] ?? ""} className={inputClass}>
              <option value="">Both</option>
              {PACKAGE_BRANCHES.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>

          {editItem && (
            <div className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2">
              <span className="text-sm font-medium text-slate-600">Active</span>
              <button
                type="button"
                onClick={() => toggleActive(editItem)}
                aria-pressed={editItem.active}
                aria-label={editItem.active ? "Hide from storefront" : "Show on storefront"}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  editItem.active ? "bg-emerald-500" : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                    editItem.active ? "translate-x-[18px]" : "translate-x-[2px]"
                  }`}
                />
              </button>
            </div>
          )}

          {/* Open by default when creating a package — Description is required
             and a collapsed <details> would hide that from a first-time fill. */}
          <details className="group border-t border-gray-100 pt-4" open={!editItem}>
            <summary className="flex cursor-pointer list-none items-center gap-1.5 text-sm font-semibold text-brand-700">
              <ChevronDown size={14} className="transition-transform group-open:rotate-180" />
              More details
            </summary>

            <div className="mt-4 space-y-4">
              <label className="block text-sm">
                <span className={labelClass}>Description</span>
                <textarea name="description" required rows={2} defaultValue={editItem?.description} className={inputClass} />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm">
                  <span className={labelClass}>Inclusions (one per line)</span>
                  <textarea name="inclusions" rows={3} defaultValue={editItem?.inclusions.join("\n")} className={inputClass} />
                </label>
                <label className="text-sm">
                  <span className={labelClass}>Add-ons (one per line)</span>
                  <textarea name="addOns" rows={3} defaultValue={editItem?.addOns.join("\n")} className={inputClass} />
                </label>
              </div>

              {editItem && (isTrayCartPackage(editItem) || isPackedMealPackage(editItem)) && (
                <p className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-slate-500">
                  {isTrayCartPackage(editItem)
                    ? "Tray dishes for this package are managed on the Dishes tab."
                    : "Packed-meal categories for this package are managed on the Packed Meals tab."}
                </p>
              )}

              {editItem && !isTrayCartPackage(editItem) && !isPackedMealPackage(editItem) && !isHeadCountPackage(editItem) && (
                <div className="border-t border-gray-100 pt-4">
                  <div className="flex items-center justify-between">
                    <p className={labelClass}>Pax Tiers</p>
                    <button
                      type="button"
                      onClick={() => setMenuBuilderModal(editItem)}
                      className="rounded-lg border border-brand-200 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-50"
                    >
                      Manage Combos
                    </button>
                  </div>
                  {editItem.paxTiers.length === 0 && <p className="text-sm text-slate-400">No pax tiers yet — add one below.</p>}
                  <ul className="divide-y divide-gray-100">
                    {editItem.paxTiers
                      .slice()
                      .sort((a, b) => a.pax - b.pax)
                      .map((tier) => (
                        <li key={tier.pax} className="py-2">
                          <form onSubmit={(e) => handleTierSubmit(e, editItem.slug)} className="flex flex-wrap items-end gap-2">
                            <label className="text-xs text-slate-500">
                              Pax
                              <input type="number" name="pax" required min={1} defaultValue={tier.pax} className={`${smallInputClass} w-16`} />
                            </label>
                            <label className="text-xs text-slate-500">
                              Label
                              <input name="paxLabel" defaultValue={tier.paxLabel} className={`${smallInputClass} w-24`} />
                            </label>
                            <label className="text-xs text-slate-500">
                              Menu name
                              <input name="menuName" defaultValue={tier.menus[0]?.name ?? "Full Spread"} className={`${smallInputClass} w-28`} />
                            </label>
                            <label className="text-xs text-slate-500">
                              Price (₱)
                              <input type="number" name="price" required min={0} defaultValue={tier.menus[0]?.price} className={`${smallInputClass} w-24`} />
                            </label>
                            <button type="submit" className={smallSubmitClass}>
                              Save
                            </button>
                            <button type="button" onClick={() => handleTierDelete(editItem.slug, tier.pax)} className={dangerButtonClass}>
                              Remove
                            </button>
                          </form>
                        </li>
                      ))}
                  </ul>
                  <form onSubmit={(e) => handleTierSubmit(e, editItem.slug)} className="mt-3 flex flex-wrap items-end gap-2 border-t border-gray-100 pt-3">
                    <label className="text-xs text-slate-500">
                      Pax
                      <input type="number" name="pax" required min={1} className={`${smallInputClass} w-16`} />
                    </label>
                    <label className="text-xs text-slate-500">
                      Label
                      <input name="paxLabel" placeholder="e.g. 15-25" className={`${smallInputClass} w-24`} />
                    </label>
                    <label className="text-xs text-slate-500">
                      Menu name
                      <input name="menuName" placeholder="Full Spread" className={`${smallInputClass} w-28`} />
                    </label>
                    <label className="text-xs text-slate-500">
                      Price (₱)
                      <input type="number" name="price" required min={0} className={`${smallInputClass} w-24`} />
                    </label>
                    <button type="submit" className="rounded-lg bg-gold-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gold-600">
                      + Add Tier
                    </button>
                  </form>
                </div>
              )}
            </div>
          </details>

          <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
            <button type="button" onClick={() => setPackageModal(null)} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-gray-100">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="rounded-lg bg-gold-500 px-4 py-2 text-sm font-semibold text-white hover:bg-gold-600 disabled:opacity-60">
              {editItem ? "Save Details" : "Create Package"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Add / Edit tray dish */}
      <Modal isOpen={dishModal !== null} onClose={() => setDishModal(null)} title={dishModal?.dish ? "Edit Dish" : "Add Dish"} size="md">
        {dishModal && (
          <form onSubmit={handleDishSubmit} className="space-y-4">
            {trayPackages.length > 1 && (
              <label className="block text-sm">
                <span className={labelClass}>Package</span>
                <select name="packageSlug" defaultValue={dishModal.packageSlug} className={inputClass}>
                  {trayPackages.map((p) => (
                    <option key={p.slug} value={p.slug}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="block text-sm">
              <span className={labelClass}>Name</span>
              <input name="name" required defaultValue={dishModal.dish?.name} className={inputClass} />
            </label>
            <label className="block text-sm">
              <span className={labelClass}>Category</span>
              <select name="category" defaultValue={dishModal.dish?.category ?? TRAY_CATEGORIES[0]} className={inputClass}>
                {TRAY_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-3 gap-3">
              {TRAY_SIZES.map((size) => (
                <label key={size} className="text-sm">
                  <span className={labelClass}>{size} (₱)</span>
                  <input type="number" name={`price-${size}`} min={0} defaultValue={dishModal.dish?.prices[size]} className={inputClass} />
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setDishModal(null)} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-gray-100">
                Cancel
              </button>
              <button type="submit" className="rounded-lg bg-gold-500 px-4 py-2 text-sm font-semibold text-white hover:bg-gold-600">
                Save
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Add / Edit packed meal category */}
      <Modal isOpen={pmModal !== null} onClose={() => setPmModal(null)} title={pmModal?.category ? "Edit Category" : "Add Category"} size="md">
        {pmModal && (
          <form onSubmit={handlePmSubmit} className="space-y-4">
            {packedPackages.length > 1 && !pmModal.category && (
              <label className="block text-sm">
                <span className={labelClass}>Package</span>
                <select name="packageSlug" defaultValue={pmModal.packageSlug} className={inputClass}>
                  {packedPackages.map((p) => (
                    <option key={p.slug} value={p.slug}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {pmModal.category ? (
              <p className="text-sm">
                <span className={labelClass}>Category</span>
                <span className="font-medium text-brand-900">{pmModal.category}</span>
              </p>
            ) : (
              <label className="block text-sm">
                <span className={labelClass}>Category</span>
                <select name="category" defaultValue={PACKED_MEAL_CATEGORIES[0]} className={inputClass}>
                  {PACKED_MEAL_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="block text-sm">
              <span className={labelClass}>Tag (optional)</span>
              <input
                name="tag"
                defaultValue={packedPackages.flatMap((p) => p.packedMealCatalog ?? []).find((c) => c.category === pmModal.category)?.tag}
                className={inputClass}
              />
            </label>
            <label className="block text-sm">
              <span className={labelClass}>Description</span>
              <input
                name="description"
                defaultValue={packedPackages.flatMap((p) => p.packedMealCatalog ?? []).find((c) => c.category === pmModal.category)?.description}
                className={inputClass}
              />
            </label>
            <label className="block text-sm">
              <span className={labelClass}>Dishes (one per line)</span>
              <textarea
                name="dishes"
                rows={3}
                defaultValue={packedPackages
                  .flatMap((p) => p.packedMealCatalog ?? [])
                  .find((c) => c.category === pmModal.category)
                  ?.dishes.join("\n")}
                className={inputClass}
              />
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(["price25", "price50", "price100"] as const).map((field, i) => (
                <label key={field} className="text-sm">
                  <span className={labelClass}>{[25, 50, 100][i]}+ pcs (₱/pc)</span>
                  <input
                    type="number"
                    name={field}
                    min={0}
                    defaultValue={
                      packedPackages.flatMap((p) => p.packedMealCatalog ?? []).find((c) => c.category === pmModal.category)?.tiers[i]?.pricePerPc
                    }
                    className={inputClass}
                  />
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setPmModal(null)} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-gray-100">
                Cancel
              </button>
              <button type="submit" className="rounded-lg bg-gold-500 px-4 py-2 text-sm font-semibold text-white hover:bg-gold-600">
                Save
              </button>
            </div>
          </form>
        )}
      </Modal>

      <DishSlotsModal
        isOpen={dishSlotsModal !== null}
        onClose={() => setDishSlotsModal(null)}
        pkg={dishSlotsModal}
        allPackages={packages}
        onSaved={(updated) => {
          upsertLocal(updated);
          setDishSlotsModal(updated);
        }}
      />

      <MenuBuilderModal
        isOpen={menuBuilderModal !== null}
        onClose={() => setMenuBuilderModal(null)}
        pkg={menuBuilderModal}
        onSaved={(updated) => {
          upsertLocal(updated);
          setMenuBuilderModal(null);
        }}
      />

      <ComboModal
        isOpen={comboModal !== null}
        onClose={() => setComboModal(null)}
        mode={comboModal?.mode ?? "add"}
        packages={packages}
        editing={comboModal?.editing}
        onSaved={(updated) => {
          upsertLocal(updated);
          setComboModal(null);
        }}
      />
    </div>
  );
}
