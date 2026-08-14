// Mirrors public.blocked_dates (supabase/blocked_dates.sql, this project) —
// dates ops has marked "not accepting bookings", with a reason. Read/write
// pattern follows lib/orders/data.ts.

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/current-user";

export type BlockedDate = {
  date: string; // YYYY-MM-DD
  reason: string;
  branch: string | null;
  createdAt: string;
};

type BlockedDateRow = {
  date: string;
  reason: string;
  branch: string | null;
  created_at: string;
};

function rowToBlockedDate(row: BlockedDateRow): BlockedDate {
  return {
    date: row.date,
    reason: row.reason,
    branch: row.branch,
    createdAt: row.created_at,
  };
}

export async function getBlockedDates(): Promise<BlockedDate[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("blocked_dates")
    .select("date, reason, branch, created_at")
    .order("date", { ascending: true });
  if (error) throw new Error(`Failed to load blocked dates: ${error.message}`);
  return (data as BlockedDateRow[]).map(rowToBlockedDate);
}

export async function blockDate(date: string, reason: string, branch: string | null): Promise<BlockedDate> {
  const supabase = createSupabaseServerClient();
  const user = await getCurrentUser();
  const { data, error } = await supabase
    .from("blocked_dates")
    .upsert({ date, reason, branch, created_by: user?.id ?? null })
    .select("date, reason, branch, created_at")
    .single();
  if (error) throw new Error(`Failed to block ${date}: ${error.message}`);
  return rowToBlockedDate(data as BlockedDateRow);
}

export async function unblockDate(date: string): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("blocked_dates").delete().eq("date", date);
  if (error) throw new Error(`Failed to unblock ${date}: ${error.message}`);
}
