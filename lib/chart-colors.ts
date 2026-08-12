// Validated categorical/sequential chart palette (dataviz skill, references/palette.md).
// Slots are documented and CVD-checked — do not hand-pick alternate hues here.
//
// Validated with scripts/validate_palette.js against the white card surface the
// charts actually render on:
//
//   node scripts/validate_palette.js "#2a78d6,#eb6834,#1baf7a,#4a3aa7" \
//     --mode light --surface "#ffffff" --pairs all
//   → ALL CHECKS PASS (worst all-pairs CVD ΔE 9.2, normal-vision ΔE 16.3)
//
// `--pairs all` because both charts that use these show every series at once.
// That run caps us at FOUR slots: adding a fifth (yellow or magenta) drops the
// normal-vision floor to 12.9–13.7, and a gray "Others" fails the chroma floor
// outright. Hence CATEGORICAL_MAX below — a 5th category folds into "Others".
//
// series3 (aqua) sits at 2.82:1 on white, under the 3:1 bar. The relief rule
// applies: every chart using it ships a visible legend, so identity is never
// carried by color alone.

export const CHART = {
  series1: "#2a78d6", // blue — categorical slot 1
  series2: "#eb6834", // orange — categorical slot 2
  series3: "#1baf7a", // aqua — categorical slot 3
  series4: "#4a3aa7", // violet — categorical slot 4 / the "Others" bucket
  grid: "#e1e0d9",
  axis: "#c3c2b7",
  mutedText: "#898781",
} as const;

/** Fixed categorical order. Assign by index, never cycle past the end. */
export const CATEGORICAL = [
  CHART.series1,
  CHART.series2,
  CHART.series3,
  CHART.series4,
] as const;

/**
 * How many real categories may share one chart before the palette stops
 * validating. The last slot is reserved for the "Others" rollup, so a chart
 * shows at most CATEGORICAL_MAX - 1 named categories plus "Others".
 */
export const CATEGORICAL_MAX = CATEGORICAL.length;

/** The "Others" / residual bucket — the last validated slot, not gray. */
export const OTHERS_COLOR = CHART.series4;
