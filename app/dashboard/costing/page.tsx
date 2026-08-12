import { Receipt, Percent } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import DataTable, { Column } from "@/components/ui/DataTable";
import { costing, Costing, formatPeso } from "@/lib/dummy-data";

type Row = Costing & { totalCost: number; margin: number; marginPct: number };

const rows: Row[] = costing.map((c) => {
  const totalCost = c.ingredientCost + c.laborCost + c.overheadCost;
  const margin = c.sellingPrice - totalCost;
  const marginPct = Math.round((margin / c.sellingPrice) * 1000) / 10;
  return { ...c, totalCost, margin, marginPct };
});

const columns: Column<Row>[] = [
  { key: "packageName", header: "Package", render: (r) => <span className="font-medium text-brand-900">{r.packageName}</span> },
  { key: "ingredientCost", header: "Ingredients / head", render: (r) => formatPeso(r.ingredientCost) },
  { key: "laborCost", header: "Labor / head", render: (r) => formatPeso(r.laborCost) },
  { key: "overheadCost", header: "Overhead / head", render: (r) => formatPeso(r.overheadCost) },
  { key: "totalCost", header: "Total Cost", render: (r) => formatPeso(r.totalCost) },
  { key: "sellingPrice", header: "Selling Price", render: (r) => formatPeso(r.sellingPrice) },
  { key: "marginPct", header: "Margin", render: (r) => `${r.marginPct}%` },
];

export default function CostingPage() {
  const avgMargin = Math.round((rows.reduce((sum, r) => sum + r.marginPct, 0) / rows.length) * 10) / 10;

  return (
    <div>
      <PageHeader title="Costing" subtitle="Per-head cost breakdown for every menu package." />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard label="Packages Costed" value={String(costing.length)} icon={<Receipt size={18} className="text-gold-600" />} />
        <StatCard label="Average Margin" value={`${avgMargin}%`} icon={<Percent size={18} className="text-gold-600" />} />
      </div>
      <div className="mt-6">
        <DataTable columns={columns} rows={rows} />
      </div>
    </div>
  );
}
