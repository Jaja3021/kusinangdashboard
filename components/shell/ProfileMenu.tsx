"use client";

import { useState } from "react";
import { ChevronDown, LogOut, User } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { useAuth } from "@/components/providers/AuthProvider";
import { useBranch } from "@/components/providers/BranchProvider";
import { useDismissable } from "./useDismissable";

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

export default function ProfileMenu() {
  const { user, logout } = useAuth();
  const { selectedBranch } = useBranch();
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const ref = useDismissable<HTMLDivElement>(open, () => setOpen(false));

  const CURRENT_USER = {
    name: user.name,
    role: user.role,
    email: user.email,
    avatar: initialsOf(user.name),
  };

  async function handleSignOut() {
    setSigningOut(true);
    await logout();
  }

  return (
    <>
      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="menu"
          aria-expanded={open}
          className="flex items-center gap-2 rounded-lg border border-gray-200 py-1 pl-1 pr-2 transition-colors hover:bg-gray-50"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gold-500 text-xs font-bold text-white">
            {CURRENT_USER.avatar}
          </div>
          <div className="hidden text-left sm:block">
            <div className="text-sm font-semibold leading-tight text-gray-800">
              {CURRENT_USER.name}
            </div>
            <div className="text-xs text-gray-400">{CURRENT_USER.role}</div>
          </div>
          <ChevronDown
            size={14}
            className={`text-gray-400 transition-transform duration-150 ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>

        {open && (
          <div className="absolute right-0 top-full z-30 mt-1 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
            <div className="border-b border-gray-100 px-3 py-2.5">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gold-500 text-xs font-bold text-white">
                  {CURRENT_USER.avatar}
                </div>
                <div>
                  <div className="text-sm font-semibold text-brand-900">
                    {CURRENT_USER.name}
                  </div>
                  <div className="text-xs text-gray-400">{CURRENT_USER.role}</div>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setProfileOpen(true);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-600 transition-colors hover:bg-gray-50"
            >
              <User size={14} /> Profile
            </button>
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-500 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <LogOut size={14} /> {signingOut ? "Signing Out…" : "Sign Out"}
            </button>
          </div>
        )}
      </div>

      <Modal isOpen={profileOpen} onClose={() => setProfileOpen(false)} title="My Profile">
        <div className="space-y-4">
          <div className="flex items-center gap-4 border-b border-gray-100 pb-4">
            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-gold-500 text-xl font-bold text-white">
              {CURRENT_USER.avatar}
            </div>
            <div>
              <div className="font-display text-lg font-bold text-brand-900">
                {CURRENT_USER.name}
              </div>
              <div className="text-sm text-gray-500">{CURRENT_USER.role}</div>
              <div className="mt-0.5 text-xs text-gray-400">{CURRENT_USER.email}</div>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            {[
              ["Name", CURRENT_USER.name],
              ["Role", CURRENT_USER.role],
              ["Email", CURRENT_USER.email],
              ["Branch", selectedBranch],
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex justify-between border-b border-gray-50 py-2"
              >
                <span className="text-gray-500">{label}</span>
                <span className="font-medium text-brand-900">{value}</span>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
            This is a demo dashboard running on sample data — account details above are
            read-only.
          </div>
        </div>
      </Modal>
    </>
  );
}
