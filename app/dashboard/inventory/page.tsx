import { Package, AlertTriangle, Boxes } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import Badge from "@/components/ui/Badge";
import DataTable, { Column } from "@/components/ui/DataTable";
import { inventory, InventoryItem } from "@/lib/dummy-data";

const columns: Column<InventoryItem>[] = [
  { key: "item", header: "Item", render: (r) => <span className="font-medium text-brand-900">{r.item}</span> },
  { key: "category", header: "Category" },
  { key: "stock", header: "In Stock", render: (r) => `${r.stock} ${r.unit}` },
  { key: "reorderLevel", header: "Reorder Level", render: (r) => `${r.reorderLevel} ${r.unit}` },
  {
    key: "status",
    header: "Status",
    render: (r) =>
      r.stock <= r.reorderLevel ? <Badge label="Low Stock" tone="red" /> : <Badge label="In Stock" tone="green" />,
  },
];

export default function InventoryPage() {
  const lowStock = inventory.filter((i) => i.stock <= i.reorderLevel).length;
  const categories = new Set(inventory.map((i) => i.category)).size;

  return (
    <div>
      <PageHeader title="Inventory" subtitle="Stock levels across all branches." />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Tracked Items" value={String(inventory.length)} icon={<Package size={18} className="text-gold-600" />} />
        <StatCard label="Low Stock Alerts" value={String(lowStock)} icon={<AlertTriangle size={18} className="text-gold-600" />} footer={<span className="text-xs font-medium text-red-500">{"Needs reorder"}</span>} />
        <StatCard label="Categories" value={String(categories)} icon={<Boxes size={18} className="text-gold-600" />} />
      </div>
      <div className="mt-6">
        <DataTable columns={columns} rows={inventory} />
      </div>
    </div>
  );
}
