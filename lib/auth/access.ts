// Role-only logic with no server imports, so client components (Sidebar,
// CateringCalendar, ...) can use it without pulling in next/headers via
// lib/auth/current-user.ts's Supabase server client.
import type { UserAccount } from "./user-store";

/** Owner and Developer accounts see and can do everything — every per-page
 * and per-capability check bypasses its list for these two roles. */
export function hasFullAccess(role: UserAccount["role"] | undefined | null): boolean {
  return role === "Owner" || role === "Developer";
}
