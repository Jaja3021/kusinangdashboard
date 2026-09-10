"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/orders/types";
import { updateOrderStatusBatchAction } from "./actions";

/** Same look as StatusSelect, but for a row that represents a whole checkout
 * (possibly several packages sharing one batch_id) — changing it updates
 * every order id passed in at once. A single-package checkout just passes a
 * one-item `ids` array, so it behaves identically to StatusSelect. */
export default function BatchStatusSelect({ ids, status }: { ids: string[]; status: OrderStatus }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as OrderStatus;
    setPending(true);
    try {
      await updateOrderStatusBatchAction(ids, next);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <select
      defaultValue={status}
      onChange={handleChange}
      disabled={pending}
      className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-medium text-gray-700 outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-500/20 disabled:opacity-60"
    >
      {ORDER_STATUSES.map((s) => (
        <option key={s} value={s}>{s}</option>
      ))}
    </select>
  );
}
