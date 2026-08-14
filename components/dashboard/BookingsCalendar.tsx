"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Ban } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/Badge";
import { formatPeso } from "@/lib/format";
import { getBranchById } from "@/lib/mt/branches";
import { blockDateAction, unblockDateAction } from "@/app/dashboard/bookings/actions";
import type { OrderRecord } from "@/lib/orders/types";
import type { BlockedDate } from "@/lib/bookings/blocked-dates";

const WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const MAX_CHIPS = 2;

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function monthLabel(d: Date): string {
  return d.toLocaleDateString("en-PH", { month: "long", year: "numeric" });
}

// Weeks (Sun-start) spanning the given month, including the leading/trailing
// days from adjacent months needed to fill the grid.
function buildMonthGrid(monthStart: Date): Date[][] {
  const firstOfMonth = new Date(monthStart.getFullYear(), monthStart.getMonth(), 1);
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
    // Stop once we've filled the month and the following week starts in the
    // next month too — avoids a trailing all-next-month row.
    if (cursor.getMonth() !== monthStart.getMonth() && week.some((d) => d.getMonth() === monthStart.getMonth())) {
      if (weeks.length >= 4) break;
    }
  }
  return weeks;
}

export default function BookingsCalendar({
  orders,
  blockedDates,
}: {
  orders: OrderRecord[];
  blockedDates: BlockedDate[];
}) {
  const today = useMemo(() => new Date(), []);
  const [monthCursor, setMonthCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [blockReason, setBlockReason] = useState("");
  const [saving, setSaving] = useState(false);
  // revalidatePath() in the server actions refreshes stale cache for the
  // *next* navigation — it doesn't re-render this already-mounted client
  // component, so block/unblock also update this local copy directly (same
  // pattern MenuClient uses for package edits).
  const [localBlockedDates, setLocalBlockedDates] = useState(blockedDates);

  const ordersByDate = useMemo(() => {
    const map = new Map<string, OrderRecord[]>();
    for (const o of orders) {
      if (!o.eventDate) continue;
      const list = map.get(o.eventDate);
      if (list) list.push(o);
      else map.set(o.eventDate, [o]);
    }
    return map;
  }, [orders]);

  const blockedByDate = useMemo(() => new Map(localBlockedDates.map((b) => [b.date, b])), [localBlockedDates]);

  const weeks = useMemo(() => buildMonthGrid(monthCursor), [monthCursor]);
  const monthlyCount = useMemo(
    () =>
      [...ordersByDate.entries()].reduce(
        (sum, [date, list]) => (new Date(date).getMonth() === monthCursor.getMonth() ? sum + list.length : sum),
        0,
      ),
    [ordersByDate, monthCursor],
  );

  const todayISO = toISODate(today);
  const selectedOrders = selectedDate ? (ordersByDate.get(selectedDate) ?? []) : [];
  const selectedBlock = selectedDate ? blockedByDate.get(selectedDate) : undefined;

  async function handleToggleBlock() {
    if (!selectedDate) return;
    setSaving(true);
    try {
      if (selectedBlock) {
        await unblockDateAction(selectedDate);
        setLocalBlockedDates((prev) => prev.filter((b) => b.date !== selectedDate));
      } else {
        if (!blockReason.trim()) {
          alert("Give a reason for blocking this date.");
          return;
        }
        const created = await blockDateAction(selectedDate, blockReason.trim(), null);
        setLocalBlockedDates((prev) => [...prev.filter((b) => b.date !== selectedDate), created]);
        setBlockReason("");
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update this date.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMonthCursor((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
            aria-label="Previous month"
            className="rounded-lg border border-gray-200 p-1.5 text-slate-500 hover:bg-gray-50"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => setMonthCursor((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
            aria-label="Next month"
            className="rounded-lg border border-gray-200 p-1.5 text-slate-500 hover:bg-gray-50"
          >
            <ChevronRight size={16} />
          </button>
          <h3 className="ml-2 font-display text-lg font-bold text-brand-900">{monthLabel(monthCursor)}</h3>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400">{monthlyCount} bookings this month</span>
          <button
            type="button"
            onClick={() => setMonthCursor(new Date(today.getFullYear(), today.getMonth(), 1))}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-gray-50"
          >
            Today
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-gray-200 bg-gray-200 text-xs">
        {WEEKDAYS.map((d) => (
          <div key={d} className="bg-gray-50 px-2 py-2 text-center font-semibold uppercase tracking-wide text-slate-500">
            {d}
          </div>
        ))}
        {weeks.flat().map((day) => {
          const iso = toISODate(day);
          const inMonth = day.getMonth() === monthCursor.getMonth();
          const dayOrders = ordersByDate.get(iso) ?? [];
          const blocked = blockedByDate.get(iso);
          const isToday = iso === todayISO;

          return (
            <button
              key={iso}
              type="button"
              onClick={() => setSelectedDate(iso)}
              className={`flex min-h-[104px] flex-col items-stretch gap-1 bg-white p-1.5 text-left transition-colors hover:bg-gray-50 ${
                inMonth ? "" : "bg-gray-50/60 text-slate-300"
              } ${blocked ? "bg-red-50/60" : ""}`}
            >
              <span
                className={`inline-flex h-5 w-5 items-center justify-center self-start rounded-full text-xs ${
                  isToday ? "bg-brand-900 font-semibold text-white" : inMonth ? "text-slate-600" : "text-slate-300"
                }`}
              >
                {day.getDate()}
              </span>

              {blocked && (
                <span className="inline-flex items-center gap-1 truncate rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">
                  <Ban size={10} /> {blocked.reason}
                </span>
              )}

              {dayOrders.slice(0, MAX_CHIPS).map((o) => {
                const branch = o.branch ? getBranchById(o.branch) : undefined;
                return (
                  <span
                    key={o.id}
                    className={`truncate rounded px-1.5 py-0.5 text-[10px] font-medium ${
                      branch?.badge ?? "bg-gray-100 text-gray-600"
                    } ${o.status === "Pending Confirmation" ? "border border-dashed border-current" : ""}`}
                  >
                    {o.eventTime ? `${o.eventTime} ` : ""}
                    {o.firstName} {o.lastName}
                  </span>
                );
              })}
              {dayOrders.length > MAX_CHIPS && (
                <span className="text-[10px] font-medium text-slate-400">+{dayOrders.length - MAX_CHIPS} more</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm border border-dashed border-slate-400" /> Not confirmed
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-red-100" /> Not accepting bookings
        </span>
        <span className="ml-auto">Fill colour is the branch</span>
      </div>

      <Modal
        isOpen={selectedDate !== null}
        onClose={() => {
          setSelectedDate(null);
          setBlockReason("");
        }}
        title={selectedDate ? new Date(selectedDate).toLocaleDateString("en-PH", { weekday: "long", month: "long", day: "numeric", year: "numeric" }) : ""}
        size="lg"
      >
        {selectedDate && (
          <div className="space-y-4">
            {selectedOrders.length === 0 ? (
              <p className="text-sm text-slate-400">No bookings on this date.</p>
            ) : (
              <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
                {selectedOrders.map((o) => (
                  <li key={o.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-brand-900">
                        {o.orderNumber} — {o.firstName} {o.lastName}
                      </p>
                      <p className="truncate text-xs text-slate-400">
                        {o.packageName} · {o.pax ?? "—"} pax · {o.eventTime || "No time set"}
                      </p>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-3">
                      <StatusBadge status={o.status} />
                      <span className="text-sm font-semibold text-brand-900">{formatPeso(o.total)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div className="rounded-lg border border-gray-200 p-3">
              {selectedBlock ? (
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-red-700">Not accepting bookings on this date</p>
                    <p className="text-xs text-slate-500">{selectedBlock.reason}</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleBlock}
                    disabled={saving}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-gray-50 disabled:opacity-60"
                  >
                    Allow bookings again
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap items-end gap-2">
                  <label className="min-w-[200px] flex-1 text-xs text-slate-500">
                    Reason for blocking this date
                    <input
                      value={blockReason}
                      onChange={(e) => setBlockReason(e.target.value)}
                      placeholder="e.g. Fully booked / kitchen maintenance"
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={handleToggleBlock}
                    disabled={saving}
                    className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                  >
                    Block this date
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
