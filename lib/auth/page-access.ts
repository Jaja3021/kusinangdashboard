// Per-user page access — a separate concept from role capabilities
// (lib/auth/permissions.ts). Roles gate what a user may *do* (approve a
// change request, edit inventory); page access gates what a user may even
// *navigate to*, and is assigned per-user in the Add User form.
//
// The checkbox groups are derived from the same NAV config the sidebar
// renders, so there's exactly one list of "pages" in the app.

import { NAV, isNavPathActive } from "@/components/shell/nav";
import type { CurrentUser } from "./current-user";
import { hasFullAccess } from "./access";

export type PageAccessGroup = {
  label: string;
  paths: { path: string; label: string }[];
};

/** User Access itself is never assignable — only Owner/Developer accounts
 * manage other accounts, so it's excluded from the checklist entirely
 * (rather than being a checkbox nobody may check). */
const USER_ACCESS_PATH = "/dashboard/user-access";

export const PAGE_ACCESS_GROUPS: PageAccessGroup[] = NAV.map((group) => ({
  label: group.label ?? "MAIN",
  paths: group.items
    .filter((item) => item.path !== USER_ACCESS_PATH)
    .map((item) => ({ path: item.path, label: item.label })),
})).filter((group) => group.paths.length > 0);

export const ALL_PAGE_PATHS = PAGE_ACCESS_GROUPS.flatMap((g) => g.paths.map((p) => p.path));

/** Mirrors the sidebar's own active-link matching: "/dashboard" is exact,
 * everything else matches itself or a real sub-route (so
 * /dashboard/orders/123 is covered by a grant of /dashboard/orders, but a
 * grant of /dashboard/kitchen does NOT also cover the sibling
 * /dashboard/kitchen-today or /dashboard/kitchen-board). User Access is
 * always owner-only and never granted through page_access, no matter what's
 * stored there. */
export function hasPageAccess(user: Pick<CurrentUser, "role" | "pageAccess">, path: string): boolean {
  if (hasFullAccess(user.role)) return true;
  if (path.startsWith(USER_ACCESS_PATH)) return false;
  return user.pageAccess.some((granted) => isNavPathActive(path, granted));
}
