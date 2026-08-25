// The starter recipe book — one bill-of-materials per dish, linked to the
// storefront's real dish names via dish_key (lib/menu/dish-catalog.ts) so
// requirements planning (Phase 2) has something to multiply against.
//
// Every ingredient name referenced here must exist in SEED_INGREDIENTS
// (lib/inventory/seed-catalog.ts) — scripts/seed-inventory.ts resolves the
// name to an id and throws if it can't find one, so a typo fails loudly at
// seed time instead of silently costing a dish at ₱0.
//
// `yieldQty` is left at 1 for every row here: each BOM is written "per one
// basis-unit" (one pax, one Family tray, one piece), matching the brief's
// own Chicken Inasal example (100g chicken / 20g marinade / 10ml oil PER
// PAX). An admin scaling a recipe to "one batch feeds 50 pax" later just
// raises yieldQty and multiplies the BOM accordingly — nothing here assumes
// that shape.
//
// Coverage is representative, not exhaustive: every tray-cart dish (the
// finite 28-item catalog every Tray Orders package draws from) plus a
// cross-section of the 90-dish catering catalog (at least 2-3 per category)
// and the most common packed-meal picks. The remaining catering dishes and
// grazing-table bites are intentionally left unlinked — they show up as
// "Recipe Needed" on Costing, which is the real state of an unmapped dish,
// not a data gap to paper over.

export type SeedRecipeItem = {
  ingredient: string; // must match a SEED_INGREDIENTS name exactly
  qty: number; // in the ingredient's base_unit
};

export type SeedRecipe = {
  dish: string; // exact display name — dishKey() of this is the join key
  size: string; // "" for per_pax/per_piece dishes; a TraySize for tray dishes
  category: string;
  basis: "per_pax" | "per_tray" | "per_piece";
  srp: number;
  laborCost: number;
  overheadCost: number;
  items: SeedRecipeItem[];
};

