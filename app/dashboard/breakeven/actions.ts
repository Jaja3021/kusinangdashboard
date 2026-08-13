"use server";

import { revalidatePath } from "next/cache";
import { saveBreakEvenSettings } from "@/lib/breakeven/data";
import type { BreakEvenSettings } from "@/lib/breakeven/types";

export async function saveBreakEvenSettingsAction(settings: BreakEvenSettings): Promise<void> {
  // RLS ("Admin manage breakeven settings", is_admin()) is the real
  // authorization boundary — a non-admin's update simply affects zero rows.
  await saveBreakEvenSettings(settings);
  revalidatePath("/dashboard/breakeven");
}
