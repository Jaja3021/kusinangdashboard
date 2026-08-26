// Server-side capability enforcement — the first of its kind in this repo.
// Every existing server action relies purely on RLS's public.is_admin(),
// which cannot distinguish Owner from Staff (every dashboard account gets
// an admins row). That's fine for actions where "any admin may do this" is
// the actual policy, but change-request approval moves money and inventory,
// and the brief explicitly requires more than frontend button visibility.
//
// Honest limitation: this only gates the Server Action entry point. Because
// approve_change_request()/reject_change_request() are SECURITY DEFINER and
// granted to `authenticated`, a signed-in Staff-role user could still call
// them directly via PostgREST/supabase-js, bypassing this check entirely.
// Closing that properly means teaching is_admin() (or a new function) about
// dashboard_profiles.role, which would touch every policy in every existing
// supabase/*.sql file in this project — out of scope here. This is
// defense-in-depth for the dashboard UI's own call path, not a replacement
// for RLS.

import { getCurrentUser, type CurrentUser } from "./current-user";
import { hasFullAccess } from "./access";
import { can, type Capability } from "./permissions";

export async function requireCapability(capability: Capability): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("You are not signed in.");
  if (!can(user.role, capability)) {
    throw new Error(`Your role (${user.role}) is not allowed to ${capability.replace(":", " ")}.`);
  }
  return user;
}

/** Gates blocking/unblocking calendar dates — an independent per-user flag
 * (the Add User form's "Admin — can close dates" checkbox), not a
 * role-derived capability. */
export async function requireCanCloseDates(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("You are not signed in.");
  if (!hasFullAccess(user.role) && !user.canCloseDates) {
    throw new Error("You are not allowed to close or reopen dates.");
  }
  return user;
}
