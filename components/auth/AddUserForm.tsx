"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Loader2, UserPlus } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { BRANCH_OPTIONS } from "@/lib/mt/branches";
import type { UserAccount } from "@/lib/auth/user-store";

const ROLES: UserAccount["role"][] = [
  "Owner",
  "Branch Manager",
  "Event Coordinator",
  "Finance Officer",
  "Staff",
];

function generatePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
  let out = "";
  for (let i = 0; i < 12; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export default function AddUserForm() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserAccount["role"]>("Staff");
  const [branch, setBranch] = useState(BRANCH_OPTIONS[0]);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  function reset() {
    setName("");
    setEmail("");
    setRole("Staff");
    setBranch(BRANCH_OPTIONS[0]);
    setPassword("");
    setError(null);
    setCreated(null);
    setCopied(false);
  }

  function close() {
    setIsOpen(false);
    reset();
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, role, branch, password }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.error ?? "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }

      setCreated({ email, password });
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function copyCredentials() {
    if (!created) return;
    await navigator.clipboard.writeText(`Email: ${created.email}\nPassword: ${created.password}`);
    setCopied(true);
  }

  const inputClass =
    "w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700 placeholder-gray-400 outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-500/20";
  const labelClass = "mb-1.5 block text-sm font-medium text-gray-700";

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg bg-gold-500 px-4 py-2.5 text-sm font-semibold text-brand-950 transition-colors hover:bg-gold-600"
      >
        <UserPlus size={15} />
        Add User
      </button>

      <Modal isOpen={isOpen} onClose={close} title={created ? "User Created" : "Add User"} size="sm">
        {created ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Share these with {created.email} — the password won&apos;t be shown again.
            </p>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-gray-500">Email</span>
                <span className="font-medium text-brand-900">{created.email}</span>
              </div>
              <div className="mt-1.5 flex justify-between gap-3">
                <span className="text-gray-500">Password</span>
                <span className="font-mono font-medium text-brand-900">{created.password}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={copyCredentials}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-200 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
              >
                {copied ? <Check size={15} /> : <Copy size={15} />}
                {copied ? "Copied" : "Copy"}
              </button>
              <button
                type="button"
                onClick={close}
                className="flex-1 rounded-lg bg-gold-500 py-2.5 text-sm font-semibold text-brand-950 transition-colors hover:bg-gold-600"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className={labelClass}>Name</label>
              <input id="name" required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label htmlFor="new-email" className={labelClass}>Email</label>
              <input id="new-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="role" className={labelClass}>Role</label>
                <select id="role" value={role} onChange={(e) => setRole(e.target.value as UserAccount["role"])} className={inputClass}>
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="branch" className={labelClass}>Branch</label>
                <select id="branch" value={branch} onChange={(e) => setBranch(e.target.value)} className={inputClass}>
                  {BRANCH_OPTIONS.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="new-password" className="text-sm font-medium text-gray-700">Password</label>
                <button
                  type="button"
                  onClick={() => setPassword(generatePassword())}
                  className="text-xs font-semibold text-gold-600 hover:text-gold-700"
                >
                  Generate
                </button>
              </div>
              <input
                id="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className={inputClass}
              />
            </div>

            {error && <p className="text-sm font-medium text-red-500">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-gold-500 py-2.5 text-sm font-semibold text-brand-950 transition-colors hover:bg-gold-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting && <Loader2 size={15} className="animate-spin" />}
              Create Account
            </button>
          </form>
        )}
      </Modal>
    </>
  );
}
