"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Ban,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Search,
  Settings,
  Users,
  X,
} from "lucide-react";
import Modal from "@/components/ui/Modal";
import Badge, { StatusBadge } from "@/components/ui/Badge";
import { useBranch } from "@/components/providers/BranchProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import { can } from "@/lib/auth/permissions";
import { ALL_BRANCHES, getBranchByName, getBranchById } from "@/lib/mt/branches";
import { todayManila } from "@/lib/mt/dates";
import {
  addDaysISO,
  addMonths,
  dayLabel,
  monthGridDates,
  monthLabel,
  weekDates,
  weekLabel,
  type CalendarView,
} from "@/lib/calendar/range";
import { buildCalendarDays } from "@/lib/calendar/calc";
import { DAY_STATUS_EMOJI, DAY_STATUS_LABEL, type CalendarCapacity, type CalendarDay, type DayStatus } from "@/lib/calendar/types";
import { ORDER_STATUSES, PAYMENT_STATUSES, type OrderRecord, type OrderStatus, type PaymentStatus } from "@/lib/orders/types";
import type { BlockedDate } from "@/lib/bookings/blocked-dates";
import { blockDateAction, unblockDateAction, updateCalendarCapacityAction } from "@/app/dashboard/calendar/actions";

const WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

const STATUS_BG: Record<DayStatus, string> = {
  available: "bg-white",
  limited: "bg-amber-50/60",
  full: "bg-red-50/60",
  exceeded: "bg-red-100/80",
  closed: "bg-gray-100",
};

const STATUS_RING: Record<DayStatus, string> = {
  available: "",
  limited: "ring-1 ring-inset ring-amber-300",
  full: "ring-1 ring-inset ring-red-300",
  exceeded: "ring-2 ring-inset ring-red-500",
  closed: "ring-1 ring-inset ring-gray-300",
};

type Filters = {
  search: string;
  eventType: string;
  status: OrderStatus | "All Statuses";
  paymentStatus: PaymentStatus | "All Payment Statuses";
  paxMin: string;
  paxMax: string;
};

const EMPTY_FILTERS: Filters = {
  search: "",
  eventType: "All Events",
  status: "All Statuses",
  paymentStatus: "All Payment Statuses",
  paxMin: "",
  paxMax: "",
};

/** ₱-owing summary shown per booking row. We only know the *status*, not the
 * actual amount paid on partially-settled orders, so those read as "Balance
 * unknown" rather than guessing a figure. */
function paymentSummary(order: OrderRecord): { label: string; tone: string } {
  if (order.paymentStatus === "Paid") return { label: "Paid", tone: "text-emerald-600" };
  if (order.paymentStatus === "Unpaid") return { label: `₱${order.total.toLocaleString()} owing`, tone: "text-amber-600" };
  return { label: "Balance unknown", tone: "text-amber-600" };
}

function matchesFilters(order: OrderRecord, filters: Filters): boolean {
  if (filters.eventType !== "All Events" && (order.eventType || "Other") !== filters.eventType) return false;
  if (filters.status !== "All Statuses" && order.status !== filters.status) return false;
  if (filters.paymentStatus !== "All Payment Statuses" && order.paymentStatus !== filters.paymentStatus) return false;

  const pax = order.pax ?? 0;
  if (filters.paxMin && pax < Number(filters.paxMin)) return false;
  if (filters.paxMax && pax > Number(filters.paxMax)) return false;

  const q = filters.search.trim().toLowerCase();
  if (q) {
    const haystack = `${order.firstName} ${order.lastName} ${order.orderNumber} ${order.eventType ?? ""}`.toLowerCase();
    if (!haystack.includes(q)) return false;
  }
  return true;
}

