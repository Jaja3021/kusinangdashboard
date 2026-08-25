"use client";

// Shared, persisted status overrides for client-side mock (celebrity) orders
// — see lib/orders/mock-celebrity-orders.ts. Real Supabase orders never get
// an entry here (their status lives in the database), so getStatus() is
// safe to call on every order unconditionally. Same shape as
// BranchProvider.tsx: start empty so server/first-client-render agree, then
// load from localStorage after mount.

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { OrderStatus } from "@/lib/orders/types";

const STORAGE_KEY = "kp_mock_order_status";

type MockOrderStatusContextValue = {
  getStatus: (order: { id: string; status: OrderStatus }) => OrderStatus;
  setStatus: (id: string, status: OrderStatus) => void;
};

const MockOrderStatusContext = createContext<MockOrderStatusContextValue | null>(null);

export function MockOrderStatusProvider({ children }: { children: ReactNode }) {
  const [overrides, setOverrides] = useState<Record<string, OrderStatus>>({});

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setOverrides(JSON.parse(stored));
    } catch {
      // Private mode, blocked storage, or corrupt JSON — the defaults are fine.
    }
  }, []);

  const setStatus = useCallback((id: string, status: OrderStatus) => {
    setOverrides((cur) => {
      const next = { ...cur, [id]: status };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Non-fatal: the change just won't survive a reload.
      }
      return next;
    });
  }, []);

  const getStatus = useCallback(
    (order: { id: string; status: OrderStatus }) => overrides[order.id] ?? order.status,
    [overrides],
  );

  const value = useMemo<MockOrderStatusContextValue>(() => ({ getStatus, setStatus }), [getStatus, setStatus]);

  return <MockOrderStatusContext.Provider value={value}>{children}</MockOrderStatusContext.Provider>;
}

export function useMockOrderStatus(): MockOrderStatusContextValue {
  const ctx = useContext(MockOrderStatusContext);
  if (!ctx) throw new Error("useMockOrderStatus must be used inside <MockOrderStatusProvider>");
  return ctx;
}
