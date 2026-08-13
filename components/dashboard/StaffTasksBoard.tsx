"use client";

import { useMemo, useState, type DragEvent, type FormEvent } from "react";
import { Plus, X } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Badge, { BadgeTone } from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import { useBranch } from "@/components/providers/BranchProvider";
import { ALL_BRANCHES, BRANCHES } from "@/lib/mt/branches";
import { createStaffTaskAction, deleteStaffTaskAction, moveStaffTaskAction } from "@/app/dashboard/staff-tasks/actions";
import { TASK_PRIORITIES, TASK_STATUSES, type NewStaffTask, type StaffTask, type TaskPriority, type TaskStatus } from "@/lib/staff-tasks/types";

const COLUMN_STYLE: Record<TaskStatus, string> = {
  "To Do": "border-t-sky-500",
  "In Progress": "border-t-orange-500",
  Waiting: "border-t-amber-500",
  Done: "border-t-emerald-500",
};

const PRIORITY_TONE: Record<TaskPriority, BadgeTone> = {
  Low: "slate",
  Medium: "blue",
  High: "amber",
  Urgent: "red",
};

const EMPTY_DRAFT: NewStaffTask = {
  branch: BRANCHES[0].id,
  title: "",
  assignee: "",
  event: "",
  dueDate: null,
  priority: "Medium",
  status: "To Do",
};

