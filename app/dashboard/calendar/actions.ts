"use server";

import { revalidatePath } from "next/cache";
import { blockDate, unblockDate, type BlockedDate } from "@/lib/bookings/blocked-dates";
import { updateCalendarCapacity } from "@/lib/calendar/data";
import type { CalendarCapacity } from "@/lib/calendar/types";
import { requireCanCloseDates } from "@/lib/auth/require-capability";

// RLS ("Admin manage blocked dates" / "Admin manage calendar capacity") is
// the real authorization boundary — a non-admin's write simply fails.
// Capacity edits are further narrowed in the UI to the "manage:capacity"
// capability (lib/auth/permissions.ts — Owner only). Blocking/unblocking
// dates is further narrowed to the per-user "can close dates" flag.

export async function blockDateAction(date: string, reason: string, branch: string | null): Promise<BlockedDate> {
  await requireCanCloseDates();
  const updated = await blockDate(date, reason, branch);
  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard/bookings");
  return updated;
}

export async function unblockDateAction(date: string): Promise<void> {
  await requireCanCloseDates();
  await unblockDate(date);
  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard/bookings");
}

export async function updateCalendarCapacityAction(input: CalendarCapacity): Promise<void> {
  await updateCalendarCapacity(input);
  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard");
}
