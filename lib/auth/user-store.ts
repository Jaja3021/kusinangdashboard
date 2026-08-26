// Server-only. Dashboard accounts now live in Supabase: an auth.users row
// (email/password, managed by Supabase Auth) plus a public.dashboard_profiles
// row (name/role/branches/page_access/status) and a public.admins row
// (grants RLS access to orders/packages — see supabase/dashboard_profiles.sql
// and supabase/dashboard_profiles_v2.sql).
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type UserAccount = {
  id: string;
  name: string;
  email: string;
  role:
    | "Owner"
    | "Admin"
    | "Branch Manager"
    | "Sales Staff"
    | "Kitchen Staff"
    | "Operations Staff"
    | "Finance Staff"
    | "Tech Team"
    | "Developer";
  branches: string[];
  pageAccess: string[];
  canCloseDates: boolean;
  status: "Active" | "Invited" | "Suspended";
  lastActive: string;
};

export async function getAllUsers(): Promise<UserAccount[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("dashboard_profiles")
    .select("user_id, name, email, role, branches, page_access, can_close_dates, status")
    .order("name", { ascending: true });

  if (error) throw new Error(`Failed to load dashboard users: ${error.message}`);

  return (data ?? []).map((row) => ({
    id: row.user_id,
    name: row.name,
    email: row.email,
    role: row.role,
    branches: row.branches ?? [],
    pageAccess: row.page_access ?? [],
    canCloseDates: row.can_close_dates ?? false,
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
  branches: string[];
  pageAccess: string[];
  canCloseDates: boolean;
  password: string;
};

async function findAuthUserIdByEmail(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  email: string,
): Promise<string | null> {
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw new Error(error.message);
  const match = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  return match?.id ?? null;
}

export async function createUser(input: CreateUserInput): Promise<UserAccount> {
  const admin = createSupabaseAdminClient();

  let userId: string;
  let reusingOrphanedAuthUser = false;

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
  });

  if (createError) {
    const alreadyRegistered = /already.*registered/i.test(createError.message);
    if (!alreadyRegistered) throw new Error(createError.message);

    // The auth user exists, but check whether it actually has a profile —
    // if a previous attempt died between creating the auth user and writing
    // the dashboard_profiles/admins rows, the auth user is an orphan with no
    // visible account. In that case, finish the job on the existing user
    // instead of surfacing a confusing "already registered" error.
    const existingId = await findAuthUserIdByEmail(admin, input.email);
    if (!existingId) throw new Error(createError.message);

    const { data: existingProfile } = await admin
      .from("dashboard_profiles")
      .select("user_id")
      .eq("user_id", existingId)
      .maybeSingle();
    if (existingProfile) throw new Error("A user with this email address has already been registered.");

    const { error: updateError } = await admin.auth.admin.updateUserById(existingId, { password: input.password });
    if (updateError) throw new Error(updateError.message);

    userId = existingId;
    reusingOrphanedAuthUser = true;
  } else {
    userId = created.user.id;
  }

  const { error: adminRowError } = await admin.from("admins").upsert({ user_id: userId, email: input.email });
  if (adminRowError) {
    if (!reusingOrphanedAuthUser) await admin.auth.admin.deleteUser(userId);
    throw new Error(adminRowError.message);
  }

  const { error: profileError } = await admin.from("dashboard_profiles").insert({
    user_id: userId,
    name: input.name,
    email: input.email,
    role: input.role,
    branches: input.branches,
    page_access: input.pageAccess,
    can_close_dates: input.canCloseDates,
    status: "Active",
  });
  if (profileError) {
    if (!reusingOrphanedAuthUser) await admin.auth.admin.deleteUser(userId);
    throw new Error(profileError.message);
  }

  return {
    id: userId,
    name: input.name,
    email: input.email,
    role: input.role,
    branches: input.branches,
    pageAccess: input.pageAccess,
    canCloseDates: input.canCloseDates,
    status: "Active",
    lastActive: "—",
  };
}

export type UpdateUserInput = Partial<
  Pick<UserAccount, "name" | "role" | "branches" | "pageAccess" | "canCloseDates" | "status">
>;

export async function updateUser(userId: string, input: UpdateUserInput): Promise<void> {
  const admin = createSupabaseAdminClient();

  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.role !== undefined) patch.role = input.role;
  if (input.branches !== undefined) patch.branches = input.branches;
  if (input.pageAccess !== undefined) patch.page_access = input.pageAccess;
  if (input.canCloseDates !== undefined) patch.can_close_dates = input.canCloseDates;
  if (input.status !== undefined) patch.status = input.status;

  const { error } = await admin.from("dashboard_profiles").update(patch).eq("user_id", userId);
  if (error) throw new Error(error.message);
}

export async function deleteUser(userId: string): Promise<void> {
  const admin = createSupabaseAdminClient();

  const { error: profileError } = await admin.from("dashboard_profiles").delete().eq("user_id", userId);
  if (profileError) throw new Error(profileError.message);

  const { error: adminRowError } = await admin.from("admins").delete().eq("user_id", userId);
  if (adminRowError) throw new Error(adminRowError.message);

  const { error: authError } = await admin.auth.admin.deleteUser(userId);
  if (authError) throw new Error(authError.message);
}

/** Generates a fresh password and sets it directly (same "show it once" flow
 * as account creation) — there's no invite-email/reset-link system here. */
export async function resetUserPassword(userId: string, password: string): Promise<void> {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.auth.admin.updateUserById(userId, { password });
  if (error) throw new Error(error.message);
}
