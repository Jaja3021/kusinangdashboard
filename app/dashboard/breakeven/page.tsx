import { Activity, Users, Wallet, Scale } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import { breakEvenExample, formatPeso } from "@/lib/dummy-data";

export default function BreakEvenPage() {
  const { fixedCosts, variableCostPerGuest, pricePerGuest } = breakEvenExample;
  const contributionMargin = pricePerGuest - variableCostPerGuest;
  const breakEvenGuests = Math.ceil(fixedCosts / contributionMargin);
  const breakEvenRevenue = breakEvenGuests * pricePerGuest;

  const scenarios = [100, 150, breakEvenGuests, 250, 300].sort((a, b) => a - b);

  return (
    <div>
      <PageHeader title="Break-even Analysis" subtitle="Minimum guest count to cover fixed costs on a sample event." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Fixed Costs" value={formatPeso(fixedCosts)} icon={<Wallet size={18} className="text-gold-600" />} />
        <StatCard label="Variable Cost / Guest" value={formatPeso(variableCostPerGuest)} icon={<Scale size={18} className="text-gold-600" />} />
        <StatCard label="Contribution Margin" value={formatPeso(contributionMargin)} icon={<Activity size={18} className="text-gold-600" />} />
        <StatCard label="Break-even Guests" value={String(breakEvenGuests)} icon={<Users size={18} className="text-gold-600" />} footer={<span className="text-xs font-medium text-emerald-600">{`${formatPeso(breakEvenRevenue)} revenue`}</span>} />
      </div>

      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="mb-5 font-display text-lg font-semibold text-brand-900">Profit by Guest Count</h2>
        <div className="space-y-4">
          {scenarios.map((guests) => {
            const profit = guests * contributionMargin - fixedCosts;
            const isBreakEven = guests === breakEvenGuests;
            const widthPct = Math.min(100, Math.max(6, (guests / (scenarios[scenarios.length - 1] * 1.1)) * 100));
            return (
              <div key={guests} className="flex items-center gap-4">
                <span className="w-24 shrink-0 text-sm text-slate-500">{guests} guests{isBreakEven ? " *" : ""}</span>
                <div className="h-3 flex-1 rounded-full bg-brand-50">
                  <div
                    className={`h-3 rounded-full ${profit >= 0 ? "bg-emerald-500" : "bg-red-400"}`}
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
                <span className={`w-32 shrink-0 text-right text-sm font-medium ${profit >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                  {profit >= 0 ? "+" : ""}{formatPeso(profit)}
                </span>
              </div>
            );
          })}
        </div>
        <p className="mt-4 text-xs text-slate-400">* Break-even point — where profit crosses zero.</p>
      </div>
    </div>
  );
}
