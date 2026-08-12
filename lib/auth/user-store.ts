// Server-only. Dashboard accounts now live in Supabase: an auth.users row
// (email/password, managed by Supabase Auth) plus a public.dashboard_profiles
// row (name/role/branch/status) and a public.admins row (grants RLS access
// to orders/packages — see supabase/dashboard_profiles.sql).
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type UserAccount = {
  id: string;
  name: string;
  email: string;
  role: "Owner" | "Branch Manager" | "Event Coordinator" | "Finance Officer" | "Staff";
  branch: string;
  status: "Active" | "Invited" | "Suspended";
  lastActive: string;
};

export async function getAllUsers(): Promise<UserAccount[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("dashboard_profiles")
    .select("user_id, name, email, role, branch, status")
    .order("name", { ascending: true });

  if (error) throw new Error(`Failed to load dashboard users: ${error.message}`);

  return (data ?? []).map((row) => ({
    id: row.user_id,
    name: row.name,
    email: row.email,
    role: row.role,
    branch: row.branch,
    status: row.status,
    // No login-activity tracking wired up yet — this is a placeholder, same
    // as it was under the old JSON-file store.
    lastActive: "—",
  }));
}

export type CreateUserInput = {
  name: string;
  email: string;
  role: UserAccount["role"];
  branch: string;
  password: string;
};

export async function createUser(input: CreateUserInput): Promise<UserAccount> {
  const admin = createSupabaseAdminClient();

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
  });
  if (createError) throw new Error(createError.message);

  const userId = created.user.id;

  const { error: adminRowError } = await admin.from("admins").insert({ user_id: userId, email: input.email });
  if (adminRowError) throw new Error(adminRowError.message);

  const { error: profileError } = await admin.from("dashboard_profiles").insert({
    user_id: userId,
    name: input.name,
    email: input.email,
    role: input.role,
    branch: input.branch,
    status: "Active",
  });
  if (profileError) throw new Error(profileError.message);

  return {
    id: userId,
    name: input.name,
    email: input.email,
    role: input.role,
    branch: input.branch,
    status: "Active",
    lastActive: "—",
  };
}
