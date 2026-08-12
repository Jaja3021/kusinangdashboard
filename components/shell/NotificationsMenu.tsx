"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, TriangleAlert, X } from "lucide-react";
import { useBranch } from "@/components/providers/BranchProvider";
import { buildNotifications } from "@/lib/mt/notifications";
import { opportunities, pendingReceipts } from "@/lib/mt/opportunities";
import { ALL_BRANCHES } from "@/lib/mt/branches";
import { useDismissable } from "./useDismissable";

const SEVERITY_COLOR = {
  danger: "text-red-500",
  warning: "text-amber-500",
  info: "text-blue-500",
} as const;

export default function NotificationsMenu() {
  const router = useRouter();
  const { selectedBranch } = useBranch();
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set());
  const ref = useDismissable<HTMLDivElement>(open, () => setOpen(false));

  const notifications = useMemo(
    () =>
      buildNotifications({ opportunities, pendingReceipts })
        .filter((n) => selectedBranch === ALL_BRANCHES || !n.branch || n.branch === selectedBranch)
        .filter((n) => !dismissed.has(n.key)),
    [selectedBranch, dismissed],
  );

  function dismiss(key: string) {
    setDismissed((prev) => new Set(prev).add(key));
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notifications (${notifications.length} unread)`}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 transition-colors hover:bg-gray-50"
      >
        <Bell size={17} className="text-gray-600" />
        {notifications.length > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-gold-500 text-[10px] font-bold text-white">
            {notifications.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-80 max-w-[calc(100vw-1.5rem)] rounded-xl border border-gray-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <span className="text-sm font-semibold text-brand-900">Notifications</span>
            <span className="text-xs text-gray-400">{notifications.length} unread</span>
          </div>

          <div className="max-h-72 divide-y divide-gray-50 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">All caught up!</p>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.key}
                  className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-gray-50"
                >
                  <button
                    onClick={() => {
                      router.push(n.path);
                      setOpen(false);
                    }}
                    className="flex flex-1 items-start gap-3 text-left"
                  >
                    <TriangleAlert
                      size={14}
                      className={`mt-0.5 flex-shrink-0 ${SEVERITY_COLOR[n.severity]}`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-gray-800">
                        {n.title}
                      </span>
                      <span className="mt-0.5 block text-xs leading-snug text-gray-500">
                        {n.body}
                      </span>
                    </span>
                  </button>
                  <button
                    onClick={() => dismiss(n.key)}
                    title="Dismiss"
                    aria-label={`Dismiss: ${n.title}`}
                    className="flex-shrink-0 rounded p-0.5 text-gray-300 transition-colors hover:bg-gray-100 hover:text-gray-500"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
