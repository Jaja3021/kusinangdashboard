"use server";

import { revalidatePath } from "next/cache";
import { setPaymentStatus, getProofSignedUrl, getPaymentsForOrder } from "@/lib/payments/data";
import { getCurrentUser } from "@/lib/auth/current-user";
import type { PaymentRecord } from "@/lib/payments/types";

// RLS ("Admin update payments" on herbies' public.payments) is the real
// authorization boundary — a non-admin's write simply fails.

export async function verifyPaymentAction(id: string): Promise<void> {
  const user = await getCurrentUser();
  await setPaymentStatus(id, "Verified", user?.id ?? null);
  revalidatePath("/dashboard/payments");
  revalidatePath("/dashboard/orders");
}

export async function rejectPaymentAction(id: string, reason?: string): Promise<void> {
  const user = await getCurrentUser();
  await setPaymentStatus(id, "Rejected", user?.id ?? null, reason);
  revalidatePath("/dashboard/payments");
  revalidatePath("/dashboard/orders");
}

// Minted on demand when a row is opened, not eagerly for every row in the
// list — one storage round trip per click instead of one per payment on
// every page load.
export async function getProofUrlAction(proofPath: string): Promise<string | null> {
  return getProofSignedUrl(proofPath, 300);
}

export async function getPaymentsForOrderAction(orderId: string): Promise<PaymentRecord[]> {
  return getPaymentsForOrder(orderId);
}
