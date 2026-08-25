// Pure calendar derivation — no Supabase, no React. Safe to import from
// both server components and client components (which is why the capacity
// maths lives here rather than in lib/calendar/data.ts).

import { daysUntil } from "@/lib/mt/dates";
import type { BlockedDate } from "@/lib/bookings/blocked-dates";
import type { OrderRecord } from "@/lib/orders/types";
import {
  countsTowardCapacity,
  type CalendarCapacity,
  type CalendarDay,
  type CalendarEvent,
  type DayStatus,
} from "./types";

/** The storefront enforces a 3-day minimum lead time
 * (herbies' app/order/confirm/page.tsx: "Please book at least 3 days before
 * your event"). An order landing at that floor is operationally a rush for
 * the kitchen, so that's the threshold — derived from existing
 * created_at/event_date, no new field. */
export const RUSH_THRESHOLD_DAYS = 3;

/** Parses the free-text `event_time` ("8:00 AM", "5:00 PM", "14:30") into
 * minutes past midnight. Returns null rather than guessing when the format
 * isn't recognised — an unsortable time sorts last instead of pretending to
 * be midnight. */
export function parseEventTime(value: string | null): number | null {
  if (!value) return null;
  const match = /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i.exec(value.trim());
  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = Number(match[2] ?? 0);
  const meridiem = match[3]?.toLowerCase();

  if (Number.isNaN(hours) || Number.isNaN(minutes) || hours > 23 || minutes > 59) return null;

  if (meridiem === "pm" && hours < 12) hours += 12;
  if (meridiem === "am" && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

/** Was this order booked inside the rush window? */
export function isRushOrder(order: OrderRecord, threshold = RUSH_THRESHOLD_DAYS): boolean {
  if (!order.eventDate || !order.createdAt) return false;
  const bookedOn = order.createdAt.slice(0, 10);
  const lead = daysUntil(order.eventDate, bookedOn);
  return lead !== null && lead >= 0 && lead <= threshold;
}

export function toCalendarEvent(order: OrderRecord): CalendarEvent {
  return { order, timeMinutes: parseEventTime(order.eventTime), isRush: isRushOrder(order) };
}

/** Chronological within a day — untimed events sort last, then by name so
 * the order is stable rather than dependent on fetch order. */
export function sortEvents(events: CalendarEvent[]): CalendarEvent[] {
  return events.slice().sort((a, b) => {
    if (a.timeMinutes === null && b.timeMinutes === null) {
      return a.order.orderNumber.localeCompare(b.order.orderNumber);
    }
    if (a.timeMinutes === null) return 1;
    if (b.timeMinutes === null) return -1;
    return a.timeMinutes - b.timeMinutes || a.order.orderNumber.localeCompare(b.order.orderNumber);
  });
}

/** The capacity ceiling in force for a branch selection. `null` branch means
 * "All Branches", which sums every branch's ceiling — an all-branches view
 * of a 3+3+3 business can genuinely host 9 events. */
export function ceilingFor(capacities: CalendarCapacity[], branchId: string | null): { maxEvents: number; maxPax: number } {
  const scoped = branchId ? capacities.filter((c) => c.branch === branchId) : capacities;
  return {
    maxEvents: scoped.reduce((sum, c) => sum + c.maxEventsPerDay, 0),
    maxPax: scoped.reduce((sum, c) => sum + c.maxPaxPerDay, 0),
  };
}

/** Classifies one day. Both ceilings are checked and the WORSE verdict wins:
 * a day can be full on event count while still having PAX headroom, and
 * either one being blown is a real operational problem. */
export function classifyDay(input: {
  eventCount: number;
  totalPax: number;
  maxEvents: number;
  maxPax: number;
  closed: boolean;
}): DayStatus {
  if (input.closed) return "closed";
  if (input.eventCount === 0) return "available";

  const overEvents = input.maxEvents > 0 && input.eventCount > input.maxEvents;
  const overPax = input.maxPax > 0 && input.totalPax > input.maxPax;
  if (overEvents || overPax) return "exceeded";

  const fullEvents = input.maxEvents > 0 && input.eventCount >= input.maxEvents;
  const fullPax = input.maxPax > 0 && input.totalPax >= input.maxPax;
  if (fullEvents || fullPax) return "full";

  // "Limited" once either ceiling is 70%+ consumed — near enough that the
  // admin should know before accepting another booking.
  const eventLoad = input.maxEvents > 0 ? input.eventCount / input.maxEvents : 0;
  const paxLoad = input.maxPax > 0 ? input.totalPax / input.maxPax : 0;
  if (Math.max(eventLoad, paxLoad) >= 0.7) return "limited";

  return "available";
}

/** Builds the day model for every date in `dates`, from orders already
 * scoped to the relevant range and branch by the caller. */
export function buildCalendarDays(input: {
  dates: string[];
  orders: OrderRecord[];
  blockedDates: BlockedDate[];
  capacities: CalendarCapacity[];
  branchId: string | null;
}): Map<string, CalendarDay> {
  const { maxEvents, maxPax } = ceilingFor(input.capacities, input.branchId);

  const eventsByDate = new Map<string, CalendarEvent[]>();
  for (const order of input.orders) {
    if (!order.eventDate) continue;
    const list = eventsByDate.get(order.eventDate);
    const event = toCalendarEvent(order);
    if (list) list.push(event);
    else eventsByDate.set(order.eventDate, [event]);
  }

  // A block with a null branch closes every branch; a branch-specific block
  // only closes that branch — same rule the customer date picker applies.
  const blockedByDate = new Map<string, BlockedDate>();
  for (const block of input.blockedDates) {
    if (block.branch !== null && input.branchId !== null && block.branch !== input.branchId) continue;
    blockedByDate.set(block.date, block);
  }

  const days = new Map<string, CalendarDay>();
  for (const date of input.dates) {
    const events = sortEvents(eventsByDate.get(date) ?? []);
    const counting = events.filter((e) => countsTowardCapacity(e.order));
    const eventCount = counting.length;
    const totalPax = counting.reduce((sum, e) => sum + (e.order.pax ?? 0), 0);
    const block = blockedByDate.get(date);

    days.set(date, {
      date,
      events,
      eventCount,
      totalPax,
      maxEvents,
      maxPax,
      status: classifyDay({ eventCount, totalPax, maxEvents, maxPax, closed: !!block }),
      closedReason: block?.reason ?? null,
      paxUtilization: maxPax > 0 ? (totalPax / maxPax) * 100 : 0,
    });
  }

  return days;
}
