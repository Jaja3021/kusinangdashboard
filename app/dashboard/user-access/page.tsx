import { ShieldCheck, UserPlus, ShieldAlert } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import Badge, { BadgeTone } from "@/components/ui/Badge";
import DataTable, { Column } from "@/components/ui/DataTable";
import AddUserForm from "@/components/auth/AddUserForm";
import { getAllUsers, UserAccount } from "@/lib/auth/user-store";

const statusTone: Record<UserAccount["status"], BadgeTone> = {
  Active: "green",
  Invited: "blue",
  Suspended: "red",
};

const roleTone: Record<UserAccount["role"], BadgeTone> = {
  Owner: "gold",
  "Branch Manager": "amber",
  "Event Coordinator": "blue",
  "Finance Officer": "slate",
  Staff: "slate",
};

const columns: Column<UserAccount>[] = [
  { key: "name", header: "Name", render: (r) => <span className="font-medium text-brand-900">{r.name}</span> },
  { key: "email", header: "Email" },
  { key: "role", header: "Role", render: (r) => <Badge label={r.role} tone={roleTone[r.role]} /> },
  { key: "branch", header: "Branch" },
  { key: "lastActive", header: "Last Active" },
  { key: "status", header: "Status", render: (r) => <Badge label={r.status} tone={statusTone[r.status]} /> },
];

export default async function UserAccessPage() {
  const userAccounts = await getAllUsers();
  const active = userAccounts.filter((u) => u.status === "Active").length;
  const invited = userAccounts.filter((u) => u.status === "Invited").length;
  const suspended = userAccounts.filter((u) => u.status === "Suspended").length;

  return (
    <div>
      <PageHeader title="User Access" subtitle="Who can log in, and what they can see.">
        <AddUserForm />
      </PageHeader>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Active Accounts" value={String(active)} icon={<ShieldCheck size={18} className="text-gold-600" />} />
        <StatCard label="Pending Invites" value={String(invited)} icon={<UserPlus size={18} className="text-gold-600" />} />
        <StatCard label="Suspended" value={String(suspended)} icon={<ShieldAlert size={18} className="text-gold-600" />} footer={<span className="text-xs font-medium text-red-500">{"Access revoked"}</span>} />
      </div>
      <div className="mt-6">
        <DataTable columns={columns} rows={userAccounts} />
      </div>
    </div>
  );
}
