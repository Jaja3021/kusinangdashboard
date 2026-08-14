// Mirrors herbies' public.packages table (c:/project/herbies/supabase/schema.sql,
// lib/packages.ts) — the storefront's /order flow reads this table directly, so
// writes from this dashboard show up there immediately with no herbies changes.
// Only the fields herbies' own /dashboard/menu editor actually exposes are kept
// here (e.g. headCountMenu/fullMenu exist on herbies' type but aren't editable
// through any admin action there either, so there's nothing to mirror for them).

export type PackageCategory = "Tray Orders" | "Grazing" | "Full-Service Catering";
export const packageCategories: PackageCategory[] = ["Tray Orders", "Grazing", "Full-Service Catering"];

export type MenuVariant = {
  id: string;
  name: string;
  price: number;
  mains: string[];
  sides: string[];
  snacks: string[];
};

export type PaxTier = {
  pax: number;
  paxLabel?: string;
  menus: MenuVariant[];
};

export type TraySize = "Family" | "Feast" | "XXXL";
export const TRAY_SIZES: TraySize[] = ["Family", "Feast", "XXXL"];

export const TRAY_CATEGORIES = ["Beef", "Seafood", "Pork", "Chicken", "Pasta", "Dessert", "Rice"] as const;
export type TrayCategory = (typeof TRAY_CATEGORIES)[number];

export type TrayDish = {
  id: string;
  name: string;
  category: TrayCategory;
  prices: Record<TraySize, number>;
};

export type PackedMealCategory = "Snacks" | "Salad / Noodles" | "Rice Meals" | "Premium Rice Meals";
export const PACKED_MEAL_CATEGORIES: PackedMealCategory[] = [
  "Snacks",
  "Salad / Noodles",
  "Rice Meals",
  "Premium Rice Meals",
];

export type PackedMealQtyTier = { minQty: number; label: string; pricePerPc: number };

export function packedMealQtyTiers(t25: number, t50: number, t100: number): PackedMealQtyTier[] {
  return [
    { minQty: 25, label: "25+ pcs", pricePerPc: t25 },
    { minQty: 50, label: "50+ pcs", pricePerPc: t50 },
    { minQty: 100, label: "100+ pcs", pricePerPc: t100 },
  ];
}

export type PackedMealCategoryInfo = {
  category: PackedMealCategory;
  tag?: string;
  description: string;
  dishes: string[];
  tiers: PackedMealQtyTier[];
};

// A dish slot is one line of a combo — which category, which dish fills it,
// what tray size/quantity, and whether the customer may swap it for another
// dish in that category. Mirrors supabase/menu_dish_slots.sql's dish_slots
// JSONB column (this dashboard project, not herbies — herbies' storefront
// doesn't read or render these yet).
export const DISH_SLOT_CATEGORIES = [
  "Beef",
  "Chicken",
  "Seafood",
  "Pork",
  "Vegetable",
  "Pasta",
  "Dessert",
  "Rice",
] as const;
export type DishSlotCategory = (typeof DISH_SLOT_CATEGORIES)[number];

export type DishSlot = {
  id: string;
  category: DishSlotCategory;
  dish: string;
  traySize: TraySize;
  quantity: number;
  swappable: boolean;
};

// Tailwind classes for each category's chip, keyed the same way branch
// badges are in lib/mt/branches.ts — one lookup, reused everywhere a slot's
// category needs a colour.
export const SLOT_CATEGORY_CHIP: Record<DishSlotCategory, string> = {
  Beef: "bg-red-100 text-red-700",
  Chicken: "bg-amber-100 text-amber-700",
  Seafood: "bg-sky-100 text-sky-700",
  Pork: "bg-rose-100 text-rose-700",
  Vegetable: "bg-emerald-100 text-emerald-700",
  Pasta: "bg-orange-100 text-orange-700",
  Dessert: "bg-purple-100 text-purple-700",
  Rice: "bg-slate-100 text-slate-700",
};

