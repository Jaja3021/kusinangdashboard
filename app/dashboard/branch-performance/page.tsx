import { MapPin, Star, Users, TrendingUp } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import BranchRevenueBarChart from "@/components/charts/BranchRevenueBarChart";
import { branchPerformance, formatPeso } from "@/lib/dummy-data";

export default function BranchPerformancePage() {
  return (
    <div>
      <PageHeader title="Branch Performance" subtitle="How each branch is performing this quarter." />

      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="mb-4 font-display text-lg font-semibold text-brand-900">Revenue by Branch</h2>
        <BranchRevenueBarChart data={branchPerformance} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
        {branchPerformance.map((b) => (
          <div key={b.id} className="rounded-lg border border-gray-200 bg-white p-5">
            <div className="flex items-center gap-2 text-brand-800">
              <MapPin size={16} />
              <h3 className="font-display text-lg font-semibold text-brand-900">{b.branch}</h3>
            </div>
            <p className="mt-4 font-display text-2xl font-semibold text-brand-900">{formatPeso(b.revenue)}</p>
            <p className="text-xs text-emerald-600">+{b.growthPct}% growth</p>

            <div className="mt-5 grid grid-cols-3 gap-3 border-t border-gray-100 pt-4 text-sm">
              <div>
                <p className="flex items-center gap-1 text-xs text-slate-400"><TrendingUp size={12} /> Bookings</p>
                <p className="mt-1 font-medium text-brand-900">{b.bookings}</p>
              </div>
              <div>
                <p className="flex items-center gap-1 text-xs text-slate-400"><Star size={12} /> Rating</p>
                <p className="mt-1 font-medium text-brand-900">{b.rating.toFixed(1)}</p>
              </div>
              <div>
                <p className="flex items-center gap-1 text-xs text-slate-400"><Users size={12} /> Staff</p>
                <p className="mt-1 font-medium text-brand-900">{b.staffCount}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
