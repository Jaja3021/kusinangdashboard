import { ListTodo, Loader2, CheckSquare } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import Badge, { BadgeTone } from "@/components/ui/Badge";
import DataTable, { Column } from "@/components/ui/DataTable";
import { staffTasks, StaffTask } from "@/lib/dummy-data";

const statusTone: Record<StaffTask["status"], BadgeTone> = {
  "To Do": "slate",
  "In Progress": "amber",
  Done: "green",
};

const priorityTone: Record<StaffTask["priority"], BadgeTone> = {
  High: "red",
  Medium: "amber",
  Low: "slate",
};

const columns: Column<StaffTask>[] = [
  { key: "task", header: "Task", render: (r) => <span className="font-medium text-brand-900">{r.task}</span> },
  { key: "assignee", header: "Assignee" },
  { key: "event", header: "Event" },
  { key: "dueDate", header: "Due" },
  { key: "priority", header: "Priority", render: (r) => <Badge label={r.priority} tone={priorityTone[r.priority]} /> },
  { key: "status", header: "Status", render: (r) => <Badge label={r.status} tone={statusTone[r.status]} /> },
];

export default function StaffTasksPage() {
  const todo = staffTasks.filter((t) => t.status === "To Do").length;
  const inProgress = staffTasks.filter((t) => t.status === "In Progress").length;
  const done = staffTasks.filter((t) => t.status === "Done").length;

  return (
    <div>
      <PageHeader title="Staff Tasks" subtitle="Prep and coordination work across upcoming events." />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="To Do" value={String(todo)} icon={<ListTodo size={18} className="text-gold-600" />} />
        <StatCard label="In Progress" value={String(inProgress)} icon={<Loader2 size={18} className="text-gold-600" />} />
        <StatCard label="Done" value={String(done)} icon={<CheckSquare size={18} className="text-gold-600" />} />
      </div>
      <div className="mt-6">
        <DataTable columns={columns} rows={staffTasks} />
      </div>
    </div>
  );
}
