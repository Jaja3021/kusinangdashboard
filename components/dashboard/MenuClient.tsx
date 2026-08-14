"use client";

import { useState, type FormEvent } from "react";
import { Plus, Pencil, Trash2, ListOrdered, ChevronDown } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Modal from "@/components/ui/Modal";
import ScrollX from "@/components/ui/ScrollX";
import DishSlotsModal from "@/components/dashboard/DishSlotsModal";
import { formatPeso } from "@/lib/format";
import {
  createPackageAction,
  updatePackageDetailsAction,
  setPackageActiveAction,
  deletePackageAction,
  savePaxTierAction,
  deletePaxTierAction,
  saveTrayDishAction,
  deleteTrayDishAction,
  savePackedMealCategoryAction,
  deletePackedMealCategoryAction,
} from "@/app/dashboard/menu/actions";
import type { NewPackageInput, PackageDetailsInput } from "@/lib/menu/data";
import {
  packageCategories,
  packageShape,
  SHAPE_LABELS,
  CATEGORIES_FOR_SHAPE,
  isTrayCartPackage,
  isPackedMealPackage,
  isHeadCountPackage,
  packageBasePriceInfo,
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
} from "@/lib/menu/types";

type TabKey = "packages" | "grazing" | "catering" | "packed" | "dishes";

const TABS: { key: TabKey; label: string }[] = [
  { key: "packages", label: "Packages" },
  { key: "grazing", label: "Grazing" },
  { key: "catering", label: "Catering" },
  { key: "packed", label: "Packed Meals" },
  { key: "dishes", label: "Dishes" },
];

const SHAPE_OPTIONS: { value: PackageShape; hint: string }[] = [
  { value: "pax-tiered", hint: "Pick a pax size, one menu per tier (add tiers after creating)." },
  { value: "fixed-menu", hint: "Pick a pax size, whole spread is the menu (Grazing)." },
  { value: "tray-cart", hint: "À la carte — add tray dishes after creating, on the Dishes tab." },
  { value: "packed-meal", hint: "Per-piece pricing — add categories after creating, on the Packed Meals tab." },
  { value: "head-count", hint: "Flat rate per guest." },
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
  const values = data.getAll("branch").map(String).filter(Boolean);
  return values.length > 0 ? values : null;
}

