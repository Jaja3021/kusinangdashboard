// Date helpers. The business runs in Asia/Manila, so "today" is resolved in
// that zone rather than the viewer's — matching the deployed dashboard.

import type { DateRange } from "./types";

const MANILA = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Manila",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

/** Today in Asia/Manila as `YYYY-MM-DD`. */
export function todayManila(date: Date = new Date()): string {
  return MANILA.format(date);
}

/** Normalise anything date-ish to a `YYYY-MM-DD` key, or `""` if unusable. */
export function toDateKey(value: string | Date | null | undefined): string {
  if (value == null || value === "") return "";
  if (typeof value === "string" && DATE_KEY.test(value)) return value;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? "" : MANILA.format(d);
}

export type PresetId =
  | "this-month"
  | "last-3-months"
  | "this-year"
  | "last-12-months"
  | "all-time"
  | "custom";

export const PRESETS: { id: PresetId; label: string }[] = [
  { id: "this-month", label: "This month" },
  { id: "last-3-months", label: "Last 3 months" },
  { id: "this-year", label: "This year" },
  { id: "last-12-months", label: "Last 12 months" },
  { id: "all-time", label: "All time" },
  { id: "custom", label: "Custom…" },
];

export const DEFAULT_PRESET: PresetId = "this-year";

const pad = (n: number) => String(n).padStart(2, "0");
const key = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;

function daysInMonth(year: number, month: number): number {
  const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  return [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
}

function shiftMonth(year: number, month: number, delta: number) {
  const total = year * 12 + (month - 1) + delta;
  return { year: Math.floor(total / 12), month: (total % 12) + 1 };
}

/** Resolve a preset (plus any custom window) into a concrete inclusive range. */
export function rangeFor(
  preset: PresetId,
  custom: Partial<DateRange> = {},
  today: string = todayManila(),
): DateRange {
  const [year, month] = today.split("-").map(Number);

  switch (preset) {
    case "this-month":
      return { from: key(year, month, 1), to: key(year, month, daysInMonth(year, month)) };
    case "last-3-months": {
      const start = shiftMonth(year, month, -2);
      return {
        from: key(start.year, start.month, 1),
        to: key(year, month, daysInMonth(year, month)),
      };
    }
    case "this-year":
      return { from: key(year, 1, 1), to: key(year, 12, 31) };
    case "last-12-months": {
      const start = shiftMonth(year, month, -11);
      return {
        from: key(start.year, start.month, 1),
        to: key(year, month, daysInMonth(year, month)),
      };
    }
    case "all-time":
      return { from: "0000-01-01", to: "9999-12-31" };
    case "custom":
      return {
        from: custom.from || "0000-01-01",
        to: custom.to || "9999-12-31",
      };
  }
}

/** Human label for the current selection — custom ranges spell out their dates. */
export function presetLabel(preset: PresetId, range: DateRange): string {
  if (preset !== "custom") {
    return PRESETS.find((p) => p.id === preset)?.label ?? "";
  }
  if (!range.from || !range.to) return "Custom…";
  return `${range.from} → ${range.to}`;
}

/** Inclusive membership test that tolerates missing dates. */
export function inRange(date: string | null | undefined, range: DateRange): boolean {
  if (!date) return false;
  return date >= range.from && date <= range.to;
}

/** Whole days from `date` to `reference` (negative = in the past). */
export function daysUntil(date: string, reference: string): number | null {
  const a = Date.parse(`${date}T00:00:00`);
  const b = Date.parse(`${reference}T00:00:00`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.round((a - b) / 86_400_000);
}

/** Shift a `YYYY-MM-DD` key by N days, staying in date-key space. */
export function addDays(dateKey: string, days: number): string {
  const d = new Date(`${dateKey}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
