"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { MOBILE_MORE, MOBILE_PRIMARY, isNavPathActive } from "./nav";
import { useAuth } from "@/components/providers/AuthProvider";
import { hasPageAccess } from "@/lib/auth/page-access";

export default function MobileNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);

  const isActive = (path: string) => isNavPathActive(pathname, path);

  const visiblePrimary = MOBILE_PRIMARY.filter((item) => hasPageAccess(user, item.path));
  const visibleMore = MOBILE_MORE.filter((item) => hasPageAccess(user, item.path));
  const moreIsActive = visibleMore.some((item) => isActive(item.path));

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
        {visiblePrimary.map(({ label, path, icon: Icon }) => (
          <Link
            key={path}
            href={path}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
              isActive(path) ? "text-gold-600" : "text-gray-400"
            }`}
          >
            <Icon size={19} />
            <span className="truncate">{label}</span>
          </Link>
        ))}

        <button
          onClick={() => setMoreOpen(true)}
          className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
            moreIsActive ? "text-gold-600" : "text-gray-400"
          }`}
        >
          <MoreHorizontal size={19} />
          <span>More</span>
        </button>
      </nav>

      <Modal isOpen={moreOpen} onClose={() => setMoreOpen(false)} title="More" size="md">
        <div className="grid grid-cols-3 gap-2">
          {visibleMore.map(({ label, path, icon: Icon }) => (
            <Link
              key={path}
              href={path}
              onClick={() => setMoreOpen(false)}
              className={`flex flex-col items-center gap-1.5 rounded-lg border p-3 text-center text-[11px] font-medium transition-colors ${
                isActive(path)
                  ? "border-gold-500/40 bg-gold-500/10 text-gold-600"
                  : "border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              <Icon size={18} />
              <span className="leading-tight">{label}</span>
            </Link>
          ))}
        </div>
      </Modal>
    </>
  );
}
