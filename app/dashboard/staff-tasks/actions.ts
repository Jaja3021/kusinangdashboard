"use server";

import { revalidatePath } from "next/cache";
import { createStaffTask, deleteStaffTask, moveStaffTask } from "@/lib/staff-tasks/data";
import type { NewStaffTask, StaffTask, TaskStatus } from "@/lib/staff-tasks/types";

export async function createStaffTaskAction(task: NewStaffTask): Promise<StaffTask> {
  // RLS ("Admin manage staff tasks", is_admin()) is the real authorization
  // boundary — a non-admin's insert simply fails.
  const created = await createStaffTask(task);
  revalidatePath("/dashboard/staff-tasks");
  return created;
}

export async function moveStaffTaskAction(id: string, status: TaskStatus): Promise<void> {
  await moveStaffTask(id, status);
  revalidatePath("/dashboard/staff-tasks");
}

export async function deleteStaffTaskAction(id: string): Promise<void> {
  await deleteStaffTask(id);
  revalidatePath("/dashboard/staff-tasks");
}
