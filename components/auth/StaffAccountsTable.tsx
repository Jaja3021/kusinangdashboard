"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Key, Pencil, ShieldCheck, ShieldOff, Trash2 } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { BranchBadge } from "@/components/ui/Badge";
import EditUserModal from "./EditUserModal";
import { ALL_PAGE_PATHS } from "@/lib/auth/page-access";
import { getBranchNames } from "@/lib/mt/branches";
import type { UserAccount } from "@/lib/auth/user-store";

/** Same "N branches · M pages" shorthand as UserAccessCard's accessSummary,
 * so Staff Accounts reads consistently with the Owner/Developer Access
 * cards above it — full branch/page detail still lives in Edit. */
function accessSummary(user: UserAccount): string {
  const branchLabel =
    user.branches.length === 0
      ? "no branches"
      : user.branches.length >= getBranchNames().length
        ? "All branches"
        : user.branches.length === 1
          ? user.branches[0]
          : `${user.branches.length} branches`;

  const pageLabel =
    user.pageAccess.length >= ALL_PAGE_PATHS.length
      ? "all pages"
      : `${user.pageAccess.length}/${ALL_PAGE_PATHS.length} pages`;

  return `${branchLabel} · ${pageLabel}`;
}

function StatusPill({ status }: { status: UserAccount["status"] }) {
  if (status === "Suspended") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-1 text-xs font-medium text-red-700">
        <ShieldOff size={12} /> Suspended
      </span>
    );
  }
  if (status === "Invited") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-1 text-xs font-medium text-sky-700">
        <ShieldCheck size={12} /> Invited
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
      <ShieldCheck size={12} /> Active
    </span>
  );
}

export default function StaffAccountsTable({ users }: { users: UserAccount[] }) {
  const router = useRouter();
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [resetResult, setResetResult] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const activeCount = users.filter((u) => u.status === "Active").length;

  async function resetPassword(user: UserAccount) {
    if (!window.confirm(`Generate a new password for ${user.name}? Their current password stops working immediately.`)) {
      return;
    }
    setBusyId(user.id);
    try {
      const res = await fetch(`/api/auth/users/${user.id}/reset-password`, { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        alert(data?.error ?? "Failed to reset password.");
        return;
      }
      setCopied(false);
      setResetResult({ email: user.email, password: data.password });
    } finally {
      setBusyId(null);
    }
  }

  async function deleteAccount(user: UserAccount) {
    if (!window.confirm(`Delete ${user.name}'s account? This cannot be undone.`)) return;

    setBusyId(user.id);
    try {
      const res = await fetch(`/api/auth/users/${user.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        alert(data?.error ?? "Failed to delete account.");
        return;
      }
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function copyResetPassword() {
    if (!resetResult) return;
    await navigator.clipboard.writeText(`Email: ${resetResult.email}\nPassword: ${resetResult.password}`);
    setCopied(true);
  }

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <div className="text-xs font-bold uppercase tracking-widest text-gray-400">Staff Accounts</div>
        <p className="text-xs text-gray-400">
          {users.length} users · {activeCount} active
        </p>
      </div>

      {users.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-200 p-4 text-center text-sm text-gray-400">
          No staff accounts yet.
        </p>
      ) : (
        <div className="space-y-2">
          {users.map((user) => {
            const initial = user.name.trim().charAt(0).toUpperCase() || "?";
            return (
              <div key={user.id} className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-slate-700 text-sm font-semibold text-white">
                  {initial}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-medium text-brand-900">{user.name}</span>
                    <span className="text-xs text-slate-600">{user.role}</span>
                    {user.canCloseDates && (
                      <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                        Admin
                      </span>
                    )}
                    <StatusPill status={user.status} />
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
                    <span className="truncate">{user.email} · {accessSummary(user)}</span>
                    {user.branches.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {user.branches.map((b) => (
                          <BranchBadge key={b} branch={b} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-shrink-0 items-center gap-1">
                  <button
                    type="button"
                    title="Reset password"
                    disabled={busyId === user.id}
                    onClick={() => resetPassword(user)}
                    className="rounded p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:opacity-40"
                  >
                    <Key size={15} />
                  </button>
                  <button
                    type="button"
                    title="Edit"
                    onClick={() => setEditingUser(user)}
                    className="rounded p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    type="button"
                    title="Delete"
                    disabled={busyId === user.id}
                    onClick={() => deleteAccount(user)}
                    className="rounded p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editingUser && <EditUserModal user={editingUser} onClose={() => setEditingUser(null)} />}

      <Modal isOpen={!!resetResult} onClose={() => setResetResult(null)} title="Password Reset" size="sm">
        {resetResult && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Share this with {resetResult.email} — the password won&apos;t be shown again.
            </p>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-gray-500">Email</span>
                <span className="font-medium text-brand-900">{resetResult.email}</span>
              </div>
              <div className="mt-1.5 flex justify-between gap-3">
                <span className="text-gray-500">Password</span>
                <span className="font-mono font-medium text-brand-900">{resetResult.password}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={copyResetPassword}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-200 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
              >
                {copied ? <Check size={15} /> : <Copy size={15} />}
                {copied ? "Copied" : "Copy"}
              </button>
              <button
                type="button"
                onClick={() => setResetResult(null)}
                className="flex-1 rounded-lg bg-gold-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gold-600"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