// ---------------------------------------------------------------------
// Tray-cart dishes (supabase/schema.sql's party-trays tray_catalog).
// One "Family" tray per dish, serving ~10-12 pax — Feast/XXXL are left for
// an admin to add as additional size rows on the same dish_key once this
// size proves the shape out.
// ---------------------------------------------------------------------
const TRAY_RECIPES: SeedRecipe[] = [
  { dish: "Beef Kare-Kare", size: "Family", category: "Beef", basis: "per_tray", srp: 1800, laborCost: 180, overheadCost: 90,
    items: [{ ingredient: "Beef Shank", qty: 2.5 }, { ingredient: "Peanut Butter", qty: 0.6 }, { ingredient: "Banana Heart", qty: 0.8 }, { ingredient: "String Beans", qty: 0.5 }, { ingredient: "Shrimp Paste", qty: 0.15 }] },
  { dish: "Beef Caldereta", size: "Family", category: "Beef", basis: "per_tray", srp: 1800, laborCost: 170, overheadCost: 90,
    items: [{ ingredient: "Beef Brisket", qty: 2.5 }, { ingredient: "Tomato Sauce", qty: 0.6 }, { ingredient: "Bell Pepper", qty: 0.4 }, { ingredient: "Carrot", qty: 0.4 }, { ingredient: "Potato", qty: 0.5 }] },
  { dish: "Crispy Beef Tapa", size: "Family", category: "Beef", basis: "per_tray", srp: 1700, laborCost: 160, overheadCost: 85,
    items: [{ ingredient: "Beef Sirloin", qty: 2.2 }, { ingredient: "Soy Sauce", qty: 0.3 }, { ingredient: "Vinegar", qty: 0.15 }, { ingredient: "Garlic", qty: 0.2 }, { ingredient: "Cooking Oil", qty: 0.4 }] },
  { dish: "Beef Bulalo", size: "Family", category: "Beef", basis: "per_tray", srp: 1900, laborCost: 190, overheadCost: 95,
    items: [{ ingredient: "Beef Shank", qty: 3 }, { ingredient: "Sweet Corn", qty: 0.6 }, { ingredient: "Cabbage", qty: 0.5 }, { ingredient: "Onion", qty: 0.3 }] },
  { dish: "Kinilaw na Tanigue", size: "Family", category: "Seafood", basis: "per_tray", srp: 1900, laborCost: 150, overheadCost: 80,
    items: [{ ingredient: "Tanigue", qty: 2 }, { ingredient: "Vinegar", qty: 0.3 }, { ingredient: "Onion", qty: 0.25 }, { ingredient: "Ginger", qty: 0.1 }, { ingredient: "Chili", qty: 0.08 }] },
  { dish: "Garlic Butter Shrimp", size: "Family", category: "Seafood", basis: "per_tray", srp: 2000, laborCost: 160, overheadCost: 85,
    items: [{ ingredient: "Shrimp", qty: 2.2 }, { ingredient: "Butter", qty: 0.35 }, { ingredient: "Garlic", qty: 0.25 }] },
  { dish: "Grilled Bangus Belly", size: "Family", category: "Seafood", basis: "per_tray", srp: 1700, laborCost: 140, overheadCost: 75,
    items: [{ ingredient: "Bangus", qty: 2.5 }, { ingredient: "Calamansi", qty: 0.2 }, { ingredient: "Soy Sauce", qty: 0.15 }] },
  { dish: "Sinigang na Hipon", size: "Family", category: "Seafood", basis: "per_tray", srp: 1900, laborCost: 150, overheadCost: 80,
    items: [{ ingredient: "Shrimp", qty: 1.8 }, { ingredient: "Sinigang Mix", qty: 0.25 }, { ingredient: "Kangkong", qty: 0.5 }, { ingredient: "Tomato", qty: 0.4 }, { ingredient: "String Beans", qty: 0.3 }] },
  { dish: "Crispy Pork Sisig", size: "Family", category: "Pork", basis: "per_tray", srp: 1600, laborCost: 160, overheadCost: 80,
    items: [{ ingredient: "Pork Belly", qty: 2.5 }, { ingredient: "Onion", qty: 0.3 }, { ingredient: "Chili", qty: 0.1 }, { ingredient: "Mayonnaise", qty: 0.15 }, { ingredient: "Calamansi", qty: 0.1 }] },
  { dish: "Bagnet Kare-Kare", size: "Family", category: "Pork", basis: "per_tray", srp: 1700, laborCost: 175, overheadCost: 90,
    items: [{ ingredient: "Pork Belly", qty: 2.5 }, { ingredient: "Peanut Butter", qty: 0.55 }, { ingredient: "Banana Heart", qty: 0.7 }, { ingredient: "Cooking Oil", qty: 0.8 }] },
  { dish: "Lechon Kawali", size: "Family", category: "Pork", basis: "per_tray", srp: 1600, laborCost: 150, overheadCost: 80,
    items: [{ ingredient: "Pork Belly", qty: 2.8 }, { ingredient: "Bay Leaf", qty: 0.01 }, { ingredient: "Black Pepper", qty: 0.02 }, { ingredient: "Cooking Oil", qty: 1.5 }] },
  { dish: "Pork Binagoongan", size: "Family", category: "Pork", basis: "per_tray", srp: 1500, laborCost: 145, overheadCost: 75,
    items: [{ ingredient: "Pork Belly", qty: 2.3 }, { ingredient: "Shrimp Paste", qty: 0.25 }, { ingredient: "Eggplant", qty: 0.5 }, { ingredient: "Tomato", qty: 0.3 }] },
  { dish: "Chicken Inasal", size: "Family", category: "Chicken", basis: "per_tray", srp: 1400, laborCost: 130, overheadCost: 70,
    items: [{ ingredient: "Chicken", qty: 2.5 }, { ingredient: "Marinade", qty: 0.5 }, { ingredient: "Cooking Oil", qty: 0.25 }, { ingredient: "Annatto", qty: 0.05 }] },
  { dish: "Chicken Adobo Flakes", size: "Family", category: "Chicken", basis: "per_tray", srp: 1400, laborCost: 130, overheadCost: 70,
    items: [{ ingredient: "Chicken Breast", qty: 2.2 }, { ingredient: "Soy Sauce", qty: 0.3 }, { ingredient: "Vinegar", qty: 0.15 }, { ingredient: "Garlic", qty: 0.15 }, { ingredient: "Cooking Oil", qty: 0.4 }] },
  { dish: "Buttered Chicken", size: "Family", category: "Chicken", basis: "per_tray", srp: 1450, laborCost: 135, overheadCost: 70,
    items: [{ ingredient: "Chicken Wings", qty: 2.5 }, { ingredient: "Butter", qty: 0.35 }, { ingredient: "Garlic", qty: 0.2 }, { ingredient: "All-Purpose Flour", qty: 0.4 }] },
  { dish: "Chicken Pastel", size: "Family", category: "Chicken", basis: "per_tray", srp: 1450, laborCost: 140, overheadCost: 75,
    items: [{ ingredient: "Chicken Breast", qty: 2.2 }, { ingredient: "All-Purpose Cream", qty: 0.5 }, { ingredient: "Carrot", qty: 0.4 }, { ingredient: "Potato", qty: 0.4 }, { ingredient: "Bell Pepper", qty: 0.3 }] },
  { dish: "Rolled Lasagna", size: "Family", category: "Pasta", basis: "per_tray", srp: 1300, laborCost: 130, overheadCost: 70,
    items: [{ ingredient: "Lasagna Sheets", qty: 1 }, { ingredient: "Ground Pork", qty: 1.5 }, { ingredient: "Tomato Sauce", qty: 0.6 }, { ingredient: "Cheese", qty: 0.5 }] },
  { dish: "Baked Mac", size: "Family", category: "Pasta", basis: "per_tray", srp: 1300, laborCost: 120, overheadCost: 65,
    items: [{ ingredient: "Macaroni Noodles", qty: 1.2 }, { ingredient: "Cheese", qty: 0.6 }, { ingredient: "All-Purpose Cream", qty: 0.5 }, { ingredient: "Ground Pork", qty: 0.8 }] },
  { dish: "Filipino-Style Spaghetti", size: "Family", category: "Pasta", basis: "per_tray", srp: 1200, laborCost: 110, overheadCost: 60,
    items: [{ ingredient: "Spaghetti Noodles", qty: 1.2 }, { ingredient: "Tomato Sauce", qty: 0.7 }, { ingredient: "Ground Pork", qty: 1 }, { ingredient: "Banana Ketchup", qty: 0.3 }, { ingredient: "Cheese", qty: 0.3 }] },
  { dish: "Creamy Carbonara", size: "Family", category: "Pasta", basis: "per_tray", srp: 1350, laborCost: 125, overheadCost: 65,
    items: [{ ingredient: "Spaghetti Noodles", qty: 1.2 }, { ingredient: "All-Purpose Cream", qty: 0.8 }, { ingredient: "Butter", qty: 0.25 }, { ingredient: "Cheese", qty: 0.4 }] },
  { dish: "Leche Flan", size: "Family", category: "Dessert", basis: "per_tray", srp: 1100, laborCost: 100, overheadCost: 55,
    items: [{ ingredient: "Eggs", qty: 24 }, { ingredient: "Condensed Milk", qty: 1 }, { ingredient: "Evaporated Milk", qty: 1 }, { ingredient: "Sugar", qty: 0.3 }] },
  { dish: "Halo-Halo", size: "Family", category: "Dessert", basis: "per_tray", srp: 1200, laborCost: 100, overheadCost: 55,
    items: [{ ingredient: "Young Coconut", qty: 12 }, { ingredient: "Evaporated Milk", qty: 1 }, { ingredient: "Sago", qty: 0.3 }, { ingredient: "Gelatin", qty: 0.2 }, { ingredient: "Mango", qty: 0.6 }] },
  { dish: "Turon", size: "Family", category: "Dessert", basis: "per_tray", srp: 950, laborCost: 90, overheadCost: 45,
    items: [{ ingredient: "Saba Banana", qty: 3 }, { ingredient: "Purple Yam", qty: 0.8 }, { ingredient: "Sugar", qty: 0.3 }, { ingredient: "Cooking Oil", qty: 0.6 }] },
  { dish: "Buko Pandan Salad", size: "Family", category: "Dessert", basis: "per_tray", srp: 1050, laborCost: 95, overheadCost: 50,
    items: [{ ingredient: "Young Coconut", qty: 10 }, { ingredient: "All-Purpose Cream", qty: 0.8 }, { ingredient: "Condensed Milk", qty: 0.5 }, { ingredient: "Pandan Leaves", qty: 0.05 }, { ingredient: "Gelatin", qty: 0.2 }] },
  { dish: "Garlic Rice", size: "Family", category: "Rice", basis: "per_tray", srp: 900, laborCost: 60, overheadCost: 35,
    items: [{ ingredient: "Rice", qty: 3 }, { ingredient: "Garlic", qty: 0.2 }, { ingredient: "Cooking Oil", qty: 0.2 }] },
  { dish: "Java Rice", size: "Family", category: "Rice", basis: "per_tray", srp: 950, laborCost: 65, overheadCost: 35,
    items: [{ ingredient: "Rice", qty: 3 }, { ingredient: "Annatto", qty: 0.03 }, { ingredient: "Garlic", qty: 0.15 }, { ingredient: "Cooking Oil", qty: 0.2 }] },
  { dish: "Plain Rice", size: "Family", category: "Rice", basis: "per_tray", srp: 700, laborCost: 40, overheadCost: 25,
    items: [{ ingredient: "Rice", qty: 3.2 }] },
  { dish: "Bagoong Rice", size: "Family", category: "Rice", basis: "per_tray", srp: 950, laborCost: 60, overheadCost: 35,
    items: [{ ingredient: "Rice", qty: 3 }, { ingredient: "Shrimp Paste", qty: 0.25 }, { ingredient: "Garlic", qty: 0.15 }] },
];

