"use client";

import { useMemo, useState } from "react";
import { ClipboardList } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import Badge, { BadgeTone } from "@/components/ui/Badge";
import DataTable, { Column } from "@/components/ui/DataTable";
import ScrollX from "@/components/ui/ScrollX";
import { useDateRange } from "@/components/providers/DateRangeProvider";
import { addDays, inRange, toDateKey, todayManila } from "@/lib/mt/dates";
import { ACTIVITY_ACTIONS, type ActivityAction, type ActivityEntry } from "@/lib/activity-log/types";

const ACTION_TONE: Record<ActivityAction, BadgeTone> = { CREATE: "green", UPDATE: "blue", DELETE: "red" };

export default function ActivityLogClient({ entries }: { entries: ActivityEntry[] }) {
  const { range, label: periodLabel } = useDateRange();
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("All");
  const [actionFilter, setActionFilter] = useState<ActivityAction | "All">("All");

  const modules = useMemo(() => ["All", ...Array.from(new Set(entries.map((e) => e.module)))], [entries]);

  const periodEntries = useMemo(() => entries.filter((e) => inRange(toDateKey(e.createdAt), range)), [entries, range]);

  const today = todayManila();
  const weekStart = addDays(today, -6);

  const stats = useMemo(() => {
    const todayCount = periodEntries.filter((e) => toDateKey(e.createdAt) === today).length;
    const weekCount = periodEntries.filter((e) => {
      const key = toDateKey(e.createdAt);
      return key >= weekStart && key <= today;
    }).length;
    const breakdown: Record<ActivityAction, number> = { CREATE: 0, UPDATE: 0, DELETE: 0 };
    for (const e of periodEntries) breakdown[e.action]++;
    return { total: periodEntries.length, today: todayCount, week: weekCount, breakdown };
  }, [periodEntries, today, weekStart]);

  const rows = useMemo(() => {
    return periodEntries.filter((e) => {
      if (moduleFilter !== "All" && e.module !== moduleFilter) return false;
      if (actionFilter !== "All" && e.action !== actionFilter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        if (!e.name.toLowerCase().includes(q) && !e.entity.toLowerCase().includes(q) && !e.details.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [periodEntries, moduleFilter, actionFilter, search]);

  const columns: Column<ActivityEntry>[] = [
    { key: "createdAt", header: "Time", render: (r) => new Date(r.createdAt).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" }) },
    { key: "module", header: "Module", render: (r) => <Badge label={r.module} tone="slate" /> },
    { key: "action", header: "Action", render: (r) => <Badge label={r.action} tone={ACTION_TONE[r.action]} /> },
    { key: "entity", header: "Entity" },
    { key: "name", header: "Name", render: (r) => <span className="font-medium text-brand-900">{r.name || "—"}</span> },
    { key: "details", header: "Details", render: (r) => r.details || "—" },
    { key: "userName", header: "By", render: (r) => r.userName || "—" },
  ];

  return (
    <div>
      <PageHeader title="Activity Log" subtitle="All changes across Inventory, Costing, and Staff Tasks." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Entries" value={stats.total} icon={<ClipboardList size={18} className="text-gold-600" />} />
        <StatCard label="Today" value={stats.today} icon={<ClipboardList size={18} className="text-gold-600" />} />
        <StatCard label="This Week" value={stats.week} icon={<ClipboardList size={18} className="text-gold-600" />} />
        <StatCard
          label="Action Breakdown"
          value={stats.breakdown.CREATE + stats.breakdown.UPDATE + stats.breakdown.DELETE}
          footer={
            <div className="flex flex-wrap gap-1.5">
              <Badge label={`${stats.breakdown.CREATE} CREATE`} tone="green" />
              <Badge label={`${stats.breakdown.UPDATE} UPDATE`} tone="blue" />
              <Badge label={`${stats.breakdown.DELETE} DELETE`} tone="red" />
            </div>
          }
        />
      </div>

      <div className="mt-6 mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, entity, details…"
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-brand-900 outline-none focus:border-gold-400"
          />
          <select value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)} className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm text-brand-900 outline-none focus:border-gold-400">
            {modules.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <div className="flex gap-1">
            {(["All", ...ACTIVITY_ACTIONS] as const).map((a) => (
              <button
                key={a}
                onClick={() => setActionFilter(a)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                  actionFilter === a ? "border-brand-900 bg-brand-900 text-white" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>
        <span className="text-xs text-gray-400">
          Period {range.from} to {range.to} · {periodLabel} — set in the top bar
        </span>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-400">No activity found for this period.</div>
      ) : (
        <ScrollX>
          <DataTable columns={columns} rows={rows} />
        </ScrollX>
      )}
    </div>
  );
}
