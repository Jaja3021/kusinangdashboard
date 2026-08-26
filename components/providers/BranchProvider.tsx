"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  ALL_BRANCHES,
  branchesInScope,
  getBranchByName,
  getBranchOptions,
  setBranches,
  type Branch,
} from "@/lib/mt/branches";

const STORAGE_KEY = "kp_selected_branch";

type BranchContextValue = {
  branches: Branch[];
  options: string[];
  selectedBranch: string;
  setSelectedBranch: (branch: string) => void;
  /** Branches the current selection covers — drives which chart series render. */
  scope: Branch[];
  getBranchByName: (name: string) => Branch | undefined;
  /** Appends a just-created branch (Add Branch modal) so it shows up
   * immediately, without waiting for the next server round-trip. */
  addBranch: (branch: Branch) => void;
};

const BranchContext = createContext<BranchContextValue | null>(null);

export function BranchProvider({
  children,
  initialBranches,
}: {
  children: ReactNode;
  initialBranches: Branch[];
}) {
  const [branches, setBranchesState] = useState<Branch[]>(initialBranches);

  // Keeps lib/mt/branches.ts's shared `BRANCHES` binding — what every plain
  // `import { BRANCHES }` consumer across the app reads — in sync with this
  // provider's state. Called during render (not an effect) so it lands
  // before any child component's own first render reads it.
  setBranches(branches.map((b) => ({ id: b.id, name: b.name, colorName: b.colorName })));

  // A fresh server payload (e.g. after router.refresh() post Add Branch)
  // replaces local state once React reconciles this provider with new props.
  useEffect(() => {
    setBranchesState(initialBranches);
  }, [initialBranches]);

  const addBranch = useCallback((branch: Branch) => {
    setBranchesState((prev) => [...prev, branch]);
  }, []);

  // Always start on the default so the server and the first client render
  // agree; the stored value is applied after mount.
  const [selectedBranch, setBranch] = useState<string>(ALL_BRANCHES);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && getBranchOptions().includes(stored)) setBranch(stored);
    } catch {
      // Private mode or blocked storage — the default is fine.
    }
  }, []);

  const setSelectedBranch = useCallback((branch: string) => {
    setBranch(branch);
    try {
      localStorage.setItem(STORAGE_KEY, branch);
    } catch {
      // Non-fatal: the selection just won't survive a reload.
    }
  }, []);

  const value = useMemo<BranchContextValue>(
    () => ({
      branches,
      options: [ALL_BRANCHES, ...branches.map((b) => b.name)],
      selectedBranch,
      setSelectedBranch,
      scope: branchesInScope(selectedBranch),
      getBranchByName,
      addBranch,
    }),
    [branches, selectedBranch, setSelectedBranch, addBranch],
  );

  return <BranchContext.Provider value={value}>{children}</BranchContext.Provider>;
}

export function useBranch(): BranchContextValue {
  const ctx = useContext(BranchContext);
  if (!ctx) throw new Error("useBranch must be used inside <BranchProvider>");
  return ctx;
}
