import { MessageCircle, Clock, CheckCircle2, XCircle } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import Badge, { BadgeTone } from "@/components/ui/Badge";
import DataTable, { Column } from "@/components/ui/DataTable";
import { inquiries, Inquiry } from "@/lib/dummy-data";

const statusTone: Record<Inquiry["status"], BadgeTone> = {
  New: "blue",
  "In Progress": "amber",
  Converted: "green",
  Lost: "slate",
};

const columns: Column<Inquiry>[] = [
  { key: "name", header: "Name", render: (r) => <span className="font-medium text-brand-900">{r.name}</span> },
  { key: "eventType", header: "Event Type" },
  { key: "eventDate", header: "Event Date" },
  { key: "guests", header: "Guests" },
  { key: "phone", header: "Phone" },
  { key: "receivedAt", header: "Received" },
  { key: "status", header: "Status", render: (r) => <Badge label={r.status} tone={statusTone[r.status]} /> },
];

export default function InquiriesPage() {
  const newCount = inquiries.filter((i) => i.status === "New").length;
  const inProgressCount = inquiries.filter((i) => i.status === "In Progress").length;
  const convertedCount = inquiries.filter((i) => i.status === "Converted").length;
  const lostCount = inquiries.filter((i) => i.status === "Lost").length;

  return (
    <div>
      <PageHeader title="Inquiries" subtitle="Leads collected from the website, phone, and walk-ins." />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="New" value={String(newCount)} icon={<MessageCircle size={18} className="text-gold-600" />} />
        <StatCard label="In Progress" value={String(inProgressCount)} icon={<Clock size={18} className="text-gold-600" />} />
        <StatCard label="Converted" value={String(convertedCount)} icon={<CheckCircle2 size={18} className="text-gold-600" />} footer={<span className="text-xs font-medium text-emerald-600">{"This month"}</span>} />
        <StatCard label="Lost" value={String(lostCount)} icon={<XCircle size={18} className="text-gold-600" />} footer={<span className="text-xs font-medium text-red-500">{"This month"}</span>} />
      </div>
      <div className="mt-6">
        <DataTable columns={columns} rows={inquiries} />
      </div>
    </div>
  );
}
