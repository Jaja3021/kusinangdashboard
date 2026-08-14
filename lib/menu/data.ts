// Mirrors herbies' lib/packages-data.ts — reads/writes the same Supabase
// public.packages table herbies' /order storefront renders from directly.
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  PackageType,
  PackageCategory,
  PaxTier,
  TrayDish,
  PackedMealCategoryInfo,
  PackageShape,
  DishSlot,
} from "./types";

type PackageRow = {
  slug: string;
  name: string;
  category: string;
  description: string;
  recommended: boolean;
  pax_tiers: PaxTier[];
  inclusions: string[];
  add_ons: string[];
  price_per_head: number | null;
  minimum_head_count: number | null;
  tray_catalog: TrayDish[] | null;
  packed_meal_catalog: PackedMealCategoryInfo[] | null;
  branch: string[] | null;
  active: boolean | null;
  dish_slots: DishSlot[] | null;
};

const COLUMNS =
  "slug, name, category, description, recommended, pax_tiers, inclusions, add_ons, price_per_head, minimum_head_count, tray_catalog, packed_meal_catalog, branch, active, dish_slots";

function rowToPackage(row: PackageRow): PackageType {
  return {
    slug: row.slug,
    name: row.name,
    category: row.category as PackageCategory,
    description: row.description,
    recommended: row.recommended,
    paxTiers: row.pax_tiers ?? [],
    inclusions: row.inclusions ?? [],
    addOns: row.add_ons ?? [],
    pricePerHead: row.price_per_head,
    minimumHeadCount: row.minimum_head_count,
    trayCatalog: row.tray_catalog,
    packedMealCatalog: row.packed_meal_catalog,
    branch: row.branch,
    // Defaults true for any row read before menu_orders_v2.sql (herbies
    // project) has added the column.
    active: row.active ?? true,
    // Defaults [] for any row read before menu_dish_slots.sql has added
    // the column.
    dishSlots: row.dish_slots ?? [],
  };
}

export async function getPackagesData(): Promise<PackageType[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.from("packages").select(COLUMNS).order("created_at", { ascending: true });
  if (error) throw new Error(`Failed to load packages: ${error.message}`);
  return (data as PackageRow[]).map(rowToPackage);
}

async function getPackageRow(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  slug: string
): Promise<PackageRow> {
  const { data, error } = await supabase.from("packages").select(COLUMNS).eq("slug", slug).single();
  if (error || !data) throw new Error(`Package "${slug}" not found.`);
  return data as PackageRow;
}

export type NewPackageInput = {
  shape: PackageShape;
  slug: string;
  name: string;
  category: PackageCategory;
  description: string;
  recommended: boolean;
  branch: string[] | null;
  pricePerHead?: number;
  minimumHeadCount?: number;
  inclusions: string[];
  addOns: string[];
};

export async function createPackage(input: NewPackageInput): Promise<PackageType> {
  if (!/^[a-z0-9-]+$/.test(input.slug)) {
    throw new Error("Slug must be lowercase letters, numbers, and hyphens only.");
  }
  const supabase = createSupabaseServerClient();

  const row: Record<string, unknown> = {
    slug: input.slug,
    name: input.name,
    category: input.category,
    description: input.description,
    recommended: input.recommended,
    pax_tiers: [],
    inclusions: input.inclusions,
    add_ons: input.addOns,
    branch: input.branch,
    price_per_head: null,
    minimum_head_count: null,
    tray_catalog: null,
    packed_meal_catalog: null,
    active: true,
    dish_slots: [],
  };

  if (input.shape === "head-count") {
    row.price_per_head = input.pricePerHead ?? 0;
    row.minimum_head_count = input.minimumHeadCount ?? 1;
  } else if (input.shape === "tray-cart") {
    row.tray_catalog = [];
  } else if (input.shape === "packed-meal") {
    row.packed_meal_catalog = [];
  }
  // "pax-tiered" and "fixed-menu" both just start with an empty paxTiers array.

  const { data, error } = await supabase.from("packages").insert(row).select(COLUMNS).single();
  if (error) throw new Error(`Failed to create package: ${error.message}`);
  return rowToPackage(data as PackageRow);
}

export type PackageDetailsInput = {
  name: string;
  category: PackageCategory;
  description: string;
  recommended: boolean;
  branch: string[] | null;
  inclusions: string[];
  addOns: string[];
  pricePerHead?: number;
  minimumHeadCount?: number;
};

export async function updatePackageDetails(slug: string, input: PackageDetailsInput): Promise<PackageType> {
  const supabase = createSupabaseServerClient();
  const existing = await getPackageRow(supabase, slug);

  const update: Record<string, unknown> = {
    name: input.name,
    category: input.category,
    description: input.description,
    recommended: input.recommended,
    branch: input.branch,
    inclusions: input.inclusions,
    add_ons: input.addOns,
  };
  if (existing.price_per_head != null) {
    update.price_per_head = input.pricePerHead ?? 0;
    update.minimum_head_count = input.minimumHeadCount ?? 1;
  }

  const { data, error } = await supabase.from("packages").update(update).eq("slug", slug).select(COLUMNS).single();
  if (error) throw new Error(`Failed to update package "${slug}": ${error.message}`);
  return rowToPackage(data as PackageRow);
}

