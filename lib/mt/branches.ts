// Branch registry. Backed by Supabase's public.branches table (see
// supabase/branches.sql) — this module holds the *current* list as a live
// module binding (`export let BRANCHES`), reassigned wholesale by
// setBranches() rather than mutated in place. Every existing
// `import { BRANCHES } from "@/lib/mt/branches"` across the app reads that
// same live binding, so priming it once per server request (see
// app/dashboard/layout.tsx) and once on the client (see BranchProvider)
// keeps every consumer in sync with zero per-call-site changes.
//
// getBranchNames()/getBranchOptions() are functions rather than eagerly
// computed consts for the same reason — a plain `const X = BRANCHES.map(...)`
// would freeze at the value BRANCHES had at first import.

import { ALL_BRANCHES } from "./revenue";
import { stylesFor, type BranchColorName } from "./branch-colors";

export { ALL_BRANCHES };

export type Branch = {
  id: string;
  name: string;
  colorName: BranchColorName;
  /** Categorical slot for chart series. */
  color: string;
  /** Tailwind classes for the branch badge. */
  badge: string;
  /** Tailwind class for the legend/status dot. */
  dot: string;
};

function toBranch(row: { id: string; name: string; colorName: BranchColorName }): Branch {
  const styles = stylesFor(row.colorName);
  return { id: row.id, name: row.name, colorName: row.colorName, ...styles };
}

/** Seed/fallback — what the app shows before the first live fetch lands
 * (module load, or a fetch failure). Matches supabase/branches.sql's seed. */
const DEFAULT_BRANCHES: Branch[] = (
  [
    { id: "cavite", name: "Cavite", colorName: "red" },
    { id: "laguna", name: "Laguna", colorName: "orange" },
    { id: "metro-manila", name: "Metro Manila", colorName: "green" },
  ] satisfies { id: string; name: string; colorName: BranchColorName }[]
).map(toBranch);

export let BRANCHES: Branch[] = DEFAULT_BRANCHES;

/** Replaces the live branch list — called once per server request (layout)
 * and once on client mount (BranchProvider), plus right after Add Branch
 * succeeds so the new branch shows up without a full reload. */
export function setBranches(rows: { id: string; name: string; colorName: BranchColorName }[]): void {
  BRANCHES = rows.length > 0 ? rows.map(toBranch) : DEFAULT_BRANCHES;
}

export function getBranchNames(): string[] {
  return BRANCHES.map((b) => b.name);
}

/** `All Branches` first, then each branch — the selector's option list. */
export function getBranchOptions(): string[] {
  return [ALL_BRANCHES, ...getBranchNames()];
}

export function getBranchByName(name: string): Branch | undefined {
  return BRANCHES.find((b) => b.name === name);
}

/** Translates the raw branch id Supabase orders store (e.g. "cavite") into a registry entry. */
export function getBranchById(id: string): Branch | undefined {
  return BRANCHES.find((b) => b.id === id);
}

/** Which branches a selection covers — one, or all of them. */
export function branchesInScope(selected: string): Branch[] {
  if (selected === ALL_BRANCHES) return BRANCHES;
  const match = getBranchByName(selected);
  return match ? [match] : BRANCHES;
}

/** Real orders (id-keyed `branch`) scoped to the topbar's selected branch (name-keyed). */
export function ordersInBranch<T extends { branch: string | null }>(
  orders: T[],
  selectedBranch: string,
): T[] {
  if (selectedBranch === ALL_BRANCHES) return orders;
  const match = getBranchByName(selectedBranch);
  return match ? orders.filter((o) => o.branch === match.id) : orders;
}
