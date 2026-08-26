"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { BranchBadge } from "@/components/ui/Badge";
import { useBranch } from "@/components/providers/BranchProvider";
import { BRANCH_COLOR_NAMES, stylesFor, type BranchColorName } from "@/lib/mt/branch-colors";

export default function AddBranchModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { addBranch } = useBranch();
  const [name, setName] = useState("");
  const [color, setColor] = useState<BranchColorName>(BRANCH_COLOR_NAMES[0]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Branch name is required.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), color }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.error ?? "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }

      const created = data.branch as { id: string; name: string; color: BranchColorName };
      addBranch({ id: created.id, name: created.name, colorName: created.color, ...stylesFor(created.color) });
      router.refresh();
      onClose();
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  const previewStyle = stylesFor(color);

  return (
    <Modal isOpen onClose={onClose} title="Add New Branch" size="sm">
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="branch-name" className="mb-1.5 block text-sm font-medium text-gray-700">
            Branch Name <span className="text-red-500">*</span>
          </label>
          <input
            id="branch-name"
            required
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Laguna"
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700 placeholder-gray-400 outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-500/20"
          />
        </div>

        <div>
          <div className="mb-1.5 text-sm font-medium text-gray-700">Color</div>
          <div className="flex flex-wrap gap-2">
            {BRANCH_COLOR_NAMES.map((c) => {
              const styles = stylesFor(c);
              const selected = c === color;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium capitalize ring-1 ring-inset transition-colors ${styles.badge} ${
                    selected ? "ring-2 ring-offset-1 ring-gold-500" : "ring-transparent"
                  }`}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="mb-1.5 text-sm font-medium text-gray-700">Preview</div>
          <div className="rounded-lg bg-gray-50 p-3">
            <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${previewStyle.badge}`}>
              {name.trim() || "Branch Name"}
            </span>
          </div>
        </div>

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
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gold-500 py-2.5 text-sm font-semibold text-brand-950 transition-colors hover:bg-gold-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting && <Loader2 size={15} className="animate-spin" />}
            Add Branch
          </button>
        </div>
      </form>
    </Modal>
  );
}
