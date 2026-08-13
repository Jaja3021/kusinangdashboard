// Shapes Supabase's public.orders rows (see lib/orders/data.ts) into the
// view models the Inquiries, Bookings, and Customers pages render. There is
// no separate inquiries/bookings table — each order *is* the booking, so its
// `status` is the only lifecycle signal these pages have to map from.

import type { Booking, Customer, Inquiry } from "@/lib/dummy-data";
import { getBranchById } from "@/lib/mt/branches";
import type { OrderRecord, OrderStatus } from "./types";

const DATE_FORMAT = new Intl.DateTimeFormat("en-PH", {
  timeZone: "Asia/Manila",
  year: "numeric",
  month: "short",
  day: "numeric",
});

const DATETIME_FORMAT = new Intl.DateTimeFormat("en-PH", {
  timeZone: "Asia/Manila",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const MONTH_YEAR_FORMAT = new Intl.DateTimeFormat("en-PH", {
  timeZone: "Asia/Manila",
  month: "short",
  year: "numeric",
});

function formatDate(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : DATE_FORMAT.format(d);
}

function formatDateTime(value: string): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : DATETIME_FORMAT.format(d);
}

function fullName(order: OrderRecord): string {
  return `${order.firstName} ${order.lastName}`.trim();
}

const INQUIRY_STATUS: Record<OrderStatus, Inquiry["status"]> = {
  "Pending Confirmation": "New",
  Confirmed: "In Progress",
  Preparing: "In Progress",
  Completed: "Converted",
  Cancelled: "Lost",
};

const BOOKING_STATUS: Record<OrderStatus, Booking["status"]> = {
  "Pending Confirmation": "Pending Deposit",
  Confirmed: "Confirmed",
  Preparing: "Confirmed",
  Completed: "Completed",
  Cancelled: "Cancelled",
};

export function toInquiryRows(orders: OrderRecord[]): Inquiry[] {
  return orders.map((o) => ({
    id: o.orderNumber,
    name: fullName(o),
    eventType: o.eventType || "—",
    eventDate: formatDate(o.eventDate),
    guests: o.pax ?? 0,
    phone: o.phone,
    status: INQUIRY_STATUS[o.status],
    receivedAt: formatDateTime(o.createdAt),
  }));
}

export function toBookingRows(orders: OrderRecord[]): Booking[] {
  return orders.map((o) => ({
    id: o.orderNumber,
    client: fullName(o),
    eventType: o.eventType || "—",
    date: formatDate(o.eventDate),
    time: o.eventTime || "—",
    guests: o.pax ?? 0,
    branch: (o.branch && getBranchById(o.branch)?.name) || o.branch || "—",
    package: o.packageName || "—",
    venue: o.venue || "—",
    status: BOOKING_STATUS[o.status],
  }));
}

export function toCustomerRows(orders: OrderRecord[]): Customer[] {
  const groups = new Map<string, OrderRecord[]>();
  for (const o of orders) {
    const key = o.email.trim().toLowerCase();
    const group = groups.get(key);
    if (group) group.push(o);
    else groups.set(key, [o]);
  }

  return [...groups.entries()].map(([email, group]) => {
    const mostRecent = group.reduce((latest, o) =>
      Date.parse(o.createdAt) > Date.parse(latest.createdAt) ? o : latest,
    );
    const lifetimeSpend = group
      .filter((o) => o.status !== "Cancelled")
      .reduce((total, o) => total + o.total, 0);

    return {
      id: email,
      name: fullName(mostRecent),
      contact: email,
      totalBookings: group.length,
      lifetimeSpend,
      tier: lifetimeSpend >= 300_000 ? "Platinum" : lifetimeSpend >= 100_000 ? "Gold" : "Silver",
      lastEvent: `${mostRecent.eventType || "Order"} — ${MONTH_YEAR_FORMAT.format(
        new Date(mostRecent.eventDate || mostRecent.createdAt),
      )}`,
    };
  });
}
