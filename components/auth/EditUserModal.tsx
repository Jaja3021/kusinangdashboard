"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import Modal from "@/components/ui/Modal";
import AccessFields from "./AccessFields";
import { CREATABLE_ROLES, type CreatableRole } from "@/lib/auth/roles";
import { ALL_PAGE_PATHS } from "@/lib/auth/page-access";
import type { UserAccount } from "@/lib/auth/user-store";

export default function EditUserModal({ user, onClose }: { user: UserAccount; onClose: () => void }) {
  const router = useRouter();
  const [name, setName] = useState(user.name);
  const [role, setRole] = useState<CreatableRole>(user.role as CreatableRole);
  const [canCloseDates, setCanCloseDates] = useState(user.canCloseDates);
  const [branches, setBranches] = useState<string[]>(user.branches);
  const [pageAccess, setPageAccess] = useState<string[]>(
    user.pageAccess.filter((p) => ALL_PAGE_PATHS.includes(p)),
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (branches.length === 0) {
      setError("Select at least one branch.");
      return;
    }
    if (pageAccess.length === 0) {
      setError("Select at least one page.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/auth/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, role, branches, pageAccess, canCloseDates }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.error ?? "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }

      router.refresh();
      onClose();
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700 placeholder-gray-400 outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-500/20";
  const labelClass = "mb-1.5 block text-sm font-medium text-gray-700";

  return (
    <Modal isOpen onClose={onClose} title="Edit User" size="md">
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="edit-name" className={labelClass}>Full Name</label>
          <input id="edit-name" required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Email Address</label>
          <input value={user.email} disabled className={`${inputClass} cursor-not-allowed opacity-60`} />
        </div>
        <div>
          <label htmlFor="edit-role" className={labelClass}>Role</label>
          <select
            id="edit-role"
            value={role}
            onChange={(e) => setRole(e.target.value as CreatableRole)}
            className={inputClass}
          >
            {CREATABLE_ROLES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        <AccessFields
          canCloseDates={canCloseDates}
          onCanCloseDatesChange={setCanCloseDates}
          branches={branches}
          onBranchesChange={setBranches}
          pageAccess={pageAccess}
          onPageAccessChange={setPageAccess}
        />

        {error && <p className="text-sm font-medium text-red-500">{error}</p>}

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gold-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gold-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting && <Loader2 size={15} className="animate-spin" />}
            Save Changes
          </button>
        </div>
      </form>
    </Modal>
  );
}
