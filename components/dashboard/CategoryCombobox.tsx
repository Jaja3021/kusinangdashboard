"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useDismissable } from "@/components/shell/useDismissable";
import { GROUP_OF_CATEGORY, matchExpenseCategories, type ExpenseCategory } from "@/lib/admin-expenses/categories";

/** A searchable "Select a category…" combobox — a trigger button that opens
 * a search input + a flat, filterable list (category name left, its group
 * right-aligned in gray), rather than a native <select>/<optgroup> pair. */
export default function CategoryCombobox({
  value,
  onChange,
}: {
  value: string;
  onChange: (category: ExpenseCategory) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useDismissable<HTMLDivElement>(open, () => setOpen(false));
  const matches = matchExpenseCategories(query);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-left text-sm outline-none focus:border-gold-400"
      >
        <span className={value ? "text-brand-900" : "text-gray-400"}>{value || "Select a category…"}</span>
        <ChevronDown size={14} className={`text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type to search…"
            className="w-full border-b border-gray-100 px-3 py-2 text-sm text-brand-900 outline-none"
          />
          <div className="max-h-56 overflow-y-auto">
            {matches.length === 0 && <p className="px-3 py-3 text-sm text-gray-400">No matching categories.</p>}
            {matches.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  onChange(c);
                  setQuery("");
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-orange-50 ${
                  c === value ? "bg-orange-50" : ""
                }`}
              >
                <span className="text-gray-800">{c}</span>
                <span className="flex-shrink-0 text-xs text-gray-400">{GROUP_OF_CATEGORY[c]}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
