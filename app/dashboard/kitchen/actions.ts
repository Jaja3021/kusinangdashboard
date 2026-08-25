"use server";

import { revalidatePath } from "next/cache";
import { setKitchenStage } from "@/lib/kitchen/data";
import type { OrderStatus } from "@/lib/orders/types";

// RLS ("Admin update orders", is_admin()) is the real authorization
// boundary — a non-admin's write simply fails. Moving a kitchen card now
// writes orders.status directly, so every page that reads it needs to
// revalidate too — same list as updateOrderStatusAction.
export async function setKitchenStageAction(orderId: string, status: OrderStatus): Promise<void> {
  await setKitchenStage(orderId, status);
  revalidatePath("/dashboard/kitchen");
  revalidatePath("/dashboard/orders");
  revalidatePath("/dashboard");
}
