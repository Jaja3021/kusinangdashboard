import PageHeader from "@/components/ui/PageHeader";
import PaymentsClient from "@/components/dashboard/PaymentsClient";
import { getPaymentQueue } from "@/lib/payments/data";
import { buildTodaysMockPayments } from "@/lib/payments/mock-payments";
import { buildTodaysMockOrders } from "@/lib/orders/mock-celebrity-orders";
import { getPackagesData } from "@/lib/menu/data";

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  // Excludes 'Pending Upload' rows — those have no screenshot yet and
  // aren't actionable. Tabs (Payments / Pending Review / Lost & Cancelled)
  // are filtered client-side from this one fetch.
  const [payments, packages] = await Promise.all([getPaymentQueue(), getPackagesData()]);
  // Demo payments for today's walk-in mock orders (same clients the
  // Overview page's "Today's Orders" widget shows) — see
  // lib/payments/mock-payments.ts. Nothing here touches Supabase.
  const mockPayments = buildTodaysMockPayments(buildTodaysMockOrders(packages));

  return (
    <div>
      <PageHeader title="Payments" subtitle="Customer payments submitted from the herbies storefront." />
      <PaymentsClient payments={[...mockPayments, ...payments]} />
    </div>
  );
}
