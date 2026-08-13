import StaffTasksBoard from "@/components/dashboard/StaffTasksBoard";
import { getStaffTasks } from "@/lib/staff-tasks/data";

export const dynamic = "force-dynamic";

export default async function StaffTasksPage() {
  const tasks = await getStaffTasks();
  return <StaffTasksBoard tasks={tasks} />;
}