export default function MenuClient({ packages: initialPackages }: { packages: PackageType[] }) {
  const [packages, setPackages] = useState<PackageType[]>(initialPackages);
  const [tab, setTab] = useState<TabKey>("packages");
  const [saving, setSaving] = useState(false);

  const [packageModal, setPackageModal] = useState<{ mode: "add" | "edit"; item?: PackageType } | null>(null);
  const [addShape, setAddShape] = useState<PackageShape>("pax-tiered");
  const [addCategory, setAddCategory] = useState<PackageCategory>("Tray Orders");

  const [dishModal, setDishModal] = useState<{ packageSlug: string; dish?: TrayDish } | null>(null);
  const [pmModal, setPmModal] = useState<{ packageSlug: string; category?: PackedMealCategory } | null>(null);
  const [dishSlotsModal, setDishSlotsModal] = useState<PackageType | null>(null);

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
          category: fd(data, "category") as PackageCategory,
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
        const created = await createPackageAction(input);
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
                return (
                  <tr key={row.slug} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-brand-900">{row.name}</p>
                      <p className="text-xs text-slate-400">{row.slug}</p>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-slate-700">{paxLabel}</td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-slate-700">{price != null ? formatPeso(price) : "—"}</td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-slate-700">{row.category}</td>
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
          onClick={() => openAdd("Tray Orders", "pax-tiered")}
          className="inline-flex items-center gap-1.5 rounded-lg bg-gold-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-gold-600"
        >
          <Plus size={16} />
          Add Package
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
            {t.label}
          </button>
        ))}
      </div>

      {tab === "packages" && renderPackageTable(packages, "No packages yet.")}

      {tab === "grazing" && (
        <>
          <div className="mt-4 flex justify-end">
            <button onClick={() => openAdd("Grazing", "fixed-menu")} className="text-sm font-semibold text-brand-700 hover:underline">
              + Add Grazing Package
            </button>
          </div>
          {renderPackageTable(packages.filter((p) => p.category === "Grazing"), "No grazing packages yet.")}
        </>
      )}

      {tab === "catering" && (
        <>
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => openAdd("Full-Service Catering", "head-count")}
              className="text-sm font-semibold text-brand-700 hover:underline"
            >
              + Add Catering Package
            </button>
          </div>
          {renderPackageTable(packages.filter((p) => p.category === "Full-Service Catering"), "No catering packages yet.")}
        </>
      )}

      {tab === "packed" && (
        <div className="mt-4 overflow-hidden rounded-lg border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-5 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Packed Meal Categories</p>
            {packedPackages.length === 0 ? (
              <button onClick={() => openAdd("Tray Orders", "packed-meal")} className="text-xs font-semibold text-brand-700 hover:underline">
                + Add Packed Meal Package
              </button>
            ) : (
              <button
                onClick={() => setPmModal({ packageSlug: packedPackages[0].slug })}
                className="text-xs font-semibold text-brand-700 hover:underline"
              >
                + Add Category
              </button>
            )}
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
        <div className="mt-4 overflow-hidden rounded-lg border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-5 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tray Dishes</p>
            {trayPackages.length === 0 ? (
              <button onClick={() => openAdd("Tray Orders", "tray-cart")} className="text-xs font-semibold text-brand-700 hover:underline">
                + Add Tray-Cart Package
              </button>
            ) : (
              <button onClick={() => setDishModal({ packageSlug: trayPackages[0].slug })} className="text-xs font-semibold text-brand-700 hover:underline">
                + Add Dish
              </button>
            )}
          </div>
          <ScrollX>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Package</th>
                  <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Dish</th>
                  <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Category</th>
                  <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Family / Feast / XXXL</th>
                  <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {trayPackages.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-sm text-slate-400">
                      No tray-cart package yet — create one first.
                    </td>
                  </tr>
                )}
                {trayPackages.flatMap((pkg) =>
                  (pkg.trayCatalog ?? []).map((dish) => (
                    <tr key={`${pkg.slug}-${dish.id}`} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                      <td className="px-5 py-3.5 text-slate-700">{pkg.name}</td>
                      <td className="whitespace-nowrap px-5 py-3.5 font-medium text-brand-900">{dish.name}</td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-slate-700">{dish.category}</td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-slate-700">
                        {TRAY_SIZES.map((s) => formatPeso(dish.prices[s])).join(" / ")}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5">
                        <div className="flex items-center gap-3 text-slate-400">
                          <button
                            type="button"
                            onClick={() => setDishModal({ packageSlug: pkg.slug, dish })}
                            aria-label="Edit"
                            className="transition-colors hover:text-brand-700"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDishDelete(pkg.slug, dish)}
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

      {/* Add / Edit package */}
      <Modal isOpen={packageModal !== null} onClose={() => setPackageModal(null)} title={editItem ? editItem.name : "Add Package"} size="lg">
        <form onSubmit={handlePackageSubmit} className="space-y-4">
          {!editItem && (
            <div>
              <p className={labelClass}>Package Shape</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {SHAPE_OPTIONS.map((s) => (
                  <label
                    key={s.value}
                    className={`flex cursor-pointer flex-col rounded-lg border px-3 py-2 text-sm transition-colors ${
                      addShape === s.value ? "border-brand-500 bg-brand-50" : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <span className="flex items-center gap-2 font-medium text-brand-900">
                      <input
                        type="radio"
                        name="shape"
                        checked={addShape === s.value}
                        onChange={() => {
                          setAddShape(s.value);
                          setAddCategory(CATEGORIES_FOR_SHAPE[s.value][0]);
                        }}
                      />
                      {SHAPE_LABELS[s.value]}
                    </span>
                    <span className="mt-0.5 text-xs text-slate-400">{s.hint}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {!editItem && (
              <label className="text-sm">
                <span className={labelClass}>Slug (unique, url-safe)</span>
                <input name="slug" required pattern="[a-z0-9-]+" placeholder="e.g. party-trays" className={inputClass} />
              </label>
            )}
            {editItem && (
              <label className="text-sm">
                <span className={labelClass}>Slug</span>
                <input value={editItem.slug} disabled className={`${inputClass} bg-gray-50 text-slate-400`} />
              </label>
            )}
            <label className="text-sm">
              <span className={labelClass}>Group</span>
              <select
                key={editItem ? "edit" : addShape}
                name="category"
                required
                defaultValue={editItem?.category ?? addCategory}
                className={inputClass}
              >
                {(editItem ? packageCategories : CATEGORIES_FOR_SHAPE[addShape]).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block text-sm">
            <span className={labelClass}>Package Name</span>
            <input name="name" required defaultValue={editItem?.name} className={inputClass} />
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
            quickEditTier && (
              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm">
                  <span className={labelClass}>Base Price (₱)</span>
                  <input type="number" name="basePrice" min={0} defaultValue={quickEditTier.menus[0]?.price ?? ""} className={inputClass} />
                </label>
                <label className="text-sm">
                  <span className={labelClass}>PAX Label</span>
                  <input name="paxLabel" defaultValue={quickEditTier.paxLabel ?? `${quickEditTier.pax} pax`} className={inputClass} />
                </label>
              </div>
            )
          )}

          <div>
            <p className={labelClass}>Branch</p>
            <div className="flex flex-wrap gap-4">
              {PACKAGE_BRANCHES.map((b) => (
                <label key={b.id} className="flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    name="branch"
                    value={b.id}
                    defaultChecked={(editItem?.branch ?? []).includes(b.id)}
                    className="h-4 w-4 rounded border-gray-300 text-brand-700 focus:ring-brand-500"
                  />
                  {b.name}
                </label>
              ))}
              <span className="text-xs text-slate-400">(none checked = all branches)</span>
            </div>
          </div>

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

              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" name="recommended" defaultChecked={editItem?.recommended} className="h-4 w-4 rounded border-gray-300 text-brand-700 focus:ring-brand-500" />
                Mark as Recommended
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
                  <p className={labelClass}>Pax Tiers</p>
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
    </div>
  );
}
