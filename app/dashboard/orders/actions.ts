"use server";

import { revalidatePath } from "next/cache";
import { updateOrderStatus } from "@/lib/orders/data";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/orders/types";

export async function updateOrderStatusAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as OrderStatus;
  if (!ORDER_STATUSES.includes(status)) throw new Error(`Invalid status "${status}".`);

  // RLS ("Admin update orders", is_admin()) is the real authorization
  // boundary — a non-admin's update simply affects zero rows.
  await updateOrderStatus(id, status);
  revalidatePath("/dashboard/orders");
  revalidatePath("/dashboard/kitchen");
  revalidatePath("/dashboard");
}
