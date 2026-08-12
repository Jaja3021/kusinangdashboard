import { FileSpreadsheet, AlertCircle } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import Badge, { BadgeTone } from "@/components/ui/Badge";
import DataTable, { Column } from "@/components/ui/DataTable";
import { adminExpenses, Expense, formatPeso } from "@/lib/dummy-data";

const statusTone: Record<Expense["status"], BadgeTone> = {
  Paid: "green",
  Pending: "amber",
  Overdue: "red",
};

const columns: Column<Expense>[] = [
  { key: "date", header: "Date" },
  { key: "category", header: "Category" },
  { key: "vendor", header: "Vendor", render: (r) => <span className="font-medium text-brand-900">{r.vendor}</span> },
  { key: "amount", header: "Amount", render: (r) => formatPeso(r.amount) },
  { key: "status", header: "Status", render: (r) => <Badge label={r.status} tone={statusTone[r.status]} /> },
];

export default function AdminExpensesPage() {
  const total = adminExpenses.reduce((sum, e) => sum + e.amount, 0);
  const overdue = adminExpenses.filter((e) => e.status === "Overdue").length;

  return (
    <div>
      <PageHeader title="Admin Expenses" subtitle="Overhead spend across rent, utilities, and operations." />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard label="Total This Period" value={formatPeso(total)} icon={<FileSpreadsheet size={18} className="text-gold-600" />} />
        <StatCard label="Overdue" value={String(overdue)} icon={<AlertCircle size={18} className="text-gold-600" />} footer={<span className="text-xs font-medium text-red-500">{"Follow up needed"}</span>} />
      </div>
      <div className="mt-6">
        <DataTable columns={columns} rows={adminExpenses} />
      </div>
    </div>
  );
}
