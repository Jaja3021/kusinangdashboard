// Who can do what, expressed once.
//
// Role-derived capabilities gate server actions (money/inventory/user
// management); per-page visibility is a separate, per-user concept now (see
// lib/auth/page-access.ts) rather than being role-derived.

import type { UserAccount } from "./user-store";

export type Role = UserAccount["role"];

export const CAPABILITIES = [
  /** Financial reports, margins, owner dashboards, cost prices. */
  "view:financials",
  /** Create/edit/delete ingredients, suppliers, and recipes. */
  "manage:inventory",
  /** Receive stock, record waste and adjustments. */
  "manage:stock",
  /** Generate purchase lists and create/send purchase orders. */
  "manage:purchasing",
  /** Create/edit bookings and orders, change PAX. */
  "manage:bookings",
  /** Block dates and move events on the catering calendar. */
  "manage:calendar",
  /** Change per-branch max events/PAX per day. */
  "manage:capacity",
  /** See the kitchen board, recipes, and prep quantities. */
  "view:kitchen",
  /** Create and suspend dashboard accounts. */
  "manage:users",
  /** Review, approve, and reject customer booking change requests filed
   * from the Meal Builder. */
  "approve:change-requests",
] as const;

export type Capability = (typeof CAPABILITIES)[number];

const ROLE_CAPABILITIES: Record<Role, Capability[]> = {
  Owner: [...CAPABILITIES],
  Developer: [...CAPABILITIES],
  Admin: [
    "manage:inventory",
    "manage:stock",
    "manage:purchasing",
    "manage:bookings",
    "manage:calendar",
    "manage:capacity",
    "view:kitchen",
    "approve:change-requests",
  ],
  "Branch Manager": [
    "manage:inventory",
    "manage:stock",
    "manage:purchasing",
    "manage:bookings",
    "manage:calendar",
    "view:kitchen",
    "approve:change-requests",
  ],
  "Sales Staff": ["manage:bookings"],
  "Kitchen Staff": ["view:kitchen"],
  "Operations Staff": ["manage:inventory", "manage:stock", "view:kitchen"],
  "Finance Staff": ["view:financials", "manage:purchasing"],
  // Internal/support accounts: no business capabilities by default — what
  // they can see is driven entirely by their per-user page access.
  "Tech Team": [],
};

export function can(role: Role | undefined | null, capability: Capability): boolean {
  if (!role) return false;
  return ROLE_CAPABILITIES[role]?.includes(capability) ?? false;
}

export function capabilitiesFor(role: Role): Capability[] {
  return ROLE_CAPABILITIES[role] ?? [];
}

/** Every capability in `required` — use for pages that need more than one. */
export function canAll(role: Role | undefined | null, required: Capability[]): boolean {
  return required.every((c) => can(role, c));
}

/** Any one of `required` — use for a nav entry that several roles reach for
 * different reasons. */
export function canAny(role: Role | undefined | null, required: Capability[]): boolean {
  return required.some((c) => can(role, c));
}
