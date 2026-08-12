import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { UserAccount } from "./user-store";

export type CurrentUser = Pick<UserAccount, "id" | "name" | "email" | "role" | "branch">;

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("dashboard_profiles")
    .select("name, email, role, branch, status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile || profile.status !== "Active") return null;

  return {
    id: user.id,
    name: profile.name,
    email: profile.email,
    role: profile.role,
    branch: profile.branch,
  };
}