export type PackageType = {
  slug: string;
  name: string;
  category: PackageCategory;
  description: string;
  recommended: boolean;
  paxTiers: PaxTier[];
  inclusions: string[];
  addOns: string[];
  pricePerHead?: number | null;
  minimumHeadCount?: number | null;
  trayCatalog?: TrayDish[] | null;
  packedMealCatalog?: PackedMealCategoryInfo[] | null;
  // Serving areas this package is offered at. Null/empty = every branch.
  // Informational only — doesn't filter herbies' order flow.
  branch?: string[] | null;
  // Storefront visibility. false = herbies' app/page.tsx hides it without
  // the row being deleted. Mirrors public.packages.active
  // (supabase/menu_orders_v2.sql, in the herbies project).
  active: boolean;
  // What the combo is actually made of. See supabase/menu_dish_slots.sql.
  dishSlots: DishSlot[];
};

export function isTrayCartPackage(pkg: PackageType): boolean {
  return pkg.trayCatalog != null;
}

export function isPackedMealPackage(pkg: PackageType): boolean {
  return pkg.packedMealCatalog != null;
}

export function isHeadCountPackage(pkg: PackageType): boolean {
  return pkg.pricePerHead != null;
}

// Grazing packages skip menu-variant selection on the storefront — picking a
// pax size is the whole flow — but they're edited with the same pax-tier form
// as plain pax-tiered packages, so this is display-only here.
export function isFixedMenuPackage(pkg: PackageType): boolean {
  return pkg.category === "Grazing";
}

export type PackageShape = "pax-tiered" | "fixed-menu" | "tray-cart" | "packed-meal" | "head-count";

// Which categories make sense for each shape, so the Add Package form can't
// create combinations herbies' storefront doesn't know how to render (e.g. a
// "Full-Service Catering" package that isn't head-count priced).
export const CATEGORIES_FOR_SHAPE: Record<PackageShape, PackageCategory[]> = {
  "head-count": ["Full-Service Catering"],
  "tray-cart": ["Tray Orders"],
  "packed-meal": ["Tray Orders"],
  "fixed-menu": ["Grazing"],
  "pax-tiered": ["Tray Orders", "Full-Service Catering"],
};

export function packageShape(pkg: PackageType): PackageShape {
  if (isTrayCartPackage(pkg)) return "tray-cart";
  if (isPackedMealPackage(pkg)) return "packed-meal";
  if (isHeadCountPackage(pkg)) return "head-count";
  if (isFixedMenuPackage(pkg)) return "fixed-menu";
  return "pax-tiered";
}

export const SHAPE_LABELS: Record<PackageShape, string> = {
  "pax-tiered": "Pax-tiered",
  "fixed-menu": "Fixed menu (Grazing)",
  "tray-cart": "Tray cart",
  "packed-meal": "Packed meal",
  "head-count": "Head-count",
};

export function trayDishId(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

export type PackageBranch = { id: string; name: string };

// Mirrors herbies' checkout branch ids (app/order/confirm/page.tsx's BRANCHES).
// Deliberately separate from this dashboard's own ops BRANCHES in
// lib/dummy-data.ts — the two are unrelated concepts that happen to share a name.
export const PACKAGE_BRANCHES: PackageBranch[] = [
  { id: "cavite", name: "Cavite" },
  { id: "laguna", name: "Laguna" },
  { id: "metro-manila", name: "Metro Manila" },
];

export function branchLabel(id: string): string {
  return PACKAGE_BRANCHES.find((b) => b.id === id)?.name ?? id;
}

// The pax/price the Packages table and Dish Slots modal both show as a
// package's headline numbers. For pax-tiered/fixed-menu packages that's the
// lowest tier; for head-count it's the per-head rate; tray-cart and
// packed-meal packages price per dish, so there's no single number to show.
export function packageBasePriceInfo(pkg: PackageType): { paxLabel: string; price: number | null } {
  if (isHeadCountPackage(pkg)) {
    return { paxLabel: pkg.minimumHeadCount ? `${pkg.minimumHeadCount}+ pax` : "—", price: pkg.pricePerHead ?? 0 };
  }
  if (isTrayCartPackage(pkg) || isPackedMealPackage(pkg)) {
    return { paxLabel: "—", price: null };
  }
  const tier = pkg.paxTiers.slice().sort((a, b) => a.pax - b.pax)[0];
  if (!tier) return { paxLabel: "—", price: null };
  return { paxLabel: tier.paxLabel ?? `${tier.pax} pax`, price: tier.menus[0]?.price ?? 0 };
}