export default function CateringCalendar({
  view,
  referenceDate,
  orders,
  blockedDates,
  capacities,
}: {
  view: CalendarView;
  referenceDate: string;
  orders: OrderRecord[];
  blockedDates: BlockedDate[];
  capacities: CalendarCapacity[];
}) {
  const router = useRouter();
  const { selectedBranch } = useBranch();
  const { user } = useAuth();

  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [blockReason, setBlockReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [closingFormOpen, setClosingFormOpen] = useState(false);
  const [localBlockedDates, setLocalBlockedDates] = useState(blockedDates);
  const [localCapacities, setLocalCapacities] = useState(capacities);

  const branchId = selectedBranch === ALL_BRANCHES ? null : (getBranchByName(selectedBranch)?.id ?? null);
  const canManageCalendar = can(user.role, "manage:calendar");
  const canManageCapacity = can(user.role, "manage:capacity");

  const scopedOrders = useMemo(
    () => (branchId ? orders.filter((o) => o.branch === branchId) : orders),
    [orders, branchId],
  );

  const filteredOrderIds = useMemo(
    () => new Set(scopedOrders.filter((o) => matchesFilters(o, filters)).map((o) => o.id)),
    [scopedOrders, filters],
  );

  const eventTypeOptions = useMemo(() => {
    const set = new Set(scopedOrders.map((o) => o.eventType || "Other"));
    return ["All Events", ...[...set].sort()];
  }, [scopedOrders]);

  // Day status/capacity is always computed from the FULL scoped order set,
  // never the filtered one — filters help find an event, they must never
  // make an overbooked day look green.
  const days = useMemo(
    () =>
      buildCalendarDays({
        dates: view === "month" ? monthGridDates(referenceDate) : view === "week" ? weekDates(referenceDate) : [referenceDate],
        orders: scopedOrders,
        blockedDates: localBlockedDates,
        capacities: localCapacities,
        branchId,
      }),
    [view, referenceDate, scopedOrders, localBlockedDates, localCapacities, branchId],
  );

  const todayISO = todayManila();
  const selectedDay = selectedDate ? days.get(selectedDate) : undefined;
  const selectedBlock = selectedDate ? localBlockedDates.find((b) => b.date === selectedDate && (b.branch === null || b.branch === branchId)) : undefined;

  function navigate(nextView: CalendarView, nextDate: string) {
    router.push(`/dashboard/calendar?view=${nextView}&date=${nextDate}`);
  }

  function goPrev() {
    if (view === "month") navigate(view, addMonths(referenceDate, -1));
    else if (view === "week") navigate(view, addDaysISO(referenceDate, -7));
    else navigate(view, addDaysISO(referenceDate, -1));
  }
  function goNext() {
    if (view === "month") navigate(view, addMonths(referenceDate, 1));
    else if (view === "week") navigate(view, addDaysISO(referenceDate, 7));
    else navigate(view, addDaysISO(referenceDate, 1));
  }
  function goToday() {
    navigate(view, todayISO);
  }

  async function handleToggleBlock() {
    if (!selectedDate) return;
    setSaving(true);
    try {
      if (selectedBlock) {
        await unblockDateAction(selectedDate);
        setLocalBlockedDates((prev) => prev.filter((b) => b.date !== selectedDate));
      } else {
        if (!blockReason.trim()) {
          alert("Give a reason for closing this date.");
          setSaving(false);
          return;
        }
        const created = await blockDateAction(selectedDate, blockReason.trim(), branchId);
        setLocalBlockedDates((prev) => [...prev.filter((b) => b.date !== selectedDate), created]);
        setBlockReason("");
        setClosingFormOpen(false);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update this date.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveCapacity(next: CalendarCapacity) {
    setSaving(true);
    try {
      await updateCalendarCapacityAction(next);
      setLocalCapacities((prev) => prev.map((c) => (c.branch === next.branch ? next : c)));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update capacity.");
    } finally {
      setSaving(false);
    }
  }

  const titleLabel = view === "month" ? monthLabel(referenceDate) : view === "week" ? weekLabel(referenceDate) : dayLabel(referenceDate);

  return (
    <div className="space-y-4">
      {/* Header: view switcher + navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white p-3">
        <div className="flex items-center gap-2">
          <button type="button" onClick={goPrev} aria-label="Previous" className="rounded-lg border border-gray-200 p-1.5 text-slate-500 hover:bg-gray-50">
            <ChevronLeft size={16} />
          </button>
          <button type="button" onClick={goNext} aria-label="Next" className="rounded-lg border border-gray-200 p-1.5 text-slate-500 hover:bg-gray-50">
            <ChevronRight size={16} />
          </button>
          <button type="button" onClick={goToday} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-gray-50">
            Today
          </button>
          <h3 className="ml-2 font-display text-lg font-bold text-brand-900">{titleLabel}</h3>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex overflow-hidden rounded-lg border border-gray-300">
            {(["month", "week", "day"] as CalendarView[]).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => navigate(v, referenceDate)}
                className={`px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
                  view === v ? "bg-gold-500 text-white" : "text-slate-600 hover:bg-gray-50"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          {canManageCapacity && (
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-gray-50"
            >
              <Settings size={14} /> Capacity Settings
            </button>
          )}
        </div>
      </div>

      {/* Filters + search */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-white p-3">
        <div className="relative min-w-[200px] flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            placeholder="Search customer, order #, event type..."
            className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <select value={filters.eventType} onChange={(e) => setFilters((f) => ({ ...f, eventType: e.target.value }))} className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-slate-600">
          {eventTypeOptions.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value as Filters["status"] }))} className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-slate-600">
          <option>All Statuses</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select value={filters.paymentStatus} onChange={(e) => setFilters((f) => ({ ...f, paymentStatus: e.target.value as Filters["paymentStatus"] }))} className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-slate-600">
          <option>All Payment Statuses</option>
          {PAYMENT_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <input
          type="number"
          min={0}
          value={filters.paxMin}
          onChange={(e) => setFilters((f) => ({ ...f, paxMin: e.target.value }))}
          placeholder="Min PAX"
          className="w-24 rounded-lg border border-gray-300 px-2 py-2 text-sm text-slate-600"
        />
        <input
          type="number"
          min={0}
          value={filters.paxMax}
          onChange={(e) => setFilters((f) => ({ ...f, paxMax: e.target.value }))}
          placeholder="Max PAX"
          className="w-24 rounded-lg border border-gray-300 px-2 py-2 text-sm text-slate-600"
        />
        {(filters.search || filters.eventType !== "All Events" || filters.status !== "All Statuses" || filters.paymentStatus !== "All Payment Statuses" || filters.paxMin || filters.paxMax) && (
          <button type="button" onClick={() => setFilters(EMPTY_FILTERS)} className="inline-flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-gray-600">
            <X size={12} /> Clear
          </button>
        )}
      </div>

      {/* Capacity warnings for the visible range */}
      <CapacityWarnings days={[...days.values()]} />

      {view === "month" && (
        <MonthGrid referenceDate={referenceDate} days={days} todayISO={todayISO} filteredOrderIds={filteredOrderIds} onSelect={setSelectedDate} />
      )}
      {view === "week" && (
        <WeekGrid referenceDate={referenceDate} days={days} todayISO={todayISO} filteredOrderIds={filteredOrderIds} onSelect={setSelectedDate} />
      )}
      {view === "day" && (
        <DayAgenda day={days.get(referenceDate)} filteredOrderIds={filteredOrderIds} />
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
        {(["available", "limited", "full", "exceeded", "closed"] as DayStatus[]).map((s) => (
          <span key={s} className="flex items-center gap-1.5">
            {DAY_STATUS_EMOJI[s]} {DAY_STATUS_LABEL[s]}
          </span>
        ))}
      </div>

      {/* Date detail modal */}
      <Modal
        isOpen={selectedDate !== null}
        onClose={() => {
          setSelectedDate(null);
          setBlockReason("");
          setClosingFormOpen(false);
        }}
        title={selectedDate ? dayLabel(selectedDate) : ""}
        size="lg"
      >
        {selectedDate && selectedDay && (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-slate-500">
                {selectedDay.eventCount} booking{selectedDay.eventCount === 1 ? "" : "s"} · ₱
                {selectedDay.events.reduce((sum, e) => sum + e.order.total, 0).toLocaleString()}
              </p>
            </div>

            <div className="flex items-center justify-between gap-3">
              <span className={`text-sm font-semibold ${selectedBlock ? "text-red-600" : "text-emerald-600"}`}>
                {selectedBlock ? "Closed for bookings" : "Open for bookings"}
              </span>

              {canManageCalendar &&
                (selectedBlock ? (
                  <button
                    type="button"
                    onClick={handleToggleBlock}
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 rounded-full border border-gray-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-gray-50 disabled:opacity-60"
                  >
                    Reopen this date
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setClosingFormOpen((v) => !v)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                  >
                    <Ban size={13} /> Close this date
                  </button>
                ))}
            </div>

            {canManageCalendar && !selectedBlock && closingFormOpen && (
              <div className="flex flex-wrap items-end gap-2 rounded-lg border border-red-100 bg-red-50/50 p-3">
                <label className="min-w-[200px] flex-1 text-xs text-slate-500">
                  Reason for closing this date
                  <input
                    value={blockReason}
                    onChange={(e) => setBlockReason(e.target.value)}
                    placeholder="e.g. Fully booked / kitchen maintenance / company holiday"
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </label>
                <button
                  type="button"
                  onClick={handleToggleBlock}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                >
                  <Ban size={14} /> Confirm
                </button>
              </div>
            )}

            {selectedBlock && (
              <p className="rounded-lg bg-gray-100 px-3 py-2 text-xs text-gray-600">⚫ {selectedBlock.reason}</p>
            )}

            {selectedDay.status === "exceeded" && <DayStatusBanner day={selectedDay} />}

            {selectedDay.events.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-400">No bookings on this date.</p>
            ) : (
              <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
                {selectedDay.events.map(({ order, isRush }) => {
                  const branch = order.branch ? getBranchById(order.branch) : undefined;
                  const payment = paymentSummary(order);
                  return (
                    <li
                      key={order.id}
                      className={`flex items-start justify-between gap-3 px-3 py-3 text-sm ${
                        filteredOrderIds.has(order.id) ? "" : "opacity-40"
                      }`}
                    >
                      <div className="flex min-w-0 items-start gap-2.5">
                        <span className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${branch?.dot ?? "bg-slate-300"}`} />
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-brand-900">
                            {order.firstName} {order.lastName}
                          </p>
                          <p className="truncate text-xs text-slate-400">
                            {order.eventTime || "No time"}
                            {branch && ` · ${branch.name}`}
                            {order.pax ? ` · ${order.pax} pax` : ""}
                          </p>
                          <p className={`text-xs font-semibold ${payment.tone}`}>{payment.label}</p>
                          <p className="truncate text-[10px] font-medium uppercase tracking-wide text-slate-400">{order.packageName}</p>
                        </div>
                      </div>
                      <div className="flex flex-shrink-0 flex-col items-end gap-1.5">
                        <span className="font-semibold text-brand-900">₱{order.total.toLocaleString()}</span>
                        <div className="flex items-center gap-1.5">
                          {isRush && <span className="text-xs font-semibold text-orange-600">🟠</span>}
                          <StatusBadge status={order.status} />
                        </div>
                        <Link href={`/dashboard/orders/${order.id}`} className="rounded-lg border border-gray-200 px-2 py-0.5 text-[11px] font-semibold text-gold-600 hover:bg-gold-50">
                          View Order
                        </Link>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </Modal>

      {/* Capacity settings */}
      <Modal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} title="Calendar Settings" size="md">
        <div className="space-y-3">
          <p className="text-xs text-gray-500">Maximum events and PAX the kitchen can handle per day, per branch.</p>
          {localCapacities.map((c) => (
            <CapacityRow key={c.branch} capacity={c} onSave={handleSaveCapacity} saving={saving} />
          ))}
        </div>
      </Modal>
    </div>
  );
}

function DayStatusBanner({ day }: { day: CalendarDay }) {
  if (day.status === "available" || day.eventCount === 0) return null;
  const tone =
    day.status === "exceeded"
      ? "bg-red-100 text-red-800 border-red-200"
      : day.status === "full"
        ? "bg-red-50 text-red-700 border-red-100"
        : day.status === "closed"
          ? "bg-gray-100 text-gray-700 border-gray-200"
          : "bg-amber-50 text-amber-700 border-amber-100";

  const message =
    day.status === "exceeded"
      ? `Total scheduled PAX exceeds the configured daily kitchen capacity by ${day.totalPax - day.maxPax} PAX.`
      : day.status === "full"
        ? "This date is fully booked."
        : day.status === "closed"
          ? day.closedReason ?? "This date is closed."
          : "This date is nearing capacity.";

  return <div className={`rounded-lg border px-3 py-2 text-sm font-medium ${tone}`}>{DAY_STATUS_EMOJI[day.status]} {message}</div>;
}

function CapacityWarnings({ days }: { days: CalendarDay[] }) {
  const warnings = days.filter((d) => d.status === "exceeded" || d.status === "full").sort((a, b) => a.date.localeCompare(b.date));
  if (warnings.length === 0) return null;
  return (
    <div className="space-y-1.5">
      {warnings.slice(0, 5).map((d) => (
        <div
          key={d.date}
          className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium ${
            d.status === "exceeded" ? "border-red-200 bg-red-50 text-red-700" : "border-red-100 bg-red-50/60 text-red-600"
          }`}
        >
          {DAY_STATUS_EMOJI[d.status]} {dayLabel(d.date)} — {d.totalPax}/{d.maxPax || "—"} PAX, {d.eventCount}/{d.maxEvents || "—"} events
          {d.status === "exceeded" && <span className="font-semibold">CAPACITY EXCEEDED</span>}
        </div>
      ))}
    </div>
  );
}

function MonthGrid({
  referenceDate,
  days,
  todayISO,
  filteredOrderIds,
  onSelect,
}: {
  referenceDate: string;
  days: Map<string, CalendarDay>;
  todayISO: string;
  filteredOrderIds: Set<string>;
  onSelect: (date: string) => void;
}) {
  const refMonth = Number(referenceDate.slice(5, 7));
  return (
    <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-gray-200 bg-gray-200 text-xs">
      {WEEKDAYS.map((d) => (
        <div key={d} className="bg-gray-50 px-2 py-2 text-center font-semibold uppercase tracking-wide text-slate-500">
          {d}
        </div>
      ))}
      {[...days.values()].map((day) => {
        const inMonth = Number(day.date.slice(5, 7)) === refMonth;
        const isToday = day.date === todayISO;
        const dayNum = Number(day.date.slice(8, 10));
        const hasFilterMatch = day.events.some((e) => filteredOrderIds.has(e.order.id));
        const anyEvents = day.events.length > 0;

        return (
          <button
            key={day.date}
            type="button"
            onClick={() => onSelect(day.date)}
            className={`flex min-h-[124px] flex-col items-stretch gap-1 p-1.5 text-left transition-colors hover:bg-gray-50 ${
              inMonth ? STATUS_BG[day.status] : "bg-gray-50/60 text-slate-300"
            } ${STATUS_RING[day.status]} ${anyEvents && !hasFilterMatch && filteredOrderIds.size >= 0 ? "" : ""}`}
          >
            <div className="flex items-center justify-between">
              <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-xs ${isToday ? "bg-brand-900 font-semibold text-white" : inMonth ? "text-slate-600" : "text-slate-300"}`}>
                {dayNum}
              </span>
              {day.status !== "available" && <span className="text-xs">{DAY_STATUS_EMOJI[day.status]}</span>}
            </div>
            {day.closedReason && (
              <span className="inline-flex items-center gap-1 truncate rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-semibold text-gray-700">
                <Ban size={10} /> {day.closedReason}
              </span>
            )}
            {day.events.length > 0 && (
              <div className="min-w-0 flex-1 space-y-0.5 overflow-hidden">
                {day.events.slice(0, 3).map(({ order }) => {
                  const branch = order.branch ? getBranchById(order.branch) : undefined;
                  return (
                    <div
                      key={order.id}
                      className={`flex items-center gap-1 truncate text-xs ${filteredOrderIds.has(order.id) ? "text-slate-600" : "text-slate-300"}`}
                    >
                      <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${branch?.dot ?? "bg-slate-300"}`} />
                      <span className="truncate">{order.firstName} {order.lastName}</span>
                    </div>
                  );
                })}
                {day.events.length > 3 && (
                  <div className="text-xs font-medium text-slate-400">+{day.events.length - 3} more</div>
                )}
              </div>
            )}
            {day.totalPax > 0 && (
              <span className="flex items-center gap-1 text-[10px] text-slate-500">
                <Users size={10} /> {day.totalPax}
                {day.maxPax > 0 && `/${day.maxPax}`} PAX
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function WeekGrid({
  referenceDate,
  days,
  todayISO,
  filteredOrderIds,
  onSelect,
}: {
  referenceDate: string;
  days: Map<string, CalendarDay>;
  todayISO: string;
  filteredOrderIds: Set<string>;
  onSelect: (date: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-7">
      {[...days.values()].map((day) => {
        const isToday = day.date === todayISO;
        return (
          <button
            key={day.date}
            type="button"
            onClick={() => onSelect(day.date)}
            className={`flex min-h-[160px] flex-col items-stretch gap-1.5 rounded-lg border border-gray-200 p-2.5 text-left transition-colors hover:border-gold-300 ${STATUS_BG[day.status]} ${STATUS_RING[day.status]}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-slate-500">{new Date(`${day.date}T00:00:00`).toLocaleDateString("en-PH", { weekday: "short" })}</span>
              <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${isToday ? "bg-brand-900 font-semibold text-white" : "text-slate-600"}`}>
                {Number(day.date.slice(8, 10))}
              </span>
            </div>
            {day.closedReason && <span className="truncate rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-semibold text-gray-700">⚫ {day.closedReason}</span>}
            <div className="flex-1 space-y-1 overflow-hidden">
              {day.events.slice(0, 4).map(({ order, isRush }) => (
                <div key={order.id} className={`truncate rounded px-1.5 py-0.5 text-[10px] font-medium ${filteredOrderIds.has(order.id) ? "bg-white text-slate-700 ring-1 ring-gray-200" : "bg-white/50 text-slate-400"}`}>
                  {isRush && "🟠 "}
                  {order.eventTime ? `${order.eventTime} ` : ""}
                  {order.firstName} {order.lastName}
                </div>
              ))}
              {day.events.length > 4 && <div className="text-[10px] font-medium text-slate-400">+{day.events.length - 4} more</div>}
            </div>
            {day.totalPax > 0 && (
              <span className="text-[10px] font-semibold text-slate-500">
                {day.eventCount} events · {day.totalPax}
                {day.maxPax > 0 && `/${day.maxPax}`} PAX
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function DayAgenda({ day, filteredOrderIds }: { day: CalendarDay | undefined; filteredOrderIds: Set<string> }) {
  if (!day) return null;
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="mb-3 flex items-center gap-2">
        <CalendarDays size={16} className="text-gold-600" />
        <h3 className="font-semibold text-brand-900">{dayLabel(day.date)}</h3>
        {day.status !== "available" && <Badge label={`${DAY_STATUS_EMOJI[day.status]} ${DAY_STATUS_LABEL[day.status]}`} tone={day.status === "exceeded" || day.status === "full" ? "red" : day.status === "limited" ? "amber" : "slate"} />}
      </div>
      {day.closedReason && <p className="mb-3 rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-600">⚫ Closed — {day.closedReason}</p>}
      {day.events.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400">No bookings on this date.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {day.events.map(({ order, isRush }) => (
            <li key={order.id} className={`flex items-center justify-between gap-3 py-2.5 text-sm ${filteredOrderIds.has(order.id) ? "" : "opacity-40"}`}>
              <div className="min-w-0">
                <p className="truncate font-medium text-brand-900">
                  {order.eventTime || "No time"} · {order.eventType || "Event"} · {order.firstName} {order.lastName}
                </p>
                <p className="truncate text-xs text-slate-400">{order.orderNumber} · {order.pax ?? order.quantityLabel ?? "—"} pax</p>
              </div>
              <div className="flex flex-shrink-0 items-center gap-2">
                {isRush && <span className="text-xs font-semibold text-orange-600">🟠 RUSH</span>}
                <StatusBadge status={order.status} />
                <Link href={`/dashboard/orders/${order.id}`} className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-semibold text-gold-600 hover:bg-gold-50">
                  View Order
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CapacityRow({ capacity, onSave, saving }: { capacity: CalendarCapacity; onSave: (c: CalendarCapacity) => void; saving: boolean }) {
  const [maxEvents, setMaxEvents] = useState(String(capacity.maxEventsPerDay));
  const [maxPax, setMaxPax] = useState(String(capacity.maxPaxPerDay));
  const branchName = getBranchById(capacity.branch)?.name ?? capacity.branch;
  const dirty = Number(maxEvents) !== capacity.maxEventsPerDay || Number(maxPax) !== capacity.maxPaxPerDay;

  return (
    <div className="flex items-center gap-2 rounded-lg border border-gray-200 p-3">
      <span className="w-24 flex-shrink-0 text-sm font-medium text-brand-900">{branchName}</span>
      <label className="flex-1 text-xs text-gray-500">
        Max Events/Day
        <input type="number" min={0} value={maxEvents} onChange={(e) => setMaxEvents(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm" />
      </label>
      <label className="flex-1 text-xs text-gray-500">
        Max PAX/Day
        <input type="number" min={0} value={maxPax} onChange={(e) => setMaxPax(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm" />
      </label>
      <button
        type="button"
        disabled={!dirty || saving}
        onClick={() => onSave({ branch: capacity.branch, maxEventsPerDay: Number(maxEvents) || 0, maxPaxPerDay: Number(maxPax) || 0 })}
        className="mt-4 rounded-lg bg-gold-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gold-600 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Save
      </button>
    </div>
  );
}
