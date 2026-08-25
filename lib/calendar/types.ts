// Catering Calendar — capacity model and day-level derivation.
//
// Everything here is derived from data that already exists: public.orders
// (an order IS the booking), public.blocked_dates (shared with the customer
// menu builder), and public.calendar_capacity (the one new table). Nothing
// in this module writes.

import type { OrderRecord, OrderStatus } from "@/lib/orders/types";

export type CalendarCapacity = {
  branch: string;
  maxEventsPerDay: number;
  maxPaxPerDay: number;
};

/** 🟢 / 🟡 / 🔴 / ⚫ / 🚨 — the day's headline state.
 *  `closed` always wins (an explicitly blocked date is closed regardless of
 *  how empty it is); `exceeded` outranks `full` so an over-booked day never
 *  hides behind a merely-full one. */
export type DayStatus = "available" | "limited" | "full" | "exceeded" | "closed";

export const DAY_STATUS_LABEL: Record<DayStatus, string> = {
  available: "Available",
  limited: "Limited",
  full: "Fully Booked",
  exceeded: "Capacity Exceeded",
  closed: "Closed",
};

export const DAY_STATUS_EMOJI: Record<DayStatus, string> = {
  available: "🟢",
  limited: "🟡",
  full: "🔴",
  exceeded: "🚨",
  closed: "⚫",
};

/** Statuses that do NOT consume kitchen capacity. A cancelled event is still
 * drawn on the calendar (greyed) for history, but must never count toward
 * the day's PAX or event totals. */
export const NON_CAPACITY_STATUSES: OrderStatus[] = ["Cancelled"];

export function countsTowardCapacity(order: OrderRecord): boolean {
  return !NON_CAPACITY_STATUSES.includes(order.status);
}

export type CalendarEvent = {
  order: OrderRecord;
  /** Minutes past midnight parsed from the free-text `event_time`, or null
   * when it's missing/unparseable — used only for sorting. */
  timeMinutes: number | null;
  isRush: boolean;
};

export type CalendarDay = {
  date: string; // YYYY-MM-DD
  events: CalendarEvent[];
  eventCount: number; // capacity-counting events only
  totalPax: number; // capacity-counting events only
  maxEvents: number;
  maxPax: number;
  status: DayStatus;
  /** Blocked-date reason, when the day is explicitly closed. */
  closedReason: string | null;
  /** Percentage of the PAX ceiling used, 0 when no ceiling is configured. */
  paxUtilization: number;
};
