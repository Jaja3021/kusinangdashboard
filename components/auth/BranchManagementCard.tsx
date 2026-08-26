import { BRANCHES } from "@/lib/mt/branches";
import AddBranchButton from "./AddBranchButton";
import type { UserAccount } from "@/lib/auth/user-store";

export default function BranchManagementCard({ users }: { users: UserAccount[] }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
        <div>
          <h2 className="font-display text-base font-bold text-brand-900">Branch Management</h2>
          <p className="mt-0.5 text-xs text-gray-500">{BRANCHES.length} branches · {BRANCHES.length} active</p>
        </div>
        <AddBranchButton />
      </div>

      <div>
        {BRANCHES.map((branch) => {
          const assigned = users.filter((u) => u.branches.includes(branch.name)).length;
          return (
            <div
              key={branch.id}
              className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-3 last:border-0"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${branch.dot}`} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-brand-900">{branch.name}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${branch.badge}`}>
                      {branch.colorName}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">{assigned} staff members assigned</div>
                </div>
              </div>
              <div className="flex flex-shrink-0 items-center gap-3">
                <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                  Active
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
