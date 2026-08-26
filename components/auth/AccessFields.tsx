"use client";

import { getBranchNames } from "@/lib/mt/branches";
import { PAGE_ACCESS_GROUPS } from "@/lib/auth/page-access";

const checklistPanelClass = "rounded-lg border border-gray-200 bg-gray-50/60";
const checklistRowClass = "flex items-center gap-2 px-3 py-2 text-sm text-gray-700";

/** The close-dates flag, branch checklist, and page-access checklist shared
 * by the Add User form and the Edit User modal — kept in one place so the
 * two never drift (e.g. what "ALL BRANCHES" means, which pages are
 * assignable). */
export default function AccessFields({
  canCloseDates,
  onCanCloseDatesChange,
  branches,
  onBranchesChange,
  pageAccess,
  onPageAccessChange,
}: {
  canCloseDates: boolean;
  onCanCloseDatesChange: (value: boolean) => void;
  branches: string[];
  onBranchesChange: (value: string[]) => void;
  pageAccess: string[];
  onPageAccessChange: (value: string[]) => void;
}) {
  const branchNames = getBranchNames();
  const allBranchesSelected = branches.length === branchNames.length;

  function toggleAllBranches() {
    onBranchesChange(allBranchesSelected ? [] : [...branchNames]);
  }

  function toggleBranch(name: string) {
    onBranchesChange(branches.includes(name) ? branches.filter((b) => b !== name) : [...branches, name]);
  }

  function toggleGroup(paths: string[]) {
    const allSelected = paths.every((p) => pageAccess.includes(p));
    onPageAccessChange(
      allSelected ? pageAccess.filter((p) => !paths.includes(p)) : [...new Set([...pageAccess, ...paths])],
    );
  }

  function togglePage(path: string) {
    onPageAccessChange(pageAccess.includes(path) ? pageAccess.filter((p) => p !== path) : [...pageAccess, path]);
  }

  return (
    <>
      <label className="flex items-start gap-3 rounded-lg border border-gray-200 p-3">
        <input
          type="checkbox"
          checked={canCloseDates}
          onChange={(e) => onCanCloseDatesChange(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-gold-600 focus:ring-gold-500/40"
        />
        <span>
          <span className="block text-sm font-medium text-gray-700">Admin — can close dates</span>
          <span className="mt-0.5 block text-xs text-gray-500">
            May mark a date fully booked, which stops the Meal Builder offering it. Everyone else sees
            closed dates but cannot change them.
          </span>
        </span>
      </label>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Branch Access</span>
          <span className="text-xs text-gray-400">{branches.length}/{branchNames.length} selected</span>
        </div>
        <div className={checklistPanelClass}>
          <label className={`${checklistRowClass} border-b border-gray-200 font-medium`}>
            <input
              type="checkbox"
              checked={allBranchesSelected}
              onChange={toggleAllBranches}
              className="h-4 w-4 rounded border-gray-300 text-gold-600 focus:ring-gold-500/40"
            />
            ALL BRANCHES
          </label>
          {branchNames.map((name) => (
            <label key={name} className={checklistRowClass}>
              <input
                type="checkbox"
                checked={branches.includes(name)}
                onChange={() => toggleBranch(name)}
                className="h-4 w-4 rounded border-gray-300 text-gold-600 focus:ring-gold-500/40"
              />
              {name}
            </label>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Page Access</span>
          <span className="text-xs text-gray-400">{pageAccess.length} pages selected</span>
        </div>
        <div className="space-y-2">
          {PAGE_ACCESS_GROUPS.map((group) => {
            const paths = group.paths.map((p) => p.path);
            const groupSelected = paths.filter((p) => pageAccess.includes(p)).length;
            return (
              <div key={group.label} className={checklistPanelClass}>
                <label className={`${checklistRowClass} justify-between border-b border-gray-200 font-medium`}>
                  <span className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={groupSelected === paths.length}
                      onChange={() => toggleGroup(paths)}
                      className="h-4 w-4 rounded border-gray-300 text-gold-600 focus:ring-gold-500/40"
                    />
                    {group.label}
                  </span>
                  <span className="text-xs font-normal text-gray-400">
                    {groupSelected}/{paths.length}
                  </span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2">
                  {group.paths.map(({ path, label }) => (
                    <label key={path} className={checklistRowClass}>
                      <input
                        type="checkbox"
                        checked={pageAccess.includes(path)}
                        onChange={() => togglePage(path)}
                        className="h-4 w-4 rounded border-gray-300 text-gold-600 focus:ring-gold-500/40"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
