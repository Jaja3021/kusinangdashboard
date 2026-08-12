// Branch registry. One source of truth for the chart series color and the badge
// treatment, so a branch always looks the same wherever it appears.

import { CHART } from "@/lib/chart-colors";
import { ALL_BRANCHES } from "./revenue";

export { ALL_BRANCHES };

export type Branch = {
  id: string;
  name: string;
  /** Categorical slot, assigned by position and never cycled. */
  color: string;
  /** Tailwind classes for the branch badge. */
  badge: string;
  /** Tailwind class for the legend/status dot. */
  dot: string;
};

export const BRANCHES: Branch[] = [
  {
    id: "cavite",
    name: "Cavite",
    color: CHART.series1,
    badge: "bg-sky-100 text-sky-700",
    dot: "bg-sky-500",
  },
  {
    id: "laguna",
    name: "Laguna",
    color: CHART.series2,
    badge: "bg-orange-100 text-orange-700",
    dot: "bg-orange-500",
  },
  {
    id: "metro-manila",
    name: "Metro Manila",
    color: CHART.series3,
    badge: "bg-emerald-100 text-emerald-700",
    dot: "bg-emerald-500",
  },
];

export const BRANCH_NAMES = BRANCHES.map((b) => b.name);

/** `All Branches` first, then each branch — the selector's option list. */
export const BRANCH_OPTIONS = [ALL_BRANCHES, ...BRANCH_NAMES];

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
