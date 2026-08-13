import AdminExpensesClient from "@/components/dashboard/AdminExpensesClient";
import { getExpenses } from "@/lib/admin-expenses/data";

export const dynamic = "force-dynamic";

export default async function AdminExpensesPage() {
  const expenses = await getExpenses();
  return <AdminExpensesClient expenses={expenses} />;
}