// ---------------------------------------------------------------------
// Catering dishes (herbies' lib/packages.ts dishCatalog — the picks a
// Full-Service Catering customer chooses per category). Priced per pax,
// matching the brief's own worked example almost exactly.
// ---------------------------------------------------------------------
const CATERING_RECIPES: SeedRecipe[] = [
  { dish: "Chicken Inasal", size: "", category: "Chicken", basis: "per_pax", srp: 220, laborCost: 18, overheadCost: 10,
    items: [{ ingredient: "Chicken", qty: 0.1 }, { ingredient: "Marinade", qty: 0.02 }, { ingredient: "Cooking Oil", qty: 0.01 }] },
  { dish: "Chicken Adobo", size: "", category: "Chicken", basis: "per_pax", srp: 210, laborCost: 17, overheadCost: 10,
    items: [{ ingredient: "Chicken", qty: 0.1 }, { ingredient: "Soy Sauce", qty: 0.015 }, { ingredient: "Vinegar", qty: 0.008 }, { ingredient: "Garlic", qty: 0.006 }] },
  { dish: "Chicken Curry", size: "", category: "Chicken", basis: "per_pax", srp: 225, laborCost: 18, overheadCost: 10,
    items: [{ ingredient: "Chicken", qty: 0.1 }, { ingredient: "Coconut Milk", qty: 0.06 }, { ingredient: "Potato", qty: 0.04 }, { ingredient: "Carrot", qty: 0.03 }] },
  { dish: "Fried Chicken", size: "", category: "Chicken", basis: "per_pax", srp: 215, laborCost: 17, overheadCost: 10,
    items: [{ ingredient: "Chicken", qty: 0.11 }, { ingredient: "All-Purpose Flour", qty: 0.03 }, { ingredient: "Cooking Oil", qty: 0.04 }] },
  { dish: "Grilled Bangus", size: "", category: "Fish & Seafood", basis: "per_pax", srp: 200, laborCost: 15, overheadCost: 9,
    items: [{ ingredient: "Bangus", qty: 0.11 }, { ingredient: "Calamansi", qty: 0.01 }, { ingredient: "Soy Sauce", qty: 0.006 }] },
  { dish: "Garlic Butter Shrimp", size: "", category: "Fish & Seafood", basis: "per_pax", srp: 260, laborCost: 18, overheadCost: 10,
    items: [{ ingredient: "Shrimp", qty: 0.1 }, { ingredient: "Butter", qty: 0.015 }, { ingredient: "Garlic", qty: 0.01 }] },
  { dish: "Sinigang na Hipon", size: "", category: "Fish & Seafood", basis: "per_pax", srp: 240, laborCost: 17, overheadCost: 10,
    items: [{ ingredient: "Shrimp", qty: 0.08 }, { ingredient: "Sinigang Mix", qty: 0.012 }, { ingredient: "Kangkong", qty: 0.02 }, { ingredient: "Tomato", qty: 0.02 }] },
  { dish: "Pork Menudo", size: "", category: "Pork", basis: "per_pax", srp: 195, laborCost: 16, overheadCost: 9,
    items: [{ ingredient: "Pork Shoulder", qty: 0.1 }, { ingredient: "Tomato Sauce", qty: 0.03 }, { ingredient: "Potato", qty: 0.03 }, { ingredient: "Carrot", qty: 0.02 }] },
  { dish: "Lechon Kawali", size: "", category: "Pork", basis: "per_pax", srp: 205, laborCost: 16, overheadCost: 9,
    items: [{ ingredient: "Pork Belly", qty: 0.11 }, { ingredient: "Cooking Oil", qty: 0.03 }, { ingredient: "Bay Leaf", qty: 0.0005 }] },
  { dish: "Crispy Pork Sisig", size: "", category: "Pork", basis: "per_pax", srp: 200, laborCost: 16, overheadCost: 9,
    items: [{ ingredient: "Pork Belly", qty: 0.1 }, { ingredient: "Onion", qty: 0.012 }, { ingredient: "Mayonnaise", qty: 0.008 }, { ingredient: "Chili", qty: 0.004 }] },
  { dish: "Beef Caldereta", size: "", category: "Beef", basis: "per_pax", srp: 260, laborCost: 19, overheadCost: 11,
    items: [{ ingredient: "Beef Brisket", qty: 0.1 }, { ingredient: "Tomato Sauce", qty: 0.025 }, { ingredient: "Bell Pepper", qty: 0.015 }, { ingredient: "Potato", qty: 0.02 }] },
  { dish: "Beef Kare-Kare", size: "", category: "Beef", basis: "per_pax", srp: 265, laborCost: 20, overheadCost: 11,
    items: [{ ingredient: "Beef Shank", qty: 0.1 }, { ingredient: "Peanut Butter", qty: 0.025 }, { ingredient: "Banana Heart", qty: 0.03 }, { ingredient: "Shrimp Paste", qty: 0.006 }] },
  { dish: "Beef Mechado", size: "", category: "Beef", basis: "per_pax", srp: 255, laborCost: 19, overheadCost: 11,
    items: [{ ingredient: "Beef Brisket", qty: 0.1 }, { ingredient: "Tomato Sauce", qty: 0.02 }, { ingredient: "Potato", qty: 0.02 }, { ingredient: "Carrot", qty: 0.02 }] },
  { dish: "Bistek Tagalog", size: "", category: "Beef", basis: "per_pax", srp: 245, laborCost: 18, overheadCost: 10,
    items: [{ ingredient: "Beef Sirloin", qty: 0.1 }, { ingredient: "Soy Sauce", qty: 0.012 }, { ingredient: "Calamansi", qty: 0.008 }, { ingredient: "Onion", qty: 0.02 }] },
  { dish: "Pinakbet", size: "", category: "Vegetables", basis: "per_pax", srp: 140, laborCost: 12, overheadCost: 7,
    items: [{ ingredient: "Squash", qty: 0.05 }, { ingredient: "Eggplant", qty: 0.03 }, { ingredient: "String Beans", qty: 0.03 }, { ingredient: "Shrimp Paste", qty: 0.005 }] },
  { dish: "Chopsuey", size: "", category: "Vegetables", basis: "per_pax", srp: 145, laborCost: 12, overheadCost: 7,
    items: [{ ingredient: "Carrot", qty: 0.03 }, { ingredient: "Cabbage", qty: 0.04 }, { ingredient: "Bell Pepper", qty: 0.02 }, { ingredient: "Shrimp", qty: 0.02 }] },
  { dish: "Ginataang Kalabasa", size: "", category: "Vegetables", basis: "per_pax", srp: 135, laborCost: 11, overheadCost: 7,
    items: [{ ingredient: "Squash", qty: 0.06 }, { ingredient: "String Beans", qty: 0.02 }, { ingredient: "Coconut Milk", qty: 0.04 }] },
  { dish: "Sinigang na Baboy", size: "", category: "Soup", basis: "per_pax", srp: 190, laborCost: 15, overheadCost: 8,
    items: [{ ingredient: "Pork Belly", qty: 0.08 }, { ingredient: "Sinigang Mix", qty: 0.012 }, { ingredient: "Kangkong", qty: 0.02 }, { ingredient: "Tomato", qty: 0.02 }] },
  { dish: "Corn Soup", size: "", category: "Soup", basis: "per_pax", srp: 120, laborCost: 10, overheadCost: 6,
    items: [{ ingredient: "Sweet Corn", qty: 0.06 }, { ingredient: "Eggs", qty: 0.2 }, { ingredient: "Evaporated Milk", qty: 0.03 }] },
  { dish: "Bulalo Soup", size: "", category: "Soup", basis: "per_pax", srp: 200, laborCost: 16, overheadCost: 9,
    items: [{ ingredient: "Beef Shank", qty: 0.1 }, { ingredient: "Sweet Corn", qty: 0.04 }, { ingredient: "Cabbage", qty: 0.03 }] },
  { dish: "Leche Flan", size: "", category: "Dessert", basis: "per_pax", srp: 90, laborCost: 8, overheadCost: 5,
    items: [{ ingredient: "Eggs", qty: 1.2 }, { ingredient: "Condensed Milk", qty: 0.04 }, { ingredient: "Evaporated Milk", qty: 0.04 }] },
  { dish: "Halo-Halo", size: "", category: "Dessert", basis: "per_pax", srp: 100, laborCost: 8, overheadCost: 5,
    items: [{ ingredient: "Young Coconut", qty: 0.5 }, { ingredient: "Evaporated Milk", qty: 0.04 }, { ingredient: "Sago", qty: 0.015 }, { ingredient: "Mango", qty: 0.03 }] },
  { dish: "Sapin-Sapin", size: "", category: "Dessert", basis: "per_pax", srp: 85, laborCost: 7, overheadCost: 4,
    items: [{ ingredient: "Glutinous Rice", qty: 0.06 }, { ingredient: "Coconut Milk", qty: 0.04 }, { ingredient: "Sugar", qty: 0.02 }, { ingredient: "Purple Yam", qty: 0.02 }] },
  { dish: "Filipino-Style Spaghetti", size: "", category: "Pasta", basis: "per_pax", srp: 110, laborCost: 9, overheadCost: 5,
    items: [{ ingredient: "Spaghetti Noodles", qty: 0.05 }, { ingredient: "Tomato Sauce", qty: 0.03 }, { ingredient: "Ground Pork", qty: 0.03 }, { ingredient: "Cheese", qty: 0.015 }] },
  { dish: "Creamy Carbonara", size: "", category: "Pasta", basis: "per_pax", srp: 120, laborCost: 9, overheadCost: 5,
    items: [{ ingredient: "Spaghetti Noodles", qty: 0.05 }, { ingredient: "All-Purpose Cream", qty: 0.04 }, { ingredient: "Butter", qty: 0.01 }] },
  { dish: "Pancit Palabok", size: "", category: "Pasta", basis: "per_pax", srp: 115, laborCost: 9, overheadCost: 5,
    items: [{ ingredient: "Palabok Noodles", qty: 0.05 }, { ingredient: "Shrimp", qty: 0.02 }, { ingredient: "Cornstarch", qty: 0.008 }] },
  { dish: "Four Seasons Juice", size: "", category: "Drinks", basis: "per_pax", srp: 35, laborCost: 3, overheadCost: 2,
    items: [{ ingredient: "Juice Concentrate", qty: 0.03 }, { ingredient: "Sugar", qty: 0.01 }] },
  { dish: "Iced Tea", size: "", category: "Drinks", basis: "per_pax", srp: 30, laborCost: 3, overheadCost: 2,
    items: [{ ingredient: "Iced Tea Powder", qty: 0.01 }, { ingredient: "Sugar", qty: 0.01 }] },
  { dish: "Buko Juice", size: "", category: "Drinks", basis: "per_pax", srp: 40, laborCost: 3, overheadCost: 2,
    items: [{ ingredient: "Young Coconut", qty: 0.5 }] },
];

