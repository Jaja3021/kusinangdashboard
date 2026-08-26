import Badge, { BadgeTone } from "@/components/ui/Badge";
import { hasFullAccess } from "@/lib/auth/current-user";
import { ALL_PAGE_PATHS } from "@/lib/auth/page-access";
import { getBranchNames } from "@/lib/mt/branches";
import type { UserAccount } from "@/lib/auth/user-store";

function accessSummary(user: UserAccount): string {
  if (hasFullAccess(user.role)) return "Full access · All branches";

  const branchLabel =
    user.branches.length >= getBranchNames().length
      ? "All branches"
      : user.branches.length === 1
        ? user.branches[0]
        : `${user.branches.length} branches`;

  const pageLabel =
    user.pageAccess.length >= ALL_PAGE_PATHS.length
      ? "all pages"
      : `${user.pageAccess.length} pages`;

  return `${branchLabel} · ${pageLabel}`;
}

export default function UserAccessCard({
  user,
  roleTone,
  highlight = false,
}: {
  user: UserAccount;
  roleTone: BadgeTone;
  highlight?: boolean;
}) {
  const initial = user.name.trim().charAt(0).toUpperCase() || "?";

  return (
    <div
      className={`flex items-center gap-3 rounded-lg border p-3 ${
        highlight ? "border-gold-500/30 bg-gold-500/5" : "border-gray-200 bg-white"
      }`}
    >
      <div
        className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
          highlight ? "bg-gold-500 text-brand-950" : "bg-sky-500 text-white"
        }`}
      >
        {initial}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium text-brand-900">{user.name}</span>
          <Badge label={user.role} tone={roleTone} />
        </div>
        <div className="truncate text-xs text-gray-500">
          {user.email} · {accessSummary(user)}
        </div>
      </div>
    </div>
  );
}
