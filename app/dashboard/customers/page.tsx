import { Users, Crown, Repeat } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import Badge, { BadgeTone } from "@/components/ui/Badge";
import DataTable, { Column } from "@/components/ui/DataTable";
import { customers, Customer, formatPeso } from "@/lib/dummy-data";

const tierTone: Record<Customer["tier"], BadgeTone> = {
  Platinum: "gold",
  Gold: "amber",
  Silver: "slate",
};

const columns: Column<Customer>[] = [
  { key: "name", header: "Name", render: (r) => <span className="font-medium text-brand-900">{r.name}</span> },
  { key: "contact", header: "Contact" },
  { key: "totalBookings", header: "Bookings" },
  { key: "lifetimeSpend", header: "Lifetime Spend", render: (r) => formatPeso(r.lifetimeSpend) },
  { key: "lastEvent", header: "Last Event" },
  { key: "tier", header: "Tier", render: (r) => <Badge label={r.tier} tone={tierTone[r.tier]} /> },
];

export default function CustomersPage() {
  const platinum = customers.filter((c) => c.tier === "Platinum").length;
  const repeatCustomers = customers.filter((c) => c.totalBookings > 1).length;

  return (
    <div>
      <PageHeader title="Customers" subtitle="Everyone who has booked with Kusinang Pamana." />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total Customers" value={String(customers.length)} icon={<Users size={18} className="text-gold-600" />} />
        <StatCard label="Platinum Tier" value={String(platinum)} icon={<Crown size={18} className="text-gold-600" />} />
        <StatCard label="Repeat Customers" value={String(repeatCustomers)} icon={<Repeat size={18} className="text-gold-600" />} />
      </div>
      <div className="mt-6">
        <DataTable columns={columns} rows={customers} />
      </div>
    </div>
  );
}
