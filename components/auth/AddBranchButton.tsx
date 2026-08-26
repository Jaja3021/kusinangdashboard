"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import AddBranchModal from "./AddBranchModal";

export default function AddBranchButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg bg-gold-500 px-3 py-2 text-sm font-semibold text-brand-950 transition-colors hover:bg-gold-600"
      >
        <Plus size={14} /> Add Branch
      </button>
      {open && <AddBranchModal onClose={() => setOpen(false)} />}
    </>
  );
}
