"use server";

import { revalidatePath } from "next/cache";
import { saveCostCalculation } from "@/lib/costcalc/data";
import type { CostCalculation } from "@/lib/costcalc/types";

export async function saveCostCalculationAction(calc: Omit<CostCalculation, "id">): Promise<CostCalculation> {
  // RLS ("Admin manage cost calculations", is_admin()) is the real
  // authorization boundary — a non-admin's insert simply fails.
  const saved = await saveCostCalculation(calc);
  revalidatePath("/dashboard/cost-calculator");
  return saved;
}
