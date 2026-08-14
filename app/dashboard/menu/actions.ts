"use server";

import { revalidatePath } from "next/cache";
import {
  createPackage,
  updatePackageDetails,
  setPackageActive,
  deletePackage,
  upsertPaxTier,
  deletePaxTier,
  upsertTrayDish,
  deleteTrayDish,
  upsertPackedMealCategory,
  deletePackedMealCategory,
  saveDishSlots,
  type NewPackageInput,
  type PackageDetailsInput,
} from "@/lib/menu/data";
import type { PackageType, PaxTier, TrayDish, PackedMealCategoryInfo, DishSlot } from "@/lib/menu/types";

// RLS ("Authenticated insert/update/delete") on public.packages is the real
// authorization boundary — a non-admin's write simply fails. This table is
// shared with herbies, whose own /dashboard/menu relies on the same policies.

export async function createPackageAction(input: NewPackageInput): Promise<PackageType> {
  const created = await createPackage(input);
  revalidatePath("/dashboard/menu");
  return created;
}

export async function updatePackageDetailsAction(slug: string, input: PackageDetailsInput): Promise<PackageType> {
  const updated = await updatePackageDetails(slug, input);
  revalidatePath("/dashboard/menu");
  return updated;
}

export async function setPackageActiveAction(slug: string, active: boolean): Promise<PackageType> {
  const updated = await setPackageActive(slug, active);
  revalidatePath("/dashboard/menu");
  return updated;
}

export async function deletePackageAction(slug: string): Promise<void> {
  await deletePackage(slug);
  revalidatePath("/dashboard/menu");
}

export async function savePaxTierAction(packageSlug: string, tier: PaxTier): Promise<PackageType> {
  const updated = await upsertPaxTier(packageSlug, tier);
  revalidatePath("/dashboard/menu");
  return updated;
}

export async function deletePaxTierAction(packageSlug: string, pax: number): Promise<PackageType> {
  const updated = await deletePaxTier(packageSlug, pax);
  revalidatePath("/dashboard/menu");
  return updated;
}

export async function saveTrayDishAction(packageSlug: string, dish: TrayDish): Promise<PackageType> {
  const updated = await upsertTrayDish(packageSlug, dish);
  revalidatePath("/dashboard/menu");
  return updated;
}

export async function deleteTrayDishAction(packageSlug: string, dishId: string): Promise<PackageType> {
  const updated = await deleteTrayDish(packageSlug, dishId);
  revalidatePath("/dashboard/menu");
  return updated;
}

export async function savePackedMealCategoryAction(
  packageSlug: string,
  categoryInfo: PackedMealCategoryInfo
): Promise<PackageType> {
  const updated = await upsertPackedMealCategory(packageSlug, categoryInfo);
  revalidatePath("/dashboard/menu");
  return updated;
}

export async function deletePackedMealCategoryAction(packageSlug: string, category: string): Promise<PackageType> {
  const updated = await deletePackedMealCategory(packageSlug, category);
  revalidatePath("/dashboard/menu");
  return updated;
}

export async function saveDishSlotsAction(packageSlug: string, slots: DishSlot[]): Promise<PackageType> {
  const updated = await saveDishSlots(packageSlug, slots);
  revalidatePath("/dashboard/menu");
  return updated;
}
