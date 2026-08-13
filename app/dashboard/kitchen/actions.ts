"use server";

import { revalidatePath } from "next/cache";
import { setKitchenStage } from "@/lib/kitchen/data";
import type { KitchenStage } from "@/lib/kitchen/types";

// RLS ("Admin manage kitchen stages", is_admin()) is the real authorization
// boundary — a non-admin's write simply fails.
export async function setKitchenStageAction(orderId: string, stage: KitchenStage): Promise<void> {
  await setKitchenStage(orderId, stage);
  revalidatePath("/dashboard/kitchen");
}
