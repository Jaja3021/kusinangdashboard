"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Wifi, Zap } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { useSync } from "@/components/providers/SyncProvider";
import { opportunities } from "@/lib/mt/opportunities";
import { search, type SearchResult } from "@/lib/mt/search";
import BranchSelector from "./BranchSelector";
import DateRangePicker from "./DateRangePicker";
import NotificationsMenu from "./NotificationsMenu";
import ProfileMenu from "./ProfileMenu";
import { useDismissable } from "./useDismissable";

const LOGO_IMAGE =
  "https://assets.cdn.filesafe.space/xALi9D5ZQRYrKD8SoD6y/media/6a734833329b76ca7b4b64e0.png";

function ResultRow({
  result,
  onPick,
}: {
  result: SearchResult;
  onPick: (r: SearchResult) => void;
}) {
  return (
    <button
      onClick={() => onPick(result)}
      className="flex w-full items-center justify-between border-b border-gray-50 px-3 py-2.5 text-left transition-colors last:border-0 hover:bg-gray-50"
    >
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-gray-900">
          {result.label}
        </span>
        <span className="block truncate text-xs text-gray-400">{result.sub}</span>
      </span>
      <span className="ml-3 flex-shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-400">
        {result.type}
      </span>
    </button>
  );
}

export default function Topbar() {
  const router = useRouter();
  const { lastUpdated, loading } = useSync();

  const [term, setTerm] = useState("");
  const [desktopOpen, setDesktopOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  const searchRef = useDismissable<HTMLDivElement>(desktopOpen, () =>
    setDesktopOpen(false),
  );

  const results = useMemo(() => search(opportunities, term), [term]);

  function pick(result: SearchResult) {
    router.push(result.path);
    setTerm("");
    setDesktopOpen(false);
    setMobileSearchOpen(false);
  }

  return (
    <div className="relative z-20 flex h-14 flex-shrink-0 items-center gap-3 border-b border-gray-200 bg-white px-4 md:px-5">
      {/* Mobile: brand + the two scope controls, since there's no sidebar. */}
      <div className="flex min-w-0 flex-1 items-center gap-2 md:hidden">
        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-brand-900">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO_IMAGE} alt="" className="h-full w-full object-cover" />
        </div>
        <div className="flex-shrink-0">
          <DateRangePicker compact />
        </div>
        <div className="flex-shrink-0">
          <BranchSelector compact />
        </div>
      </div>

      {/* Desktop search */}
      <div className="relative hidden max-w-md flex-1 md:flex" ref={searchRef}>
        <Search
          size={15}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          type="text"
          value={term}
          onChange={(e) => {
            setTerm(e.target.value);
            setDesktopOpen(true);
          }}
          placeholder="Search orders, customers, bookings…"
          className="w-full rounded-lg border border-gray-200 bg-gray-50 py-1.5 pl-9 pr-3 text-sm text-gray-700 placeholder-gray-400 outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-500/20"
        />
        {desktopOpen && results.length > 0 && (
          <div className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl">
            {results.map((r, i) => (
              <ResultRow key={`${r.type}-${r.label}-${i}`} result={r} onPick={pick} />
            ))}
          </div>
        )}
      </div>

      <div className="ml-auto flex items-center gap-2.5">
        <button
          onClick={() => setMobileSearchOpen(true)}
          aria-label="Search"
          className="-mr-1 rounded-lg p-2 text-gray-500 active:text-gold-600 md:hidden"
        >
          <Search size={19} />
        </button>

        {/* Sync status. Static data, so this only ever reports connecting/live. */}
        <span
          className={`hidden items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium md:flex ${
            lastUpdated
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-gray-200 text-gray-500"
          }`}
        >
          {lastUpdated ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <Wifi size={12} /> CRM: Live
            </>
          ) : (
            <>
              <Zap size={12} /> CRM Sync{loading ? "…" : ": Connecting"}
            </>
          )}
        </span>

        <div className="hidden md:block">
          <DateRangePicker />
        </div>
        <div className="hidden md:block">
          <BranchSelector />
        </div>

        <NotificationsMenu />
        <ProfileMenu />
      </div>

      <Modal
        isOpen={mobileSearchOpen}
        onClose={() => {
          setMobileSearchOpen(false);
          setTerm("");
        }}
        title="Search"
        size="md"
      >
        <div className="relative">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            autoFocus
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Orders, customers, bookings…"
            className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-3 text-sm text-gray-700 placeholder-gray-400 outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-500/20"
          />
        </div>
        <div className="-mx-1 mt-3">
          {term.trim() && results.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">
              No matches for “{term}”.
            </p>
          ) : (
            results.map((r, i) => (
              <ResultRow key={`${r.type}-${r.label}-${i}`} result={r} onPick={pick} />
            ))
          )}
        </div>
      </Modal>
    </div>
  );
}
