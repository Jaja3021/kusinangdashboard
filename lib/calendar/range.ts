// Pure date-range math for the three calendar views. Kept separate from
// lib/calendar/calc.ts (which turns orders into day status) so this can be
// called from the server component that decides HOW MUCH to fetch —
// req #20's "only retrieve the orders needed for the selected date range" —
// before any order data exists yet.

export type CalendarView = "month" | "week" | "day";

const pad = (n: number) => String(n).padStart(2, "0");
const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseISO = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};

/** Sun-start weeks covering the month `referenceDate` falls in, trimmed to
 * the fewest whole weeks that still contain every day of that month — the
 * same heuristic components/dashboard/BookingsCalendar.tsx already uses, so
 * the grid looks identical between the two calendars. */
export function monthGridDates(referenceDate: string): string[] {
  const ref = parseISO(referenceDate);
  const firstOfMonth = new Date(ref.getFullYear(), ref.getMonth(), 1);
  const gridStart = new Date(firstOfMonth);
  gridStart.setDate(gridStart.getDate() - firstOfMonth.getDay());

  const weeks: Date[][] = [];
  const cursor = new Date(gridStart);
  for (let w = 0; w < 6; w++) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
    if (cursor.getMonth() !== ref.getMonth() && week.some((d) => d.getMonth() === ref.getMonth())) {
      if (weeks.length >= 4) break;
    }
  }
  return weeks.flat().map(toISO);
}

/** The 7 Sun-Sat dates containing `referenceDate`. */
export function weekDates(referenceDate: string): string[] {
  const ref = parseISO(referenceDate);
  const start = new Date(ref);
  start.setDate(start.getDate() - start.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return toISO(d);
  });
}

export function addMonths(referenceDate: string, delta: number): string {
  const ref = parseISO(referenceDate);
  return toISO(new Date(ref.getFullYear(), ref.getMonth() + delta, 1));
}

export function addDaysISO(referenceDate: string, delta: number): string {
  const ref = parseISO(referenceDate);
  ref.setDate(ref.getDate() + delta);
  return toISO(ref);
}

export function monthLabel(referenceDate: string): string {
  return parseISO(referenceDate).toLocaleDateString("en-PH", { month: "long", year: "numeric" });
}

export function dayLabel(referenceDate: string): string {
  return parseISO(referenceDate).toLocaleDateString("en-PH", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

export function weekLabel(referenceDate: string): string {
  const dates = weekDates(referenceDate);
  const start = parseISO(dates[0]);
  const end = parseISO(dates[6]);
  const sameMonth = start.getMonth() === end.getMonth();
  const startLabel = start.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
  const endLabel = end.toLocaleDateString("en-PH", sameMonth ? { day: "numeric", year: "numeric" } : { month: "short", day: "numeric", year: "numeric" });
  return `${startLabel} – ${endLabel}`;
}

/** The exact set of dates a view displays, and the [from, to] query window
 * that covers them — always the same span, since every cell shown must be
 * fetchable. */
export function rangeForView(view: CalendarView, referenceDate: string): { dates: string[]; from: string; to: string } {
  const dates = view === "month" ? monthGridDates(referenceDate) : view === "week" ? weekDates(referenceDate) : [referenceDate];
  return { dates, from: dates[0], to: dates[dates.length - 1] };
}
