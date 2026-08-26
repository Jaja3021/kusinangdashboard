"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Key, Pencil, ShieldCheck, ShieldOff, Trash2 } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { BranchBadge } from "@/components/ui/Badge";
import EditUserModal from "./EditUserModal";
import { ALL_PAGE_PATHS } from "@/lib/auth/page-access";
import type { UserAccount } from "@/lib/auth/user-store";

function PagesProgress({ count }: { count: number }) {
  const total = ALL_PAGE_PATHS.length;
  const pct = total === 0 ? 0 : Math.round((count / total) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-gray-100">
        <div className="h-full rounded-full bg-gold-500" style={{ width: `${pct}%` }} />
      </div>
      <span className="whitespace-nowrap text-xs text-gray-500">{count}/{total}</span>
    </div>
  );
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
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="border-b border-gray-100 px-5 py-4">
        <h2 className="font-display text-base font-bold text-brand-900">Staff Accounts</h2>
        <p className="mt-0.5 text-xs text-gray-500">
          {users.length} users · {activeCount} active
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              {["User", "Role", "Branches", "Pages", "Status", "Actions"].map((h) => (
                <th key={h} className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const initial = user.name.trim().charAt(0).toUpperCase() || "?";
              return (
                <tr key={user.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-slate-700 text-xs font-semibold text-white">
                        {initial}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate font-medium text-brand-900">{user.name}</div>
                        <div className="truncate text-xs text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-slate-700">
                    <div className="flex items-center gap-1.5">
                      <span>{user.role}</span>
                      {user.canCloseDates && (
                        <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                          Admin
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex flex-wrap gap-1">
                      {user.branches.length > 0 ? (
                        user.branches.map((b) => <BranchBadge key={b} branch={b} />)
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <PagesProgress count={user.pageAccess.length} />
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusPill status={user.status} />
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1">
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
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

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
                className="flex-1 rounded-lg bg-gold-500 py-2.5 text-sm font-semibold text-brand-950 transition-colors hover:bg-gold-600"
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
