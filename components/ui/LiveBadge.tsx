"use client";

import { Loader2, RefreshCw, TriangleAlert, Wifi } from "lucide-react";

function clockLabel(date: Date | null): string | null {
  if (!date) return null;
  return date.toLocaleTimeString("en-PH", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function LiveBadge({
  lastUpdated,
  loading = false,
  error = null,
  onRefresh,
}: {
  lastUpdated: Date | null;
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
}) {
  const stamp = clockLabel(lastUpdated);

  if (error) {
    return (
      <div className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-600">
        <TriangleAlert size={12} className="shrink-0" />
        <span className="max-w-[260px] truncate" title={error}>
          Sync error: {error}
        </span>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="ml-1 shrink-0 font-medium underline hover:no-underline"
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  // No stamp yet means the very first sync hasn't landed — including the
  // server render, which is why this branch has to come before the live one.
  if (loading && !lastUpdated) {
    return (
      <div className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-500">
        <Loader2 size={12} className="shrink-0 animate-spin" />
        <span>Connecting to CRM…</span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs text-emerald-700">
      <span className="relative flex h-2 w-2 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
      </span>
      <Wifi size={12} />
      <span>Live from CRM{stamp ? ` · ${stamp}` : ""}</span>
      {onRefresh && (
        <button
          onClick={onRefresh}
          disabled={loading}
          title="Refresh"
          className="ml-1 text-emerald-600 transition-colors hover:text-emerald-800 disabled:opacity-40"
        >
          <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
        </button>
      )}
    </div>
  );
}
