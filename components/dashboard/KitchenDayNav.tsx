"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { BRANCHES } from "@/lib/mt/branches";
import { addDays, todayManila } from "@/lib/mt/dates";

const WEEKDAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

function weekDates(date: string): string[] {
  const dow = new Date(`${date}T00:00:00Z`).getUTCDay(); // 0=Sun..6=Sat
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  const monday = addDays(date, mondayOffset);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

function dayNumber(dateKey: string): string {
  return String(Number(dateKey.slice(8, 10)));
}

function longLabel(dateKey: string): string {
  const d = new Date(`${dateKey}T00:00:00`);
  return d.toLocaleDateString("en-PH", { weekday: "short", month: "short", day: "numeric" }).toUpperCase();
}

export const ALL_BRANCHES_ID = "all";

export default function KitchenDayNav({
  basePath,
  date,
  branch,
  showDateControls = false,
}: {
  basePath: string;
  date: string;
  branch: string;
  /** Prev/next arrows + a manual date field + "Today" — Kitchen Board and
   * Market List show this row; Kitchen Today's own day-agenda scroll makes
   * it redundant there. */
  showDateControls?: boolean;
}) {
  const router = useRouter();
  const today = todayManila();
  const days = weekDates(date);

  function go(nextDate: string, nextBranch: string = branch) {
    const params = new URLSearchParams();
    params.set("date", nextDate);
    if (nextBranch !== ALL_BRANCHES_ID) params.set("branch", nextBranch);
    router.push(`${basePath}?${params.toString()}`);
  }

  return (
    <div className="mb-5 space-y-3">
      <div className="grid grid-cols-7 gap-2 rounded-lg border border-gray-200 bg-white p-2">
        {days.map((d, i) => {
          const isToday = d === today;
          const isSelected = d === date;
          return (
            <button
              key={d}
              onClick={() => go(d)}
              className={`flex flex-col items-center rounded-md py-2 text-xs font-semibold transition ${
                isSelected
                  ? "bg-gold-500 text-white"
                  : isToday
                    ? "bg-gold-500/10 text-gold-600"
                    : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              <span className="tracking-wide">{isToday && !isSelected ? "TODAY" : WEEKDAYS[i]}</span>
              <span className="mt-0.5 text-sm">{dayNumber(d)}</span>
            </button>
          );
        })}
      </div>

      {showDateControls && (
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => go(addDays(date, -1))} className="rounded-md border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50">
            <ChevronLeft size={14} />
          </button>
          <span className="text-sm font-semibold text-brand-900">{longLabel(date)}</span>
          <button onClick={() => go(addDays(date, 1))} className="rounded-md border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50">
            <ChevronRight size={14} />
          </button>
          {date !== today && (
            <button onClick={() => go(today)} className="rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50">
              Today
            </button>
          )}
          <input
            type="date"
            value={date}
            onChange={(e) => e.target.value && go(e.target.value)}
            className="rounded-md border border-gray-200 px-2 py-1.5 text-xs text-gray-600 outline-none focus:border-gold-400"
          />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="font-semibold uppercase tracking-wide text-gray-400">Kitchen</span>
        <button
          onClick={() => go(date, ALL_BRANCHES_ID)}
          className={`rounded-full px-3 py-1 font-semibold uppercase ${
            branch === ALL_BRANCHES_ID ? "bg-brand-950 text-white" : "border border-gray-200 text-gray-500 hover:bg-gray-50"
          }`}
        >
          All Branches
        </button>
        {BRANCHES.map((b) => (
          <button
            key={b.id}
            onClick={() => go(date, b.id)}
            className={`rounded-full px-3 py-1 font-semibold uppercase ${
              branch === b.id ? "bg-brand-950 text-white" : "border border-gray-200 text-gray-500 hover:bg-gray-50"
            }`}
          >
            {b.name}
          </button>
        ))}
      </div>
    </div>
  );
}
