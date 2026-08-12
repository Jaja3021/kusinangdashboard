"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { NAV } from "./nav";

const LOGO_IMAGE =
  "https://assets.cdn.filesafe.space/xALi9D5ZQRYrKD8SoD6y/media/6a734833329b76ca7b4b64e0.png";

const EXPANDED_WIDTH = 224;
const COLLAPSED_WIDTH = 64;

/** True in the tablet band, where the sidebar collapses whether you like it or not. */
function useTabletBand(): boolean {
  const [isTablet, setIsTablet] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px) and (max-width: 1023px)");
    setIsTablet(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setIsTablet(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return isTablet;
}

export default function Sidebar() {
  const pathname = usePathname();
  const [manuallyCollapsed, setManuallyCollapsed] = useState(false);
  const isTablet = useTabletBand();
  const collapsed = isTablet || manuallyCollapsed;

  return (
    <div
      className="hidden h-full flex-shrink-0 flex-col bg-brand-900 text-brand-200 transition-all duration-300 md:flex"
      style={{ width: collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH }}
    >
      <div className="flex items-center gap-3 border-b border-brand-800 px-4 py-4">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/10 ring-1 ring-white/20">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={LOGO_IMAGE}
            alt="Kusinang Pamana"
            className="h-full w-full object-cover"
          />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <div className="font-display text-base font-bold leading-tight text-white">
              Kusinang Pamana
            </div>
            <div className="text-xs text-brand-400">Business Dashboard</div>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
        {NAV.map((group, i) => (
          <div key={group.label ?? i}>
            {group.label &&
              (collapsed ? (
                <div className="my-2 border-t border-brand-800" />
              ) : (
                <div className="px-3 pb-1 pt-3 text-[10px] font-bold uppercase tracking-widest text-brand-500">
                  {group.label}
                </div>
              ))}

            {group.items.map(({ label, path, icon: Icon }) => {
              // Overview owns "/dashboard" exactly; everything else prefix-matches.
              const isActive =
                path === "/dashboard" ? pathname === path : pathname.startsWith(path);

              return (
                <Link
                  key={path}
                  href={path}
                  title={collapsed ? label : undefined}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-gold-500 text-brand-950"
                      : "text-brand-200 hover:bg-brand-800 hover:text-white"
                  }`}
                >
                  <Icon size={18} className="flex-shrink-0" />
                  {!collapsed && <span className="truncate">{label}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* In the tablet band the collapse is forced, so the toggle is pointless. */}
      {!isTablet && (
        <div className="border-t border-brand-800 p-3">
          <button
            onClick={() => setManuallyCollapsed((c) => !c)}
            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm text-brand-400 transition-colors hover:bg-brand-800 hover:text-white"
          >
            {manuallyCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            {!manuallyCollapsed && <span>Collapse</span>}
          </button>
        </div>
      )}
    </div>
  );
}
