import { CalendarDays, CalendarCheck, CalendarClock } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import Badge, { BadgeTone } from "@/components/ui/Badge";
import DataTable, { Column } from "@/components/ui/DataTable";
import { bookings, Booking } from "@/lib/dummy-data";

const statusTone: Record<Booking["status"], BadgeTone> = {
  Confirmed: "green",
  "Pending Deposit": "amber",
  Completed: "slate",
  Cancelled: "red",
};

const columns: Column<Booking>[] = [
  { key: "id", header: "Booking #", render: (r) => <span className="font-medium text-brand-900">{r.id}</span> },
  { key: "client", header: "Client" },
  { key: "eventType", header: "Event Type" },
  { key: "date", header: "Date" },
  { key: "guests", header: "Guests" },
  { key: "branch", header: "Branch" },
  { key: "venue", header: "Venue" },
  { key: "status", header: "Status", render: (r) => <Badge label={r.status} tone={statusTone[r.status]} /> },
];

export default function BookingsPage() {
  const confirmed = bookings.filter((b) => b.status === "Confirmed").length;
  const pending = bookings.filter((b) => b.status === "Pending Deposit").length;

  return (
    <div>
      <PageHeader title="Bookings" subtitle="All events booked across Quezon City, Makati, and Cebu." />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total Bookings" value={String(bookings.length)} icon={<CalendarDays size={18} className="text-gold-600" />} />
        <StatCard label="Confirmed" value={String(confirmed)} icon={<CalendarCheck size={18} className="text-gold-600" />} />
        <StatCard label="Pending Deposit" value={String(pending)} icon={<CalendarClock size={18} className="text-gold-600" />} />
      </div>
      <div className="mt-6">
        <DataTable columns={columns} rows={bookings} />
      </div>
    </div>
  );
}
