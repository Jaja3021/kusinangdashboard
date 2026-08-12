// Operational alerts derived from the pipeline. Ported from the deployed
// dashboard: the same four kinds, the same severity ordering.

import { daysUntil, todayManila } from "./dates";
import { isCancelled, isConfirmed } from "./pipeline";
import type { Opportunity } from "./types";

export type Severity = "danger" | "warning" | "info";

export type NotificationKind =
  | "order-arrived"
  | "order-cancelled"
  | "balance-unsettled"
  | "receipt-review";

export type Notification = {
  key: string;
  kind: NotificationKind;
  severity: Severity;
  title: string;
  body: string;
  branch: string | null;
  path: string;
};

const PATHS: Record<NotificationKind, string> = {
  "order-arrived": "/dashboard/kitchen",
  "order-cancelled": "/dashboard/kitchen",
  "balance-unsettled": "/dashboard/payments",
  "receipt-review": "/dashboard/payments",
};

const SEVERITY_ORDER: Record<Severity, number> = { danger: 0, warning: 1, info: 2 };

export function buildNotifications({
  opportunities = [],
  pendingReceipts = 0,
  today = todayManila(),
}: {
  opportunities?: Opportunity[];
  pendingReceipts?: number;
  today?: string;
} = {}): Notification[] {
  const out: Notification[] = [];

  for (const o of opportunities) {
    const stage = (o.stageName ?? "").trim();

    // A cancellation only matters while the kitchen might still be working on it.
    if (stage === "Cancelled" && isCancelled(o)) {
      const lead = daysUntil(o.eventDate, today);
      if (lead !== null && lead >= -1) {
        out.push({
          key: `order-cancelled:${o.id}`,
          kind: "order-cancelled",
          severity: "danger",
          title: `Cancelled — ${o.name}`,
          body: `${o.eventType || "Order"} for ${o.eventDate || "an unspecified date"} was cancelled. Stop preparation.`,
          branch: o.branch,
          path: PATHS["order-cancelled"],
        });
      }
      continue;
    }

    if (!isConfirmed(o)) continue;

    if (stage === "3 Days Before Event") {
      out.push({
        key: `order-arrived:${o.id}`,
        kind: "order-arrived",
        severity: "info",
        title: `New order — ${o.name}`,
        body: `${o.packageName || o.eventType || "Order"}${o.pax ? ` for ${o.pax} pax` : ""} on ${o.eventDate}. Now in the kitchen.`,
        branch: o.branch,
        path: PATHS["order-arrived"],
      });
    }

    const lead = daysUntil(o.eventDate, today);
    const settled =
      o.paymentStage === "Full Payment" || Number(o.amountPaid ?? 0) >= Number(o.amount ?? 0);

    if (lead !== null && lead >= 0 && lead <= 1 && !settled) {
      out.push({
        key: `balance-unsettled:${o.id}:${o.eventDate}`,
        kind: "balance-unsettled",
        severity: "warning",
        title: `Balance outstanding — ${o.name}`,
        body: `Event ${lead === 0 ? "today" : "tomorrow"} and payment is not settled. Food should not be released.`,
        branch: o.branch,
        path: PATHS["balance-unsettled"],
      });
    }
  }

  if (pendingReceipts > 0) {
    out.push({
      key: `receipt-review:${pendingReceipts}`,
      kind: "receipt-review",
      severity: "info",
      title: `${pendingReceipts} payment receipt${pendingReceipts === 1 ? "" : "s"} to review`,
      body: "Someone has uploaded proof of payment and it is waiting on Payments & Refunds.",
      branch: null,
      path: PATHS["receipt-review"],
    });
  }

  return out.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
}
