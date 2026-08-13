import { getBranchByName } from "@/lib/mt/branches";

const TONE_STYLES: Record<string, string> = {
  green: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  amber: "bg-amber-50 text-amber-700 ring-amber-600/20",
  red: "bg-red-50 text-red-700 ring-red-600/20",
  blue: "bg-sky-50 text-sky-700 ring-sky-600/20",
  gold: "bg-gold-500/10 text-gold-600 ring-gold-500/30",
  slate: "bg-slate-100 text-slate-600 ring-slate-500/20",
};

export type BadgeTone = keyof typeof TONE_STYLES;

export default function Badge({ label, tone = "slate" }: { label: string; tone?: BadgeTone }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${TONE_STYLES[tone]}`}
    >
      {label}
    </span>
  );
}

/** Branch chip, coloured from the branch registry so it matches the charts. */
export function BranchBadge({ branch }: { branch?: string }) {
  const match = branch ? getBranchByName(branch) : undefined;
  const style = match?.badge ?? "bg-gray-100 text-gray-600";

  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${style}`}
    >
      {branch || "—"}
    </span>
  );
}

// The deployed dashboard's status vocabulary. Three of these render as bare
// coloured text rather than chips — that difference is intentional there, so
// it is preserved here.
const STATUS_STYLES: Record<string, string> = {
  Confirmed: "text-emerald-700",
  Pending: "text-blue-600",
  Completed: "text-gray-500",
  "Pending Confirmation": "bg-gold-500/10 text-gold-600",
  Active: "bg-emerald-100 text-emerald-700",
  Preparing: "bg-blue-100 text-blue-700",
  Cooking: "bg-orange-100 text-orange-700",
  "Ready for Delivery": "bg-purple-100 text-purple-700",
  "Out for Delivery": "bg-purple-100 text-purple-700",
  "Setup Ongoing": "bg-yellow-100 text-yellow-700",
  "For Preparation": "bg-indigo-100 text-indigo-700",
  Delivered: "bg-emerald-100 text-emerald-700",
  Partial: "bg-yellow-100 text-yellow-700",
  New: "bg-blue-100 text-blue-700",
  "Fully Paid": "bg-emerald-100 text-emerald-700",
  "New Inquiry": "bg-blue-100 text-blue-700",
  "Partial Payment": "bg-yellow-100 text-yellow-700",
  "Full Payment": "bg-emerald-100 text-emerald-700",
  Complimentary: "bg-purple-100 text-purple-700",
  Cancelled: "bg-red-100 text-red-700",
  Other: "bg-gray-100 text-gray-600",
};

const BARE = new Set(["Confirmed", "Pending", "Completed"]);

export function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? "bg-gray-100 text-gray-600";
  const shape = BARE.has(status) ? "" : "rounded px-2 py-0.5";

  return (
    <span className={`inline-flex items-center text-xs font-medium ${shape} ${style}`}>
      {status}
    </span>
  );
}
