import CostingClient from "@/components/dashboard/CostingClient";
import { getRecipesWithItems } from "@/lib/costing/data";
import { getIngredients, getMovements } from "@/lib/inventory/data";
import { getPackagesData } from "@/lib/menu/data";
import { mappableDishNames } from "@/lib/menu/dish-catalog";

export const dynamic = "force-dynamic";

export default async function CostingPage() {
  const [recipes, ingredients, movements, packages] = await Promise.all([
    getRecipesWithItems(),
    getIngredients(),
    getMovements(),
    getPackagesData(),
  ]);

  return (
    <CostingClient
      recipes={recipes}
      ingredients={ingredients}
      priceHistory={movements}
      dishOptions={mappableDishNames(packages)}
    />
  );
}
