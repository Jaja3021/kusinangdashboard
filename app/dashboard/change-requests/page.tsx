import PageHeader from "@/components/ui/PageHeader";
import ChangeRequestsClient from "@/components/dashboard/ChangeRequestsClient";
import { getChangeRequests } from "@/lib/change-requests/data";
import { getCurrentUser, hasFullAccess } from "@/lib/auth/current-user";
import { can } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

export default async function ChangeRequestsPage() {
  const [user, requests] = await Promise.all([getCurrentUser(), getChangeRequests()]);

  return (
    <div>
      <PageHeader
        title="Change Requests"
        subtitle="Booking changes requested by customers from the Meal Builder. Only an approved request updates the official booking."
      />
      <ChangeRequestsClient
        requests={requests}
        canApprove={can(user?.role, "approve:change-requests")}
        canPropose={can(user?.role, "manage:bookings")}
        defaultBranch={
          !user || hasFullAccess(user.role) || user.branches.length !== 1 ? null : user.branches[0]
        }
      />
    </div>
  );
}
