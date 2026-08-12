import { Landmark, TrendingDown, TrendingUp, Percent } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import DataTable, { Column } from "@/components/ui/DataTable";
import FinancialsBarChart from "@/components/charts/FinancialsBarChart";
import { ownerFinancialsSummary, ownerFinancialsMonthly, formatPeso } from "@/lib/dummy-data";

type Row = (typeof ownerFinancialsMonthly)[number];

const columns: Column<Row>[] = [
  { key: "month", header: "Month", render: (r) => <span className="font-medium text-brand-900">{r.month}</span> },
  { key: "revenue", header: "Revenue", render: (r) => formatPeso(r.revenue) },
  { key: "expenses", header: "Expenses", render: (r) => formatPeso(r.expenses) },
  { key: "profit", header: "Net Profit", render: (r) => <span className="font-medium text-emerald-600">{formatPeso(r.profit)}</span> },
];

export default function OwnerFinancialsPage() {
  return (
    <div>
      <PageHeader title="Owner Financials" subtitle="Confidential — revenue, expenses, and profit across the business." />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Revenue" value={formatPeso(ownerFinancialsSummary.totalRevenue)} icon={<TrendingUp size={18} className="text-gold-600" />} />
        <StatCard label="Total Expenses" value={formatPeso(ownerFinancialsSummary.totalExpenses)} icon={<TrendingDown size={18} className="text-gold-600" />} />
        <StatCard label="Net Profit" value={formatPeso(ownerFinancialsSummary.netProfit)} icon={<Landmark size={18} className="text-gold-600" />} />
        <StatCard label="Profit Margin" value={`${ownerFinancialsSummary.profitMarginPct}%`} icon={<Percent size={18} className="text-gold-600" />} />
      </div>
      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="mb-4 font-display text-lg font-semibold text-brand-900">Revenue vs. Expenses vs. Profit</h2>
        <FinancialsBarChart data={ownerFinancialsMonthly} />
      </div>

      <div className="mt-6">
        <DataTable columns={columns} rows={ownerFinancialsMonthly} />
      </div>
    </div>
  );
}
