import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity-log/data";
import type { NewStaffTask, StaffTask, TaskStatus } from "./types";

type Row = {
  id: string;
  branch: string;
  title: string;
  assignee: string;
  event: string;
  due_date: string | null;
  priority: StaffTask["priority"];
  status: TaskStatus;
  position: number;
};

const COLUMNS = "id, branch, title, assignee, event, due_date, priority, status, position";

function rowToTask(row: Row): StaffTask {
  return {
    id: row.id,
    branch: row.branch,
    title: row.title,
    assignee: row.assignee,
    event: row.event,
    dueDate: row.due_date,
    priority: row.priority,
    status: row.status,
    position: row.position,
  };
}

export async function getStaffTasks(): Promise<StaffTask[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("staff_tasks")
    .select(COLUMNS)
    .order("status")
    .order("position");
  if (error) throw new Error(`Failed to load staff tasks: ${error.message}`);
  return (data as Row[]).map(rowToTask);
}

export async function createStaffTask(task: NewStaffTask): Promise<StaffTask> {
  const supabase = createSupabaseServerClient();

  const { data: maxRow } = await supabase
    .from("staff_tasks")
    .select("position")
    .eq("status", task.status)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const position = ((maxRow as { position: number } | null)?.position ?? -1) + 1;

  const { data, error } = await supabase
    .from("staff_tasks")
    .insert({
      branch: task.branch,
      title: task.title,
      assignee: task.assignee,
      event: task.event,
      due_date: task.dueDate,
      priority: task.priority,
      status: task.status,
      position,
    })
    .select(COLUMNS)
    .single();
  if (error) throw new Error(`Failed to create staff task: ${error.message}`);
  const created = rowToTask(data as Row);
  await logActivity({
    module: "Staff Tasks",
    action: "CREATE",
    entity: "Task",
    name: created.title,
    details: `${created.priority} priority · ${created.status}`,
  });
  return created;
}

export async function moveStaffTask(id: string, status: TaskStatus): Promise<void> {
  const supabase = createSupabaseServerClient();

  const { data: maxRow } = await supabase
    .from("staff_tasks")
    .select("position")
    .eq("status", status)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const position = ((maxRow as { position: number } | null)?.position ?? -1) + 1;

  const { data: existing } = await supabase.from("staff_tasks").select("title").eq("id", id).maybeSingle();
  const { error } = await supabase.from("staff_tasks").update({ status, position }).eq("id", id);
  if (error) throw new Error(`Failed to move staff task: ${error.message}`);
  await logActivity({
    module: "Staff Tasks",
    action: "UPDATE",
    entity: "Task",
    name: (existing as { title: string } | null)?.title ?? "",
    details: `Moved to ${status}`,
  });
}

export async function deleteStaffTask(id: string): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { data: existing } = await supabase.from("staff_tasks").select("title").eq("id", id).maybeSingle();
  const { error } = await supabase.from("staff_tasks").delete().eq("id", id);
  if (error) throw new Error(`Failed to delete staff task: ${error.message}`);
  await logActivity({ module: "Staff Tasks", action: "DELETE", entity: "Task", name: (existing as { title: string } | null)?.title ?? "" });
}