// ---------------------------------------------------------------------
// Packed-meal picks (herbies' packed-meal catalog, priced per piece) — a
// representative dish from each of the four categories.
// ---------------------------------------------------------------------
const PACKED_MEAL_RECIPES: SeedRecipe[] = [
  { dish: "Lumpiang Shanghai", size: "", category: "Snacks", basis: "per_piece", srp: 12, laborCost: 1.5, overheadCost: 1,
    items: [{ ingredient: "Ground Pork", qty: 0.015 }, { ingredient: "Carrot", qty: 0.005 }, { ingredient: "All-Purpose Flour", qty: 0.003 }, { ingredient: "Cooking Oil", qty: 0.01 }] },
  { dish: "Pancit Bihon", size: "", category: "Salad / Noodles", basis: "per_piece", srp: 18, laborCost: 2, overheadCost: 1.5,
    items: [{ ingredient: "Bihon Noodles", qty: 0.04 }, { ingredient: "Cabbage", qty: 0.02 }, { ingredient: "Carrot", qty: 0.01 }, { ingredient: "Chicken Breast", qty: 0.02 }] },
  { dish: "Chicken Adobo Rice", size: "", category: "Rice Meals", basis: "per_piece", srp: 15, laborCost: 2, overheadCost: 1.5,
    items: [{ ingredient: "Chicken", qty: 0.09 }, { ingredient: "Rice", qty: 0.12 }, { ingredient: "Soy Sauce", qty: 0.01 }, { ingredient: "Vinegar", qty: 0.006 }] },
  { dish: "Beef Tapa Rice", size: "", category: "Rice Meals", basis: "per_piece", srp: 16, laborCost: 2, overheadCost: 1.5,
    items: [{ ingredient: "Beef Sirloin", qty: 0.08 }, { ingredient: "Rice", qty: 0.12 }, { ingredient: "Soy Sauce", qty: 0.008 }, { ingredient: "Garlic", qty: 0.006 }] },
  { dish: "Pork Sisig Rice", size: "", category: "Rice Meals", basis: "per_piece", srp: 15.5, laborCost: 2, overheadCost: 1.5,
    items: [{ ingredient: "Pork Belly", qty: 0.09 }, { ingredient: "Rice", qty: 0.12 }, { ingredient: "Onion", qty: 0.008 }, { ingredient: "Mayonnaise", qty: 0.006 }] },
  { dish: "Lechon Belly Rice", size: "", category: "Premium Rice Meals", basis: "per_piece", srp: 32, laborCost: 3, overheadCost: 2,
    items: [{ ingredient: "Lechon Belly Roll", qty: 0.1 }, { ingredient: "Rice", qty: 0.12 } ] },
  { dish: "Garlic Butter Shrimp Rice", size: "", category: "Premium Rice Meals", basis: "per_piece", srp: 35, laborCost: 3, overheadCost: 2,
    items: [{ ingredient: "Shrimp", qty: 0.08 }, { ingredient: "Butter", qty: 0.012 }, { ingredient: "Rice", qty: 0.12 }] },
];

export const SEED_RECIPES: SeedRecipe[] = [...TRAY_RECIPES, ...CATERING_RECIPES, ...PACKED_MEAL_RECIPES];
