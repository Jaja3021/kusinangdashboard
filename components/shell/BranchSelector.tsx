"use client";

import { useState } from "react";
import { ChevronDown, MapPin } from "lucide-react";
import { useBranch } from "@/components/providers/BranchProvider";
import { ALL_BRANCHES } from "@/lib/mt/branches";
import { useDismissable } from "./useDismissable";

export default function BranchSelector({ compact = false }: { compact?: boolean }) {
  const { options, selectedBranch, setSelectedBranch } = useBranch();
  const [open, setOpen] = useState(false);
  const ref = useDismissable<HTMLDivElement>(open, () => setOpen(false));

  const buttonLabel =
    compact && selectedBranch === ALL_BRANCHES ? "All" : selectedBranch;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex items-center rounded-lg border border-gray-200 font-medium text-gray-700 transition-colors hover:bg-gray-50 ${
          compact ? "gap-1 px-2 py-1 text-xs" : "gap-1.5 px-3 py-1.5 text-sm"
        }`}
      >
        <MapPin
          size={compact ? 11 : 14}
          className={compact ? "text-gold-600" : "text-gray-500"}
        />
        <span className={compact ? "max-w-[80px] truncate" : ""}>{buttonLabel}</span>
        <ChevronDown
          size={compact ? 10 : 14}
          className={`text-gray-400 transition-transform duration-150 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className={`absolute top-full z-30 mt-1 rounded-lg border border-gray-200 bg-white py-1 shadow-lg ${
            compact ? "left-0 min-w-[140px]" : "right-0 min-w-[160px]"
          }`}
        >
          {options.map((option) => (
            <button
              key={option}
              role="option"
              aria-selected={selectedBranch === option}
              onClick={() => {
                setSelectedBranch(option);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-gray-50 ${
                selectedBranch === option ? "font-medium text-gold-600" : "text-gray-700"
              }`}
            >
              <MapPin size={12} />
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
