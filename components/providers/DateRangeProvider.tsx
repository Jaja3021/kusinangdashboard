"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_PRESET,
  PRESETS,
  presetLabel,
  rangeFor,
  type PresetId,
} from "@/lib/mt/dates";
import type { DateRange } from "@/lib/mt/types";

const STORAGE_KEY = "kp_date_range";

export type DateRangeSelection = {
  preset: PresetId;
  custom: Partial<DateRange>;
};

type DateRangeContextValue = {
  selection: DateRangeSelection;
  setSelection: (next: DateRangeSelection) => void;
  /** The concrete window the selection resolves to. */
  range: DateRange;
  label: string;
};

const DateRangeContext = createContext<DateRangeContextValue | null>(null);

const DEFAULT_SELECTION: DateRangeSelection = { preset: DEFAULT_PRESET, custom: {} };

const VALID_PRESETS = new Set(PRESETS.map((p) => p.id));

export function DateRangeProvider({ children }: { children: ReactNode }) {
  const [selection, setState] = useState<DateRangeSelection>(DEFAULT_SELECTION);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<DateRangeSelection>;
      if (parsed?.preset && VALID_PRESETS.has(parsed.preset)) {
        setState({ preset: parsed.preset, custom: parsed.custom ?? {} });
      }
    } catch {
      // Corrupt or blocked storage — fall back to the default.
    }
  }, []);

  const setSelection = useCallback((next: DateRangeSelection) => {
    setState(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Non-fatal.
    }
  }, []);

  const value = useMemo<DateRangeContextValue>(() => {
    const range = rangeFor(selection.preset, selection.custom);
    return {
      selection,
      setSelection,
      range,
      label: presetLabel(selection.preset, range),
    };
  }, [selection, setSelection]);

  return <DateRangeContext.Provider value={value}>{children}</DateRangeContext.Provider>;
}

export function useDateRange(): DateRangeContextValue {
  const ctx = useContext(DateRangeContext);
  if (!ctx) throw new Error("useDateRange must be used inside <DateRangeProvider>");
  return ctx;
}
