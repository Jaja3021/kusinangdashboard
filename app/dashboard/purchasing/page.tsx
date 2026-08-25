import PageHeader from "@/components/ui/PageHeader";
import PurchasingClient from "@/components/dashboard/PurchasingClient";
import { getPurchaseList } from "@/lib/purchasing/data";

export const dynamic = "force-dynamic";

export default async function PurchasingPage() {
  const rows = await getPurchaseList();

  return (
    <div>
      <PageHeader
        title="Purchase List"
        subtitle="Ingredients confirmed events need that current stock doesn't cover."
      />
      <PurchasingClient rows={rows} />
    </div>
  );
}
