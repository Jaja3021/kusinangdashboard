import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Clock, MapPin, Users } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { BranchBadge, StatusBadge } from "@/components/ui/Badge";
import StatusSelect from "../StatusSelect";
import MockStatusSelect from "../MockStatusSelect";
import { getOrderById } from "@/lib/orders/data";
import { getPackagesData } from "@/lib/menu/data";
import { buildMockCelebrityOrders, isMockOrder } from "@/lib/orders/mock-celebrity-orders";
import { getBranchById } from "@/lib/mt/branches";
import { isRushOrder } from "@/lib/calendar/calc";
import { formatPeso } from "@/lib/format";

export const dynamic = "force-dynamic";

// The dashboard's single order-detail view. Added for the Catering
// Calendar's [VIEW ORDER] action, but deliberately built as a shared page
// rather than a calendar-only panel — the Orders, Bookings, and Inquiries
// tables can all link here too, so there's one place an order is described
// instead of three competing ones.

function Field({ label, value, icon }: { label: string; value: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3">
      <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-brand-900">{value}</div>
    </div>
  );
}

export default async function OrderDetailPage({ params }: { params: { id: string } }) {
  // Mock celebrity orders (see Orders/Calendar) never landed in Supabase, so
  // getOrderById can't see them — rebuild the same deterministic list and
  // look it up there instead.
  const order = isMockOrder({ id: params.id })
    ? (buildMockCelebrityOrders(await getPackagesData()).find((o) => o.id === params.id) ?? null)
    : await getOrderById(params.id);
  if (!order) notFound();

  const branchName = (order.branch && getBranchById(order.branch)?.name) || order.branch || "—";
  const rush = isRushOrder(order);
  const customer = `${order.firstName} ${order.lastName}`.trim();

  return (
    <div>
      <Link
        href="/dashboard/calendar"
        className="mb-3 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gold-600"
      >
        <ArrowLeft size={15} /> Back to calendar
      </Link>

      <PageHeader title={order.orderNumber} subtitle={`${order.eventType || "Order"} · ${customer}`}>
        {isMockOrder(order) ? (
          <MockStatusSelect id={order.id} status={order.status} />
        ) : (
          <StatusSelect id={order.id} status={order.status} />
        )}
      </PageHeader>

      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={order.status} />
          <StatusBadge status={order.paymentStatus} />
          <BranchBadge branch={branchName} />
          {rush && (
            <span className="inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold text-orange-700 ring-1 ring-inset ring-orange-600/20 bg-orange-50">
              🟠 RUSH
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Field label="Event Date" value={order.eventDate ?? "—"} icon={<CalendarDays size={13} />} />
          <Field label="Event Time" value={order.eventTime || "Not set"} icon={<Clock size={13} />} />
          <Field label="PAX" value={order.pax ?? order.quantityLabel ?? "—"} icon={<Users size={13} />} />
          <Field label="Venue" value={order.venue || "—"} icon={<MapPin size={13} />} />
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <section className="rounded-lg border border-gray-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-brand-900">Customer</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-gray-500">Name</dt>
                <dd className="font-medium text-brand-900">{customer || "—"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-gray-500">Email</dt>
                <dd className="truncate font-medium text-brand-900">{order.email}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-gray-500">Phone</dt>
                <dd className="font-medium text-brand-900">{order.phone}</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-brand-900">Order</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-gray-500">Package</dt>
                <dd className="text-right font-medium text-brand-900">{order.packageName}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-gray-500">Quantity</dt>
                <dd className="font-medium text-brand-900">{order.quantityLabel || "—"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-gray-500">Booked on</dt>
                <dd className="font-medium text-brand-900">{order.createdAt.slice(0, 10)}</dd>
              </div>
              <div className="flex justify-between gap-3 border-t border-gray-100 pt-2">
                <dt className="text-gray-500">Total</dt>
                <dd className="font-semibold text-brand-900">{formatPeso(order.total)}</dd>
              </div>
            </dl>
          </section>
        </div>
      </div>
    </div>
  );
}
