import InventoryClient from "@/components/dashboard/InventoryClient";
import { getIngredientsWithStock, getMovements, getSuppliers } from "@/lib/inventory/data";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const [ingredients, suppliers, movements] = await Promise.all([
    getIngredientsWithStock(),
    getSuppliers(),
    getMovements(),
  ]);

  return <InventoryClient ingredients={ingredients} suppliers={suppliers} movements={movements} />;
}
