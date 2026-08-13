import CostingClient from "@/components/dashboard/CostingClient";
import { getRecipesWithItems } from "@/lib/costing/data";
import { getIngredients, getMovements } from "@/lib/inventory/data";

export const dynamic = "force-dynamic";

export default async function CostingPage() {
  const [recipes, ingredients, movements] = await Promise.all([
    getRecipesWithItems(),
    getIngredients(),
    getMovements(),
  ]);

  return <CostingClient recipes={recipes} ingredients={ingredients} priceHistory={movements} />;
}
