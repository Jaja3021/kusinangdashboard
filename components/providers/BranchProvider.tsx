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
  BRANCHES,
  BRANCH_OPTIONS,
  branchesInScope,
  getBranchByName,
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
};

const BranchContext = createContext<BranchContextValue | null>(null);

export function BranchProvider({ children }: { children: ReactNode }) {
  // Always start on the default so the server and the first client render
  // agree; the stored value is applied after mount.
  const [selectedBranch, setBranch] = useState<string>(ALL_BRANCHES);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && BRANCH_OPTIONS.includes(stored)) setBranch(stored);
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
      branches: BRANCHES,
      options: BRANCH_OPTIONS,
      selectedBranch,
      setSelectedBranch,
      scope: branchesInScope(selectedBranch),
      getBranchByName,
    }),
    [selectedBranch, setSelectedBranch],
  );

  return <BranchContext.Provider value={value}>{children}</BranchContext.Provider>;
}

export function useBranch(): BranchContextValue {
  const ctx = useContext(BranchContext);
  if (!ctx) throw new Error("useBranch must be used inside <BranchProvider>");
  return ctx;
}
