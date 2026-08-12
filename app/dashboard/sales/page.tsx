import { TrendingUp, Wallet, Receipt } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import RevenueLineChart from "@/components/charts/RevenueLineChart";
import { salesSummary, monthlySales, formatPeso } from "@/lib/dummy-data";

export default function SalesPage() {
  return (
    <div>
      <PageHeader title="Sales" subtitle="Revenue performance across all branches." />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Month to Date" value={formatPeso(salesSummary.mtdRevenue)} icon={<TrendingUp size={18} className="text-gold-600" />} footer={<span className="text-xs font-medium text-emerald-600">{`+${salesSummary.growthPct}% vs. last month`}</span>} />
        <StatCard label="Trailing 12 Months" value={formatPeso(salesSummary.ytdRevenue)} icon={<Wallet size={18} className="text-gold-600" />} />
        <StatCard label="Average Order Value" value={formatPeso(salesSummary.avgOrderValue)} icon={<Receipt size={18} className="text-gold-600" />} />
      </div>

      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="mb-2 font-display text-lg font-semibold text-brand-900">Monthly Revenue</h2>
        <p className="mb-2 text-xs text-slate-400">Trailing 12 months, Quezon City + Makati + Cebu combined</p>
        <RevenueLineChart data={monthlySales} />
      </div>
    </div>
  );
}
