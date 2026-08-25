import OwnerFinancialsClient from "@/components/dashboard/OwnerFinancialsClient";
import { financialPeriods, compensationEntries, ownerDistributions, changeHistory } from "@/lib/owner-financials/mock";

export default function OwnerFinancialsPage() {
  return (
    <OwnerFinancialsClient
      periods={financialPeriods}
      compensationEntries={compensationEntries}
      ownerDistributions={ownerDistributions}
      changeHistory={changeHistory}
    />
  );
}
