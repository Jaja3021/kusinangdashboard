"use server";

import { revalidatePath } from "next/cache";
import { blockDate, unblockDate, type BlockedDate } from "@/lib/bookings/blocked-dates";

// RLS ("Admin manage blocked dates" on public.blocked_dates) is the real
// authorization boundary — a non-admin's write simply fails.

export async function blockDateAction(date: string, reason: string, branch: string | null): Promise<BlockedDate> {
  const updated = await blockDate(date, reason, branch);
  revalidatePath("/dashboard/bookings");
  return updated;
}

export async function unblockDateAction(date: string): Promise<void> {
  await unblockDate(date);
  revalidatePath("/dashboard/bookings");
}
