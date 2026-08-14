import PageHeader from "@/components/ui/PageHeader";
import PaymentsClient from "@/components/dashboard/PaymentsClient";
import { getPaymentQueue } from "@/lib/payments/data";

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  // Excludes 'Pending Upload' rows — those have no screenshot yet and
  // aren't actionable. Tabs (Payments / Pending Review / Lost & Cancelled)
  // are filtered client-side from this one fetch.
  const payments = await getPaymentQueue();

  return (
    <div>
      <PageHeader title="Payments" subtitle="Customer payments submitted from the herbies storefront." />
      <PaymentsClient payments={payments} />
    </div>
  );
}
