"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

/**
 * Stands in for the live CRM feed. The real dashboard polls an API every 60s;
 * here the data is static, so this only reproduces the *timing* surface the UI
 * reads — a last-synced clock, a brief loading blip, and a manual refresh.
 */

const REFRESH_INTERVAL_MS = 60_000;
const SETTLE_MS = 600;

type SyncContextValue = {
  /** Null until the first sync lands, which is also the SSR value. */
  lastUpdated: Date | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
  intervalSeconds: number;
};

const SyncContext = createContext<SyncContextValue | null>(null);

export function SyncProvider({ children }: { children: ReactNode }) {
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(() => {
    setLoading(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setLastUpdated(new Date());
      setLoading(false);
    }, SETTLE_MS);
  }, []);

  // First sync after mount, then on the poll interval. Deferring to an effect
  // keeps the clock out of the server render, where it would never match.
  useEffect(() => {
    refresh();
    const id = setInterval(refresh, REFRESH_INTERVAL_MS);
    return () => {
      clearInterval(id);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [refresh]);

  const value = useMemo<SyncContextValue>(
    () => ({
      lastUpdated,
      loading,
      error: null,
      refresh,
      intervalSeconds: REFRESH_INTERVAL_MS / 1000,
    }),
    [lastUpdated, loading, refresh],
  );

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync(): SyncContextValue {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error("useSync must be used inside <SyncProvider>");
  return ctx;
}
