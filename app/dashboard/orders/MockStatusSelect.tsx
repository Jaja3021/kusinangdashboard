"use client";

// Same shape as StatusSelect.tsx, but for mock (celebrity) orders — those
// aren't Supabase rows, so a write through the real server action would
// touch zero rows and the next revalidate would just snap the status back.
// Status instead lives in MockOrderStatusProvider, the same override the
// Kitchen board and Orders page read/write.

import { useMockOrderStatus } from "@/components/providers/MockOrderStatusProvider";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/orders/types";

export default function MockStatusSelect({ id, status }: { id: string; status: OrderStatus }) {
  const { getStatus, setStatus } = useMockOrderStatus();
  const current = getStatus({ id, status });

  return (
    <select
      value={current}
      onChange={(e) => setStatus(id, e.target.value as OrderStatus)}
      className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-medium text-gray-700 outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-500/20"
    >
      {ORDER_STATUSES.map((s) => (
        <option key={s} value={s}>{s}</option>
      ))}
    </select>
  );
}
