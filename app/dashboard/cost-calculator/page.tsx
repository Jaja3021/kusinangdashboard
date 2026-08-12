import { Calculator } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { costCalculatorExample, formatPeso } from "@/lib/dummy-data";

export default function CostCalculatorPage() {
  const c = costCalculatorExample;
  const costPerHead = c.ingredientCostPerHead + c.laborCostPerHead + c.overheadCostPerHead;
  const totalCost = costPerHead * c.guests;
  const totalRevenue = c.pricePerHead * c.guests;
  const totalProfit = totalRevenue - totalCost;
  const marginPct = Math.round((totalProfit / totalRevenue) * 1000) / 10;

  const rows = [
    { label: "Ingredient Cost / head", value: c.ingredientCostPerHead },
    { label: "Labor Cost / head", value: c.laborCostPerHead },
    { label: "Overhead Cost / head", value: c.overheadCostPerHead },
  ];

  return (
    <div>
      <PageHeader title="Cost Calculator" subtitle="Example cost breakdown for a sample event." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <div className="mb-5 flex items-center gap-2">
            <Calculator size={18} className="text-brand-800" />
            <h2 className="font-display text-lg font-semibold text-brand-900">{c.packageName}</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Guests</span>
              <span className="font-medium text-brand-900">{c.guests}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Price / head</span>
              <span className="font-medium text-brand-900">{formatPeso(c.pricePerHead)}</span>
            </div>
            <div className="border-t border-gray-100 pt-4">
              {rows.map((r) => (
                <div key={r.label} className="mb-3 flex items-center justify-between text-sm">
                  <span className="text-slate-500">{r.label}</span>
                  <span className="font-medium text-brand-900">{formatPeso(r.value)}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between border-t border-gray-100 pt-4 text-sm font-semibold">
              <span className="text-slate-600">Total Cost / head</span>
              <span className="text-brand-900">{formatPeso(costPerHead)}</span>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-brand-800 bg-gradient-to-br from-brand-900 to-brand-800 p-5 text-white">
          <h2 className="font-display text-lg font-semibold">Event Summary</h2>
          <div className="mt-5 space-y-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-brand-100/70">Total Revenue</span>
              <span className="font-medium">{formatPeso(totalRevenue)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-brand-100/70">Total Cost</span>
              <span className="font-medium">{formatPeso(totalCost)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-white/10 pt-4 text-base font-semibold">
              <span>Net Profit</span>
              <span className="text-gold-400">{formatPeso(totalProfit)}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-brand-100/70">
              <span>Margin</span>
              <span>{marginPct}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