export default function StaffTasksBoard({ tasks: initialTasks }: { tasks: StaffTask[] }) {
  const { selectedBranch } = useBranch();
  const [tasks, setTasks] = useState(initialTasks);
  const [priorityFilter, setPriorityFilter] = useState<Set<TaskPriority>>(new Set());
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [modalStatus, setModalStatus] = useState<TaskStatus | null>(null);
  const [draft, setDraft] = useState<NewStaffTask>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);

  const branchMatch = selectedBranch === ALL_BRANCHES ? null : BRANCHES.find((b) => b.name === selectedBranch);

  const visibleTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (branchMatch && t.branch !== branchMatch.id) return false;
      if (priorityFilter.size > 0 && !priorityFilter.has(t.priority)) return false;
      return true;
    });
  }, [tasks, branchMatch, priorityFilter]);

  function togglePriority(p: TaskPriority) {
    setPriorityFilter((cur) => {
      const next = new Set(cur);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  }

  function openAddModal(status: TaskStatus) {
    setDraft({ ...EMPTY_DRAFT, branch: branchMatch?.id ?? BRANCHES[0].id, status });
    setModalStatus(status);
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!draft.title.trim()) return;
    setSaving(true);
    try {
      const created = await createStaffTaskAction(draft);
      setTasks((cur) => [...cur, created]);
      setModalStatus(null);
    } finally {
      setSaving(false);
    }
  }

  async function handleDrop(status: TaskStatus) {
    const id = draggingId;
    setDraggingId(null);
    if (!id) return;
    const task = tasks.find((t) => t.id === id);
    if (!task || task.status === status) return;

    setTasks((cur) => cur.map((t) => (t.id === id ? { ...t, status } : t)));
    try {
      await moveStaffTaskAction(id, status);
    } catch {
      setTasks((cur) => cur.map((t) => (t.id === id ? { ...t, status: task.status } : t)));
    }
  }

  async function handleDelete(id: string) {
    const prior = tasks;
    setTasks((cur) => cur.filter((t) => t.id !== id));
    try {
      await deleteStaffTaskAction(id);
    } catch {
      setTasks(prior);
    }
  }

  function onDragStart(e: DragEvent, id: string) {
    setDraggingId(id);
    e.dataTransfer.effectAllowed = "move";
  }

  return (
    <div>
      <PageHeader title="Staff Tasks" subtitle={`Kanban board · ${visibleTasks.length} task${visibleTasks.length === 1 ? "" : "s"}`}>
        {TASK_PRIORITIES.map((p) => (
          <button
            key={p}
            onClick={() => togglePriority(p)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
              priorityFilter.has(p) ? "border-brand-900 bg-brand-900 text-white" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            {p}
          </button>
        ))}
        <button
          onClick={() => openAddModal("To Do")}
          className="flex items-center gap-1.5 rounded-lg bg-gold-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gold-600"
        >
          <Plus size={14} /> Add Task
        </button>
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {TASK_STATUSES.map((status) => {
          const columnTasks = visibleTasks.filter((t) => t.status === status);
          return (
            <div
              key={status}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(status)}
              className={`rounded-lg border border-t-4 border-gray-200 bg-white ${COLUMN_STYLE[status]}`}
            >
              <div className="flex items-center justify-between px-4 py-3">
                <h2 className="text-sm font-semibold text-brand-900">{status}</h2>
                <div className="flex items-center gap-1.5">
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-gray-100 px-1 text-xs font-semibold text-gray-600">
                    {columnTasks.length}
                  </span>
                  <button onClick={() => openAddModal(status)} className="rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600" aria-label={`Add task to ${status}`}>
                    <Plus size={14} />
                  </button>
                </div>
              </div>
              <div className="space-y-2 px-3 pb-3">
                {columnTasks.length === 0 && (
                  <button
                    onClick={() => openAddModal(status)}
                    className="flex w-full items-center justify-center rounded-lg border border-dashed border-gray-200 py-6 text-xs text-gray-400 hover:border-gray-300 hover:text-gray-500"
                  >
                    <Plus size={12} className="mr-1" /> Add a task
                  </button>
                )}
                {columnTasks.map((task) => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => onDragStart(e, task.id)}
                    className="group cursor-grab rounded-lg border border-gray-100 bg-gray-50 p-3 active:cursor-grabbing"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-brand-900">{task.title}</p>
                      <button
                        onClick={() => handleDelete(task.id)}
                        className="opacity-0 transition-opacity group-hover:opacity-100"
                        aria-label="Delete task"
                      >
                        <X size={13} className="text-gray-400 hover:text-red-500" />
                      </button>
                    </div>
                    {(task.assignee || task.event) && (
                      <p className="mt-1 truncate text-xs text-gray-500">
                        {task.assignee}
                        {task.assignee && task.event ? " · " : ""}
                        {task.event}
                      </p>
                    )}
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <Badge label={task.priority} tone={PRIORITY_TONE[task.priority]} />
                      {task.dueDate && <span className="text-xs text-gray-400">{task.dueDate}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <Modal isOpen={modalStatus !== null} onClose={() => setModalStatus(null)} title="Add Task" size="md">
        <form onSubmit={handleCreate} className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-500">Task</span>
            <input
              required
              value={draft.title}
              onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-brand-900 outline-none focus:border-gold-400"
              placeholder="e.g. Confirm lechon supplier delivery"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">Assignee</span>
              <input
                value={draft.assignee}
                onChange={(e) => setDraft((d) => ({ ...d, assignee: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-brand-900 outline-none focus:border-gold-400"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">Due Date</span>
              <input
                type="date"
                value={draft.dueDate ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, dueDate: e.target.value || null }))}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-brand-900 outline-none focus:border-gold-400"
              />
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-500">Event</span>
            <input
              value={draft.event}
              onChange={(e) => setDraft((d) => ({ ...d, event: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-brand-900 outline-none focus:border-gold-400"
              placeholder="e.g. BK-5021 — Corporate Gala"
            />
          </label>
          <div className="grid grid-cols-3 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">Branch</span>
              <select
                value={draft.branch}
                onChange={(e) => setDraft((d) => ({ ...d, branch: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-2 py-2 text-sm text-brand-900 outline-none focus:border-gold-400"
              >
                {BRANCHES.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">Priority</span>
              <select
                value={draft.priority}
                onChange={(e) => setDraft((d) => ({ ...d, priority: e.target.value as TaskPriority }))}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-2 py-2 text-sm text-brand-900 outline-none focus:border-gold-400"
              >
                {TASK_PRIORITIES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">Column</span>
              <select
                value={draft.status}
                onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value as TaskStatus }))}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-2 py-2 text-sm text-brand-900 outline-none focus:border-gold-400"
              >
                {TASK_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModalStatus(null)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="rounded-lg bg-gold-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gold-600 disabled:opacity-40">
              {saving ? "Adding…" : "Add Task"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
