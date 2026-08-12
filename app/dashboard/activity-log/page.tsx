import PageHeader from "@/components/ui/PageHeader";
import { activityLog } from "@/lib/dummy-data";

export default function ActivityLogPage() {
  return (
    <div>
      <PageHeader title="Activity Log" subtitle="A running record of what's happened across the system." />
      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <ol className="relative space-y-6 border-l border-gray-200 pl-6">
          {activityLog.map((entry) => (
            <li key={entry.id} className="relative">
              <span className="absolute -left-[27px] top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-gold-500" />
              <p className="text-sm text-slate-700">{entry.action}</p>
              <p className="mt-1 text-xs text-slate-400">{entry.user} · {entry.timestamp}</p>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
