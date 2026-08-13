import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import type { ActivityAction, ActivityEntry, NewActivityEntry } from "./types";

type ActivityRow = {
  id: string;
  module: string;
  action: ActivityAction;
  entity: string;
  name: string;
  details: string;
  user_name: string;
  created_at: string;
};

function rowToEntry(row: ActivityRow): ActivityEntry {
  return {
    id: row.id,
    module: row.module,
    action: row.action,
    entity: row.entity,
    name: row.name,
    details: row.details,
    userName: row.user_name,
    createdAt: row.created_at,
  };
}

/**
 * Best-effort audit trail write. Called from other feature modules right
 * after a mutation succeeds — deliberately swallows its own errors so a
 * logging hiccup (or a signed-in user without a dashboard_profiles row)
 * never fails the mutation that triggered it.
 */
export async function logActivity(entry: NewActivityEntry): Promise<void> {
  try {
    const supabase = createSupabaseServerClient();
    const user = await getCurrentUser();
    await supabase.from("activity_log").insert({
      module: entry.module,
      action: entry.action,
      entity: entry.entity,
      name: entry.name,
      details: entry.details ?? "",
      user_name: user?.name ?? "",
    });
  } catch {
    // Non-fatal — see comment above.
  }
}

export async function getActivityLog(limit = 500): Promise<ActivityEntry[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("activity_log")
    .select("id, module, action, entity, name, details, user_name, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Failed to load activity log: ${error.message}`);
  return (data as ActivityRow[]).map(rowToEntry);
}