export async function setPackageActive(slug: string, active: boolean): Promise<PackageType> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("packages")
    .update({ active })
    .eq("slug", slug)
    .select(COLUMNS)
    .single();
  if (error) throw new Error(`Failed to update package "${slug}": ${error.message}`);
  return rowToPackage(data as PackageRow);
}

export async function deletePackage(slug: string): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("packages").delete().eq("slug", slug);
  if (error) throw new Error(`Failed to delete package "${slug}": ${error.message}`);
}

export async function upsertPaxTier(packageSlug: string, tier: PaxTier): Promise<PackageType> {
  const supabase = createSupabaseServerClient();
  const row = await getPackageRow(supabase, packageSlug);
  const paxTiers = row.pax_tiers ?? [];
  const idx = paxTiers.findIndex((t) => t.pax === tier.pax);
  const next = idx >= 0 ? paxTiers.map((t, i) => (i === idx ? tier : t)) : [...paxTiers, tier];
  const { data, error } = await supabase
    .from("packages")
    .update({ pax_tiers: next })
    .eq("slug", packageSlug)
    .select(COLUMNS)
    .single();
  if (error) throw new Error(`Failed to save pax tier: ${error.message}`);
  return rowToPackage(data as PackageRow);
}

export async function deletePaxTier(packageSlug: string, pax: number): Promise<PackageType> {
  const supabase = createSupabaseServerClient();
  const row = await getPackageRow(supabase, packageSlug);
  const next = (row.pax_tiers ?? []).filter((t) => t.pax !== pax);
  const { data, error } = await supabase
    .from("packages")
    .update({ pax_tiers: next })
    .eq("slug", packageSlug)
    .select(COLUMNS)
    .single();
  if (error) throw new Error(`Failed to delete pax tier: ${error.message}`);
  return rowToPackage(data as PackageRow);
}

export async function upsertTrayDish(packageSlug: string, dish: TrayDish): Promise<PackageType> {
  const supabase = createSupabaseServerClient();
  const row = await getPackageRow(supabase, packageSlug);
  const catalog = row.tray_catalog ?? [];
  const idx = catalog.findIndex((d) => d.id === dish.id);
  const next = idx >= 0 ? catalog.map((d, i) => (i === idx ? dish : d)) : [...catalog, dish];
  const { data, error } = await supabase
    .from("packages")
    .update({ tray_catalog: next })
    .eq("slug", packageSlug)
    .select(COLUMNS)
    .single();
  if (error) throw new Error(`Failed to save tray dish: ${error.message}`);
  return rowToPackage(data as PackageRow);
}

export async function deleteTrayDish(packageSlug: string, dishId: string): Promise<PackageType> {
  const supabase = createSupabaseServerClient();
  const row = await getPackageRow(supabase, packageSlug);
  const next = (row.tray_catalog ?? []).filter((d) => d.id !== dishId);
  const { data, error } = await supabase
    .from("packages")
    .update({ tray_catalog: next })
    .eq("slug", packageSlug)
    .select(COLUMNS)
    .single();
  if (error) throw new Error(`Failed to delete tray dish: ${error.message}`);
  return rowToPackage(data as PackageRow);
}

export async function upsertPackedMealCategory(
  packageSlug: string,
  categoryInfo: PackedMealCategoryInfo
): Promise<PackageType> {
  const supabase = createSupabaseServerClient();
  const row = await getPackageRow(supabase, packageSlug);
  const catalog = row.packed_meal_catalog ?? [];
  const idx = catalog.findIndex((c) => c.category === categoryInfo.category);
  const next = idx >= 0 ? catalog.map((c, i) => (i === idx ? categoryInfo : c)) : [...catalog, categoryInfo];
  const { data, error } = await supabase
    .from("packages")
    .update({ packed_meal_catalog: next })
    .eq("slug", packageSlug)
    .select(COLUMNS)
    .single();
  if (error) throw new Error(`Failed to save packed-meal category: ${error.message}`);
  return rowToPackage(data as PackageRow);
}

export async function deletePackedMealCategory(packageSlug: string, category: string): Promise<PackageType> {
  const supabase = createSupabaseServerClient();
  const row = await getPackageRow(supabase, packageSlug);
  const next = (row.packed_meal_catalog ?? []).filter((c) => c.category !== category);
  const { data, error } = await supabase
    .from("packages")
    .update({ packed_meal_catalog: next })
    .eq("slug", packageSlug)
    .select(COLUMNS)
    .single();
  if (error) throw new Error(`Failed to delete packed-meal category: ${error.message}`);
  return rowToPackage(data as PackageRow);
}

// Whole-array write — the Dish Slots modal edits the full ordered list
// client-side (add/reorder/remove) and saves it in one call, same pattern
// as savePaxTierAction's individual upserts but scoped to the whole list
// since slot order/position is part of what's being edited.
export async function saveDishSlots(packageSlug: string, slots: DishSlot[]): Promise<PackageType> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("packages")
    .update({ dish_slots: slots })
    .eq("slug", packageSlug)
    .select(COLUMNS)
    .single();
  if (error) throw new Error(`Failed to save dish slots: ${error.message}`);
  return rowToPackage(data as PackageRow);
}
