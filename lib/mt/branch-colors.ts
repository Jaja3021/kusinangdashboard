// Client-safe (no server imports) — the fixed color vocabulary a branch's
// name/badge/dot styling is derived from, both for the 3 original branches
// and any added later via the Add Branch modal.

export const BRANCH_COLOR_NAMES = ["orange", "blue", "purple", "green", "pink", "teal", "indigo"] as const;

/** All colors valid in storage — includes "red", Cavite's legacy color, kept
 * for backward compatibility but not offered as a choice for new branches. */
export type BranchColorName = (typeof BRANCH_COLOR_NAMES)[number] | "red";

type ColorStyle = { badge: string; dot: string; color: string };

export const BRANCH_COLOR_PRESETS: Record<BranchColorName, ColorStyle> = {
  red: { badge: "bg-red-100 text-red-700", dot: "bg-red-500", color: "#dc2626" },
  orange: { badge: "bg-orange-100 text-orange-700", dot: "bg-orange-500", color: "#eb6834" },
  blue: { badge: "bg-sky-100 text-sky-700", dot: "bg-sky-500", color: "#2a78d6" },
  purple: { badge: "bg-purple-100 text-purple-700", dot: "bg-purple-500", color: "#4a3aa7" },
  green: { badge: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500", color: "#1baf7a" },
  pink: { badge: "bg-pink-100 text-pink-700", dot: "bg-pink-500", color: "#db2777" },
  teal: { badge: "bg-teal-100 text-teal-700", dot: "bg-teal-500", color: "#0d9488" },
  indigo: { badge: "bg-indigo-100 text-indigo-700", dot: "bg-indigo-500", color: "#4f46e5" },
};

export function stylesFor(color: string): ColorStyle {
  return BRANCH_COLOR_PRESETS[color as BranchColorName] ?? BRANCH_COLOR_PRESETS.orange;
}
