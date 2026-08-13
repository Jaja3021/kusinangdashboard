import ActivityLogClient from "@/components/dashboard/ActivityLogClient";
import { getActivityLog } from "@/lib/activity-log/data";

export const dynamic = "force-dynamic";

export default async function ActivityLogPage() {
  const entries = await getActivityLog();
  return <ActivityLogClient entries={entries} />;
}
