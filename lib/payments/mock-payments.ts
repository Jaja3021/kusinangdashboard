// Payment records for today's mock walk-in orders (see
// lib/orders/mock-celebrity-orders.ts's buildTodaysMockOrders) — nothing
// here is written to Supabase. Lets the Payments dashboard show something
// coherent (same client names as the Overview "Today's Orders" widget) in a
// fresh environment with no real payment activity yet. Ids are prefixed
// "MOCK-PAY-" so PaymentsClient.tsx can route Verify/Reject on these rows to
// local state instead of the real verify/reject server actions.

import type { OrderRecord } from "@/lib/orders/types";
import { PAYMENT_METHODS, type PaymentMethod, type PaymentQueueRow } from "./types";

function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function isMockPayment(id: string): boolean {
  return id.startsWith("MOCK-PAY-");
}

// Only today's Confirmed orders get a payment record — that status is what
// tells the story here: a client whose order reads "Confirmed" has paid in
// full, so their dummy payment is generated straight from that. Any other
// status (Pending Confirmation, Preparing, Cooking, Ready for Delivery,
// Cancelled) has no payment to show yet.
export function buildTodaysMockPayments(todaysOrders: OrderRecord[]): PaymentQueueRow[] {
  const rng = seeded(20260825);
  return todaysOrders
    .filter((order) => order.status === "Confirmed")
    .map((order, i) => {
      const method: PaymentMethod = PAYMENT_METHODS[Math.floor(rng() * PAYMENT_METHODS.length)];
      const createdAt = `${order.eventDate}T${String(8 + Math.floor(rng() * 4)).padStart(2, "0")}:${String(Math.floor(rng() * 59)).padStart(2, "0")}:00+08:00`;
      const referenceNumber = String(Math.floor(1000000000 + rng() * 8999999999));

      return {
        id: `MOCK-PAY-${9000 + i}`,
        orderId: order.id,
        kind: "Balance",
        method,
        amount: order.total,
        referenceNumber,
        proofPath: null,
        status: "Verified",
        adminNote: null,
        verifiedAt: createdAt,
        verifiedBy: "Front Desk",
        createdAt,
        updatedAt: createdAt,
        orderNumber: order.orderNumber,
        customerName: `${order.firstName} ${order.lastName}`.trim(),
        branch: order.branch,
        eventDate: order.eventDate,
        packageName: order.packageName,
        orderTotal: order.total,
        orderDepositAmount: Math.round(order.total * 0.3),
        orderAmountPaid: order.total,
        orderPaymentStatus: "Paid",
      };
    });
}
