// The dish universe an order can reference, and the key that joins a dish to
// its recipe.
//
// A dish is never a row anywhere — it's a name. The storefront writes those
// names into orders.selected_dishes ({"Chicken": "Chicken Teriyaki", ...}),
// orders.menu_snapshot ({mains, sides, snacks}), and orders.cart
// ([{dishId, size, qty}]). public.recipes.dish_key (supabase/recipe_yield.sql)
// holds the same normalized form, which is what lets an order be costed in
// ingredients without a menu_items table.

/** Normalizes a dish name (or a storefront tray `dishId`, already in this
 * shape) into the recipe join key. Case, punctuation, and spacing differences
 * between "Kare-Kare", "kare kare", and "kare-kare" all collapse to one key. */
export function dishKey(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Mirrors herbies' lib/packages.ts `DISH_CATEGORIES` / `dishCatalog` — the
// dishes a Full-Service Catering customer picks per category, which exist
// only in that repo's code, not in any table. Kept in sync by hand; a name
// that drifts simply fails to match a recipe and surfaces as an unmapped dish
// on the Costing page rather than silently costing zero.
export const CATERING_DISH_CATEGORIES = [
  "Chicken",
  "Fish & Seafood",
  "Pork",
  "Beef",
  "Vegetables",
  "Soup",
  "Dessert",
  "Pasta",
  "Drinks",
] as const;
export type CateringDishCategory = (typeof CATERING_DISH_CATEGORIES)[number];

export const CATERING_DISH_CATALOG: Record<CateringDishCategory, string[]> = {
  Chicken: [
    "Chicken Adobo",
    "Chicken Inasal",
    "Chicken Curry",
    "Chicken Afritada",
    "Buttered Chicken",
    "Chicken Teriyaki",
    "Fried Chicken",
    "Chicken Cordon Bleu",
    "Chicken Pastel",
    "Salted Egg Chicken",
  ],
  "Fish & Seafood": [
    "Grilled Bangus",
    "Kinilaw na Tanigue",
    "Sinigang na Hipon",
    "Garlic Butter Shrimp",
    "Fish Fillet with Tartar Sauce",
    "Escabeche",
    "Ginataang Alimasag",
    "Pinaputok na Tilapia",
    "Camaron Rebosado",
    "Sweet and Sour Fish",
  ],
  Pork: [
    "Pork Menudo",
    "Lechon Kawali",
    "Crispy Pork Sisig",
    "Pork Sinigang",
    "Pork Binagoongan",
    "Pork Caldereta",
    "Bicol Express",
    "Pork Barbecue",
    "Pork Giniling",
    "Humba",
  ],
  Beef: [
    "Beef Caldereta",
    "Beef Kare-Kare",
    "Beef Mechado",
    "Beef Bulalo",
    "Crispy Beef Tapa",
    "Beef Nilaga",
    "Bistek Tagalog",
    "Beef Salpicao",
    "Beef Morcon",
    "Lengua Estofado",
  ],
  Vegetables: [
    "Pinakbet",
    "Chopsuey",
    "Ginataang Gulay",
    "Laing",
    "Dinengdeng",
    "Ginisang Ampalaya",
    "Buttered Mixed Vegetables",
    "Ginataang Kalabasa",
    "Adobong Kangkong",
    "Lumpiang Gulay",
  ],
  Soup: [
    "Nilagang Baka",
    "Bulalo Soup",
    "Sinigang na Baboy",
    "Tinolang Manok",
    "Molo Soup",
    "Law-uy",
    "Utan Bisaya",
    "Ginataang Munggo",
    "Corn Soup",
    "La Paz Batchoy",
  ],
  Dessert: [
    "Leche Flan",
    "Halo-Halo",
    "Turon",
    "Buko Pandan",
    "Maja Blanca",
    "Bibingka",
    "Puto",
    "Cassava Cake",
    "Ube Halaya",
    "Sapin-Sapin",
  ],
  Pasta: [
    "Filipino-Style Spaghetti",
    "Baked Mac",
    "Creamy Carbonara",
    "Rolled Lasagna",
    "Pancit Canton",
    "Pancit Bihon",
    "Pancit Palabok",
    "Baked Macaroni Salad",
    "Bam-i",
    "Sotanghon Guisado",
  ],
  Drinks: [
    "Brewed Coffee",
    "Iced Tea",
    "Four Seasons Juice",
    "Blue Lemonade",
    "Pink Lychee Juice",
    "Sago't Gulaman",
    "Buko Juice",
    "Calamansi Juice",
    "Melon Juice",
    "Bottled Water",
  ],
};

export const CATERING_DISHES: string[] = CATERING_DISH_CATEGORIES.flatMap((c) => CATERING_DISH_CATALOG[c]);

/** Which catering category a dish belongs to, or null for a dish that only
 * exists on a package (a tray dish, a grazing bite, a packed meal). */
export function cateringCategoryOf(name: string): CateringDishCategory | null {
  const key = dishKey(name);
  for (const category of CATERING_DISH_CATEGORIES) {
    if (CATERING_DISH_CATALOG[category].some((d) => dishKey(d) === key)) return category;
  }
  return null;
}

/** Every dish name a package sells — tray catalog entries, packed-meal
 * dishes, dish slots, and the mains/sides/snacks of every pax tier and
 * head-count menu. Union with CATERING_DISHES for the full mappable set. */
export function collectPackageDishNames(packages: { trayCatalog?: unknown; packedMealCatalog?: unknown; dishSlots?: unknown; paxTiers?: unknown }[]): string[] {
  const names = new Set<string>();
  const add = (v: unknown) => {
    if (typeof v === "string" && v.trim()) names.add(v.trim());
  };

  for (const pkg of packages) {
    for (const dish of (pkg.trayCatalog as { name?: unknown }[] | null | undefined) ?? []) add(dish?.name);
    for (const info of (pkg.packedMealCatalog as { dishes?: unknown[] }[] | null | undefined) ?? []) {
      for (const d of info?.dishes ?? []) add(d);
    }
    for (const slot of (pkg.dishSlots as { dish?: unknown }[] | null | undefined) ?? []) add(slot?.dish);
    for (const tier of (pkg.paxTiers as { menus?: { mains?: unknown[]; sides?: unknown[]; snacks?: unknown[] }[] }[] | null | undefined) ?? []) {
      for (const menu of tier?.menus ?? []) {
        for (const d of [...(menu.mains ?? []), ...(menu.sides ?? []), ...(menu.snacks ?? [])]) add(d);
      }
    }
  }

  return [...names].sort((a, b) => a.localeCompare(b));
}

/** The full set of dish names a recipe can be linked to, deduped by key. */
export function mappableDishNames(packages: Parameters<typeof collectPackageDishNames>[0]): string[] {
  const byKey = new Map<string, string>();
  for (const name of [...CATERING_DISHES, ...collectPackageDishNames(packages)]) {
    if (!byKey.has(dishKey(name))) byKey.set(dishKey(name), name);
  }
  return [...byKey.values()].sort((a, b) => a.localeCompare(b));
}
