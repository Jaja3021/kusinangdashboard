import { PAGE_ACCESS_GROUPS } from "@/lib/auth/page-access";

export default function AvailablePagesCard() {
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-5 py-4">
      <h2 className="font-display text-base font-bold text-brand-900">Available Pages</h2>
      <p className="mt-0.5 text-xs text-gray-500">All pages that can be assigned to staff</p>

      <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {PAGE_ACCESS_GROUPS.map((group) => (
          <div key={group.label}>
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">{group.label}</div>
            <ul className="mt-2 space-y-1">
              {group.paths.map(({ path, label }) => (
                <li key={path} className="flex items-center gap-2 text-sm text-slate-700">
                  <span className="h-1 w-1 flex-shrink-0 rounded-full bg-gold-500" />
                  {label}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <p className="mt-4 border-t border-gray-100 pt-3 text-xs text-gray-400">
        User Access is always owner-only and cannot be assigned to staff.
      </p>
    </div>
  );
}
