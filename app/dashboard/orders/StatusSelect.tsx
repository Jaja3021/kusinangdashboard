"use client";

import { ORDER_STATUSES, type OrderStatus } from "@/lib/orders/types";
import { updateOrderStatusAction } from "./actions";

export default function StatusSelect({ id, status }: { id: string; status: OrderStatus }) {
  return (
    <form action={updateOrderStatusAction}>
      <input type="hidden" name="id" value={id} />
      <select
        name="status"
        defaultValue={status}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-medium text-gray-700 outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-500/20"
      >
        {ORDER_STATUSES.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
    </form>
  );
}
