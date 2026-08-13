export const TASK_PRIORITIES = ["Low", "Medium", "High", "Urgent"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const TASK_STATUSES = ["To Do", "In Progress", "Waiting", "Done"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export type StaffTask = {
  id: string;
  branch: string;
  title: string;
  assignee: string;
  event: string;
  dueDate: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  position: number;
};

export type NewStaffTask = {
  branch: string;
  title: string;
  assignee: string;
  event: string;
  dueDate: string | null;
  priority: TaskPriority;
  status: TaskStatus;
};
