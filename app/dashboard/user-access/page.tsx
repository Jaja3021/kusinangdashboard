import PageHeader from "@/components/ui/PageHeader";
import type { BadgeTone } from "@/components/ui/Badge";
import AddUserForm from "@/components/auth/AddUserForm";
import UserAccessCard from "@/components/auth/UserAccessCard";
import StaffAccountsTable from "@/components/auth/StaffAccountsTable";
import BranchManagementCard from "@/components/auth/BranchManagementCard";
import AvailablePagesCard from "@/components/auth/AvailablePagesCard";
import { getAllUsers, UserAccount } from "@/lib/auth/user-store";

const roleTone: Record<UserAccount["role"], BadgeTone> = {
  Owner: "gold",
  Developer: "blue",
  Admin: "amber",
  "Branch Manager": "amber",
  "Sales Staff": "slate",
  "Kitchen Staff": "slate",
  "Operations Staff": "slate",
  "Finance Staff": "slate",
  "Tech Team": "blue",
};

export default async function UserAccessPage() {
  const userAccounts = await getAllUsers();

  const owners = userAccounts.filter((u) => u.role === "Owner");
  const developers = userAccounts.filter((u) => u.role === "Developer");
  const everyoneElse = userAccounts.filter((u) => u.role !== "Owner" && u.role !== "Developer");

  return (
    <div className="space-y-6">
      <PageHeader title="User Access" subtitle="Who can log in, and what they can see.">
        <AddUserForm />
      </PageHeader>

      {owners.length > 0 && (
        <div className="space-y-2">
          {owners.map((u) => (
            <UserAccessCard key={u.id} user={u} roleTone={roleTone[u.role]} highlight />
          ))}
        </div>
      )}

      {developers.length > 0 && (
        <div>
          <div className="mb-2 text-xs font-bold uppercase tracking-widest text-gray-400">Developer Access</div>
          <div className="space-y-2">
            {developers.map((u) => (
              <UserAccessCard key={u.id} user={u} roleTone={roleTone[u.role]} />
            ))}
          </div>
        </div>
      )}

      <StaffAccountsTable users={everyoneElse} />
      <BranchManagementCard users={userAccounts} />
      <AvailablePagesCard />
    </div>
  );
}
