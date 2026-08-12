// Lead-source rollup for the Inquiry Sources donut.

import { CATEGORICAL, CATEGORICAL_MAX, OTHERS_COLOR } from "@/lib/chart-colors";
import type { Opportunity } from "./types";

/**
 * Named categories the donut will show before the rest fold into "Others".
 * Capped by the validated palette — see lib/chart-colors.ts for why four slots
 * is the ceiling and the last one belongs to the rollup.
 */
const TOP_N = CATEGORICAL_MAX - 1;

const IGNORED = new Set(["", "Other", "Unknown"]);

export type SourceSlice = { name: string; value: number; color: string };

export function inquirySources(opportunities: Opportunity[] = []): SourceSlice[] {
  const counts = new Map<string, number>();

  for (const o of opportunities) {
    const source = typeof o.source === "string" ? o.source.trim() : "";
    if (IGNORED.has(source)) continue;
    counts.set(source, (counts.get(source) ?? 0) + 1);
  }

  if (counts.size === 0) return [];

  // Count desc, then name asc so equal counts keep a stable order.
  const ranked = [...counts.entries()].sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
  );

  const slices: SourceSlice[] = ranked
    .slice(0, TOP_N)
    .map(([name, value], i) => ({ name, value, color: CATEGORICAL[i] }));

  const rest = ranked.slice(TOP_N);
  if (rest.length > 0) {
    slices.push({
      name: "Others",
      value: rest.reduce((total, [, count]) => total + count, 0),
      color: OTHERS_COLOR,
    });
  }

  return slices;
}
