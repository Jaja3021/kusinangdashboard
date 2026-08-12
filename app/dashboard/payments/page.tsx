import { CreditCard, RotateCcw } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import Badge, { BadgeTone } from "@/components/ui/Badge";
import DataTable, { Column } from "@/components/ui/DataTable";
import { paymentsRefunds, PaymentRecord, formatPeso } from "@/lib/dummy-data";

const statusTone: Record<PaymentRecord["status"], BadgeTone> = {
  Completed: "green",
  Pending: "amber",
  Failed: "red",
};

const columns: Column<PaymentRecord>[] = [
  { key: "invoiceNo", header: "Invoice #", render: (r) => <span className="font-medium text-brand-900">{r.invoiceNo}</span> },
  { key: "client", header: "Client" },
  { key: "type", header: "Type", render: (r) => <Badge label={r.type} tone={r.type === "Refund" ? "red" : "slate"} /> },
  { key: "amount", header: "Amount", render: (r) => formatPeso(r.amount) },
  { key: "method", header: "Method" },
  { key: "date", header: "Date" },
  { key: "status", header: "Status", render: (r) => <Badge label={r.status} tone={statusTone[r.status]} /> },
];

export default function PaymentsRefundsPage() {
  const totalPayments = paymentsRefunds.filter((p) => p.type === "Payment").reduce((sum, p) => sum + p.amount, 0);
  const totalRefunds = paymentsRefunds.filter((p) => p.type === "Refund").reduce((sum, p) => sum + p.amount, 0);

  return (
    <div>
      <PageHeader title="Payments & Refunds" subtitle="Transaction history across all bookings." />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard label="Payments Received" value={formatPeso(totalPayments)} icon={<CreditCard size={18} className="text-gold-600" />} />
        <StatCard label="Refunds Issued" value={formatPeso(totalRefunds)} icon={<RotateCcw size={18} className="text-gold-600" />} footer={<span className="text-xs font-medium text-red-500">{"This period"}</span>} />
      </div>
      <div className="mt-6">
        <DataTable columns={columns} rows={paymentsRefunds} />
      </div>
    </div>
  );
}
