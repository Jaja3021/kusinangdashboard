// Who can do what, expressed once.
//
// The brief this was built from names four roles (Owner / Admin / Kitchen
// Staff / Purchasing Staff), but public.dashboard_profiles already constrains
// `role` to five different ones and there are live accounts using them
// (supabase/dashboard_profiles.sql). Rather than alter that constraint and
// migrate existing users, the intended roles are MAPPED onto the existing
// five — the capability, not the role name, is what pages check:
//
//   Owner             → the brief's Owner (everything, incl. financials)
//   Branch Manager    → the brief's Admin + Purchasing Staff
//   Event Coordinator → bookings/calendar, no money and no inventory writes
//   Finance Officer   → financials + purchasing approval, no kitchen writes
//   Staff             → the brief's Kitchen Staff (read-only prep view)

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
  "Branch Manager": [
    "manage:inventory",
    "manage:stock",
    "manage:purchasing",
    "manage:bookings",
    "manage:calendar",
    "view:kitchen",
    "approve:change-requests",
  ],
  "Event Coordinator": ["manage:bookings", "manage:calendar", "view:kitchen", "approve:change-requests"],
  "Finance Officer": ["view:financials", "manage:purchasing"],
  // Kitchen staff: sees what to cook and what it needs, changes no prices,
  // reads no financial report, deletes no history.
  Staff: ["view:kitchen"],
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
