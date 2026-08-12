"use client";

import { useState } from "react";
import { Calendar, Check } from "lucide-react";
import { useDateRange } from "@/components/providers/DateRangeProvider";
import { PRESETS, type PresetId } from "@/lib/mt/dates";
import type { DateRange } from "@/lib/mt/types";
import { useDismissable } from "./useDismissable";

export default function DateRangePicker({ compact = false }: { compact?: boolean }) {
  const { selection, setSelection, label } = useDateRange();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Partial<DateRange>>(selection.custom ?? {});
  const ref = useDismissable<HTMLDivElement>(open, () => setOpen(false));

  function choose(preset: PresetId) {
    if (preset === "custom") {
      // Keep the panel open so the date inputs can be filled in.
      setDraft(selection.custom ?? {});
      setSelection({ preset, custom: selection.custom ?? {} });
      return;
    }
    setSelection({ preset, custom: {} });
    setOpen(false);
  }

  function applyCustom() {
    setSelection({ preset: "custom", custom: draft });
    setOpen(false);
  }

  const inverted = Boolean(draft.from && draft.to && draft.from > draft.to);
  const canApply = Boolean(draft.from && draft.to && !inverted);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`inline-flex items-center rounded-lg border border-gray-200 bg-white text-gray-700 transition-colors hover:bg-gray-50 ${
          compact ? "h-7 gap-1 px-2 text-xs" : "h-10 gap-2 px-3 text-sm"
        }`}
      >
        <Calendar size={compact ? 11 : 15} className="flex-shrink-0 text-gold-600" />
        <span className={compact ? "max-w-[74px] truncate" : "max-w-[150px] truncate"}>
          {label}
        </span>
      </button>

      {open && (
        <div
          role="listbox"
          className={`absolute z-50 mt-2 w-60 max-w-[calc(100vw-1.5rem)] rounded-xl border border-gray-200 bg-white py-1.5 shadow-lg ${
            compact ? "left-0" : "right-0"
          }`}
        >
          {PRESETS.map((preset) => (
            <button
              key={preset.id}
              role="option"
              aria-selected={selection.preset === preset.id}
              onClick={() => choose(preset.id)}
              className={`flex h-10 w-full items-center justify-between px-3 text-left text-sm transition-colors hover:bg-gray-50 ${
                selection.preset === preset.id
                  ? "font-medium text-gold-600"
                  : "text-gray-700"
              }`}
            >
              {preset.label}
              {selection.preset === preset.id && <Check size={15} />}
            </button>
          ))}

          {selection.preset === "custom" && (
            <div className="mt-1 border-t border-gray-100 px-3 pb-1 pt-2.5">
              {(["from", "to"] as const).map((field) => (
                <label key={field} className="mb-2 block">
                  <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    {field}
                  </span>
                  <input
                    type="date"
                    value={draft[field] ?? ""}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, [field]: e.target.value }))
                    }
                    className="h-9 w-full rounded-lg border border-gray-200 px-2 text-sm focus:border-gray-400 focus:outline-none"
                  />
                </label>
              ))}

              {inverted && (
                <p className="mb-2 text-[11px] text-red-500">
                  The start date is after the end date.
                </p>
              )}

              <button
                onClick={applyCustom}
                disabled={!canApply}
                className="h-9 w-full rounded-lg bg-gold-500 text-sm font-medium text-white transition-colors hover:bg-gold-600 disabled:opacity-40"
              >
                Apply
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
