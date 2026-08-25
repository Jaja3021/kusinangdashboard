// The starter ingredient master and the recipe book built on top of it.
//
// Kept in lib/ rather than inside scripts/ so the seed data is typed against
// the same NewIngredient/NewRecipe shapes the app writes, and so a later
// "reset demo data" action could reuse it. Only scripts/seed-inventory.ts
// reads this today.
//
// Prices are illustrative Metro-Manila-area figures in peso per base unit,
// and every one of them is editable in /dashboard/inventory once seeded —
// the point is that the requirement/shortage/purchasing math has something
// real to chew on from the first minute, not that these are exact costs.

export type SeedSupplier = {
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  category: string;
  notes: string;
};

export const SEED_SUPPLIERS: SeedSupplier[] = [
  { name: "ABC Meat Supplier", contactPerson: "Ramon Bautista", phone: "0917 555 0142", email: "orders@abcmeat.ph", category: "Meat & Poultry", notes: "Delivers Mon/Wed/Fri before 7am. 24h lead time." },
  { name: "Fresh Catch Seafood", contactPerson: "Liza Ferrer", phone: "0918 555 0233", email: "sales@freshcatch.ph", category: "Seafood", notes: "Navotas market run. Same-day only if ordered before 4am." },
  { name: "Green Valley Produce", contactPerson: "Nestor Ilagan", phone: "0920 555 0388", email: "greenvalley.produce@gmail.com", category: "Produce", notes: "Daily delivery. Price moves weekly, confirm before large POs." },
  { name: "Golden Grains Trading", contactPerson: "Cecil Ong", phone: "0917 555 0471", email: "goldengrains.trading@gmail.com", category: "Rice, Grains & Noodles", notes: "Rice by the 25kg sack. Free delivery at 10 sacks." },
  { name: "Metro Dairy & Chill", contactPerson: "Arnel Reyes", phone: "0919 555 0516", email: "orders@metrodairy.ph", category: "Dairy & Chilled", notes: "Cold-chain delivery, 48h lead time." },
  { name: "Pantry Essentials PH", contactPerson: "Divine Cruz", phone: "0921 555 0664", email: "divine@pantryessentials.ph", category: "Dry Goods & Pantry", notes: "Bulk condiments and dry goods. Net 15 terms." },
];

export type SeedIngredient = {
  name: string;
  category: string;
  supplier: string;
  purchaseUnit: string;
  purchaseQty: number;
  baseUnit: string;
  unitCost: number;
  reorderLevel: number;
};

const MEAT = "ABC Meat Supplier";
const SEA = "Fresh Catch Seafood";
const PRODUCE = "Green Valley Produce";
const GRAINS = "Golden Grains Trading";
const DAIRY = "Metro Dairy & Chill";
const PANTRY = "Pantry Essentials PH";

export const SEED_INGREDIENTS: SeedIngredient[] = [
  // Meat & Poultry
  { name: "Chicken", category: "Meat & Poultry", supplier: MEAT, purchaseUnit: "box", purchaseQty: 10, baseUnit: "kg", unitCost: 220, reorderLevel: 25 },
  { name: "Chicken Breast", category: "Meat & Poultry", supplier: MEAT, purchaseUnit: "box", purchaseQty: 10, baseUnit: "kg", unitCost: 285, reorderLevel: 12 },
  { name: "Chicken Wings", category: "Meat & Poultry", supplier: MEAT, purchaseUnit: "box", purchaseQty: 10, baseUnit: "kg", unitCost: 245, reorderLevel: 10 },
  { name: "Pork Belly", category: "Meat & Poultry", supplier: MEAT, purchaseUnit: "kg", purchaseQty: 1, baseUnit: "kg", unitCost: 330, reorderLevel: 20 },
  { name: "Pork Shoulder", category: "Meat & Poultry", supplier: MEAT, purchaseUnit: "kg", purchaseQty: 1, baseUnit: "kg", unitCost: 285, reorderLevel: 18 },
  { name: "Ground Pork", category: "Meat & Poultry", supplier: MEAT, purchaseUnit: "kg", purchaseQty: 1, baseUnit: "kg", unitCost: 295, reorderLevel: 8 },
  { name: "Pork Blood", category: "Meat & Poultry", supplier: MEAT, purchaseUnit: "L", purchaseQty: 1, baseUnit: "L", unitCost: 90, reorderLevel: 3 },
  { name: "Lechon Belly Roll", category: "Meat & Poultry", supplier: MEAT, purchaseUnit: "roll", purchaseQty: 5, baseUnit: "kg", unitCost: 640, reorderLevel: 10 },
  { name: "Beef Brisket", category: "Meat & Poultry", supplier: MEAT, purchaseUnit: "kg", purchaseQty: 1, baseUnit: "kg", unitCost: 430, reorderLevel: 15 },
  { name: "Beef Shank", category: "Meat & Poultry", supplier: MEAT, purchaseUnit: "kg", purchaseQty: 1, baseUnit: "kg", unitCost: 410, reorderLevel: 12 },
  { name: "Beef Sirloin", category: "Meat & Poultry", supplier: MEAT, purchaseUnit: "kg", purchaseQty: 1, baseUnit: "kg", unitCost: 530, reorderLevel: 10 },
  { name: "Ox Tripe", category: "Meat & Poultry", supplier: MEAT, purchaseUnit: "kg", purchaseQty: 1, baseUnit: "kg", unitCost: 300, reorderLevel: 5 },
  { name: "Ox Tongue", category: "Meat & Poultry", supplier: MEAT, purchaseUnit: "kg", purchaseQty: 1, baseUnit: "kg", unitCost: 660, reorderLevel: 4 },
  { name: "Chicharon", category: "Meat & Poultry", supplier: MEAT, purchaseUnit: "kg", purchaseQty: 1, baseUnit: "kg", unitCost: 620, reorderLevel: 3 },

  // Seafood
  { name: "Bangus", category: "Seafood", supplier: SEA, purchaseUnit: "kg", purchaseQty: 1, baseUnit: "kg", unitCost: 245, reorderLevel: 10 },
  { name: "Tilapia", category: "Seafood", supplier: SEA, purchaseUnit: "kg", purchaseQty: 1, baseUnit: "kg", unitCost: 185, reorderLevel: 8 },
  { name: "Tanigue", category: "Seafood", supplier: SEA, purchaseUnit: "kg", purchaseQty: 1, baseUnit: "kg", unitCost: 425, reorderLevel: 6 },
  { name: "Fish Fillet", category: "Seafood", supplier: SEA, purchaseUnit: "kg", purchaseQty: 1, baseUnit: "kg", unitCost: 265, reorderLevel: 10 },
  { name: "Salmon Belly", category: "Seafood", supplier: SEA, purchaseUnit: "kg", purchaseQty: 1, baseUnit: "kg", unitCost: 575, reorderLevel: 5 },
  { name: "Shrimp", category: "Seafood", supplier: SEA, purchaseUnit: "kg", purchaseQty: 1, baseUnit: "kg", unitCost: 490, reorderLevel: 8 },
  { name: "Crab", category: "Seafood", supplier: SEA, purchaseUnit: "kg", purchaseQty: 1, baseUnit: "kg", unitCost: 530, reorderLevel: 5 },
  { name: "Squid", category: "Seafood", supplier: SEA, purchaseUnit: "kg", purchaseQty: 1, baseUnit: "kg", unitCost: 330, reorderLevel: 5 },

  // Produce
  { name: "Onion", category: "Produce", supplier: PRODUCE, purchaseUnit: "kg", purchaseQty: 1, baseUnit: "kg", unitCost: 120, reorderLevel: 12 },
  { name: "Garlic", category: "Produce", supplier: PRODUCE, purchaseUnit: "kg", purchaseQty: 1, baseUnit: "kg", unitCost: 180, reorderLevel: 8 },
  { name: "Ginger", category: "Produce", supplier: PRODUCE, purchaseUnit: "kg", purchaseQty: 1, baseUnit: "kg", unitCost: 145, reorderLevel: 4 },
  { name: "Tomato", category: "Produce", supplier: PRODUCE, purchaseUnit: "kg", purchaseQty: 1, baseUnit: "kg", unitCost: 95, reorderLevel: 10 },
  { name: "Potato", category: "Produce", supplier: PRODUCE, purchaseUnit: "kg", purchaseQty: 1, baseUnit: "kg", unitCost: 88, reorderLevel: 10 },
  { name: "Carrot", category: "Produce", supplier: PRODUCE, purchaseUnit: "kg", purchaseQty: 1, baseUnit: "kg", unitCost: 82, reorderLevel: 10 },
  { name: "Bell Pepper", category: "Produce", supplier: PRODUCE, purchaseUnit: "kg", purchaseQty: 1, baseUnit: "kg", unitCost: 165, reorderLevel: 5 },
  { name: "Eggplant", category: "Produce", supplier: PRODUCE, purchaseUnit: "kg", purchaseQty: 1, baseUnit: "kg", unitCost: 72, reorderLevel: 6 },
  { name: "String Beans", category: "Produce", supplier: PRODUCE, purchaseUnit: "kg", purchaseQty: 1, baseUnit: "kg", unitCost: 95, reorderLevel: 6 },
  { name: "Squash", category: "Produce", supplier: PRODUCE, purchaseUnit: "kg", purchaseQty: 1, baseUnit: "kg", unitCost: 58, reorderLevel: 8 },
  { name: "Kangkong", category: "Produce", supplier: PRODUCE, purchaseUnit: "kg", purchaseQty: 1, baseUnit: "kg", unitCost: 62, reorderLevel: 4 },
  { name: "Ampalaya", category: "Produce", supplier: PRODUCE, purchaseUnit: "kg", purchaseQty: 1, baseUnit: "kg", unitCost: 85, reorderLevel: 4 },
  { name: "Cabbage", category: "Produce", supplier: PRODUCE, purchaseUnit: "kg", purchaseQty: 1, baseUnit: "kg", unitCost: 68, reorderLevel: 6 },
  { name: "Pechay", category: "Produce", supplier: PRODUCE, purchaseUnit: "kg", purchaseQty: 1, baseUnit: "kg", unitCost: 72, reorderLevel: 4 },
  { name: "Banana Heart", category: "Produce", supplier: PRODUCE, purchaseUnit: "kg", purchaseQty: 1, baseUnit: "kg", unitCost: 60, reorderLevel: 3 },
  { name: "Malunggay", category: "Produce", supplier: PRODUCE, purchaseUnit: "kg", purchaseQty: 1, baseUnit: "kg", unitCost: 80, reorderLevel: 2 },
  { name: "Chili", category: "Produce", supplier: PRODUCE, purchaseUnit: "kg", purchaseQty: 1, baseUnit: "kg", unitCost: 190, reorderLevel: 2 },
  { name: "Lemongrass", category: "Produce", supplier: PRODUCE, purchaseUnit: "kg", purchaseQty: 1, baseUnit: "kg", unitCost: 90, reorderLevel: 2 },
  { name: "Calamansi", category: "Produce", supplier: PRODUCE, purchaseUnit: "kg", purchaseQty: 1, baseUnit: "kg", unitCost: 115, reorderLevel: 5 },
  { name: "Mango", category: "Produce", supplier: PRODUCE, purchaseUnit: "kg", purchaseQty: 1, baseUnit: "kg", unitCost: 145, reorderLevel: 5 },
  { name: "Saba Banana", category: "Produce", supplier: PRODUCE, purchaseUnit: "kg", purchaseQty: 1, baseUnit: "kg", unitCost: 72, reorderLevel: 6 },
  { name: "Young Coconut", category: "Produce", supplier: PRODUCE, purchaseUnit: "pc", purchaseQty: 1, baseUnit: "pc", unitCost: 45, reorderLevel: 20 },
  { name: "Cassava", category: "Produce", supplier: PRODUCE, purchaseUnit: "kg", purchaseQty: 1, baseUnit: "kg", unitCost: 62, reorderLevel: 4 },
  { name: "Purple Yam", category: "Produce", supplier: PRODUCE, purchaseUnit: "kg", purchaseQty: 1, baseUnit: "kg", unitCost: 185, reorderLevel: 3 },
  { name: "Sweet Corn", category: "Produce", supplier: PRODUCE, purchaseUnit: "kg", purchaseQty: 1, baseUnit: "kg", unitCost: 72, reorderLevel: 5 },
  { name: "Pandan Leaves", category: "Produce", supplier: PRODUCE, purchaseUnit: "kg", purchaseQty: 1, baseUnit: "kg", unitCost: 90, reorderLevel: 1 },

  // Rice, Grains & Noodles
  { name: "Rice", category: "Rice & Grains", supplier: GRAINS, purchaseUnit: "sack", purchaseQty: 25, baseUnit: "kg", unitCost: 52, reorderLevel: 75 },
  { name: "Glutinous Rice", category: "Rice & Grains", supplier: GRAINS, purchaseUnit: "sack", purchaseQty: 25, baseUnit: "kg", unitCost: 78, reorderLevel: 10 },
  { name: "Bihon Noodles", category: "Noodles & Pasta", supplier: GRAINS, purchaseUnit: "box", purchaseQty: 10, baseUnit: "kg", unitCost: 165, reorderLevel: 8 },
  { name: "Canton Noodles", category: "Noodles & Pasta", supplier: GRAINS, purchaseUnit: "box", purchaseQty: 10, baseUnit: "kg", unitCost: 155, reorderLevel: 8 },
  { name: "Sotanghon Noodles", category: "Noodles & Pasta", supplier: GRAINS, purchaseUnit: "box", purchaseQty: 10, baseUnit: "kg", unitCost: 225, reorderLevel: 5 },
  { name: "Palabok Noodles", category: "Noodles & Pasta", supplier: GRAINS, purchaseUnit: "box", purchaseQty: 10, baseUnit: "kg", unitCost: 175, reorderLevel: 5 },
  { name: "Spaghetti Noodles", category: "Noodles & Pasta", supplier: GRAINS, purchaseUnit: "box", purchaseQty: 10, baseUnit: "kg", unitCost: 125, reorderLevel: 10 },
  { name: "Macaroni Noodles", category: "Noodles & Pasta", supplier: GRAINS, purchaseUnit: "box", purchaseQty: 10, baseUnit: "kg", unitCost: 135, reorderLevel: 8 },
  { name: "Lasagna Sheets", category: "Noodles & Pasta", supplier: GRAINS, purchaseUnit: "box", purchaseQty: 5, baseUnit: "kg", unitCost: 265, reorderLevel: 4 },
  { name: "All-Purpose Flour", category: "Dry Goods", supplier: GRAINS, purchaseUnit: "sack", purchaseQty: 25, baseUnit: "kg", unitCost: 62, reorderLevel: 15 },
  { name: "Cornstarch", category: "Dry Goods", supplier: GRAINS, purchaseUnit: "kg", purchaseQty: 1, baseUnit: "kg", unitCost: 92, reorderLevel: 4 },
  { name: "Bread Crumbs", category: "Dry Goods", supplier: GRAINS, purchaseUnit: "kg", purchaseQty: 1, baseUnit: "kg", unitCost: 145, reorderLevel: 3 },

  // Dairy & Chilled
  { name: "Eggs", category: "Dairy & Chilled", supplier: DAIRY, purchaseUnit: "tray", purchaseQty: 30, baseUnit: "pc", unitCost: 8.5, reorderLevel: 120 },
  { name: "Butter", category: "Dairy & Chilled", supplier: DAIRY, purchaseUnit: "kg", purchaseQty: 1, baseUnit: "kg", unitCost: 495, reorderLevel: 5 },
  { name: "Cheese", category: "Dairy & Chilled", supplier: DAIRY, purchaseUnit: "kg", purchaseQty: 1, baseUnit: "kg", unitCost: 430, reorderLevel: 6 },
  { name: "All-Purpose Cream", category: "Dairy & Chilled", supplier: DAIRY, purchaseUnit: "L", purchaseQty: 1, baseUnit: "L", unitCost: 225, reorderLevel: 8 },
  { name: "Evaporated Milk", category: "Dairy & Chilled", supplier: DAIRY, purchaseUnit: "L", purchaseQty: 1, baseUnit: "L", unitCost: 98, reorderLevel: 8 },
  { name: "Condensed Milk", category: "Dairy & Chilled", supplier: DAIRY, purchaseUnit: "L", purchaseQty: 1, baseUnit: "L", unitCost: 145, reorderLevel: 8 },

  // Pantry
  { name: "Cooking Oil", category: "Pantry", supplier: PANTRY, purchaseUnit: "pail", purchaseQty: 17, baseUnit: "L", unitCost: 96, reorderLevel: 25 },
  { name: "Marinade", category: "Pantry", supplier: PANTRY, purchaseUnit: "kg", purchaseQty: 1, baseUnit: "kg", unitCost: 180, reorderLevel: 8 },
  { name: "Soy Sauce", category: "Pantry", supplier: PANTRY, purchaseUnit: "gallon", purchaseQty: 4, baseUnit: "L", unitCost: 72, reorderLevel: 12 },
  { name: "Vinegar", category: "Pantry", supplier: PANTRY, purchaseUnit: "gallon", purchaseQty: 4, baseUnit: "L", unitCost: 56, reorderLevel: 12 },
  { name: "Fish Sauce", category: "Pantry", supplier: PANTRY, purchaseUnit: "gallon", purchaseQty: 4, baseUnit: "L", unitCost: 78, reorderLevel: 8 },
  { name: "Oyster Sauce", category: "Pantry", supplier: PANTRY, purchaseUnit: "L", purchaseQty: 1, baseUnit: "L", unitCost: 185, reorderLevel: 5 },
  { name: "Tomato Sauce", category: "Pantry", supplier: PANTRY, purchaseUnit: "L", purchaseQty: 1, baseUnit: "L", unitCost: 88, reorderLevel: 10 },
  { name: "Banana Ketchup", category: "Pantry", supplier: PANTRY, purchaseUnit: "L", purchaseQty: 1, baseUnit: "L", unitCost: 98, reorderLevel: 5 },
  { name: "Coconut Milk", category: "Pantry", supplier: PANTRY, purchaseUnit: "L", purchaseQty: 1, baseUnit: "L", unitCost: 92, reorderLevel: 10 },
  { name: "Shrimp Paste", category: "Pantry", supplier: PANTRY, purchaseUnit: "kg", purchaseQty: 1, baseUnit: "kg", unitCost: 225, reorderLevel: 3 },
  { name: "Peanut Butter", category: "Pantry", supplier: PANTRY, purchaseUnit: "kg", purchaseQty: 1, baseUnit: "kg", unitCost: 265, reorderLevel: 4 },
  { name: "Sinigang Mix", category: "Pantry", supplier: PANTRY, purchaseUnit: "kg", purchaseQty: 1, baseUnit: "kg", unitCost: 325, reorderLevel: 4 },
  { name: "Annatto", category: "Pantry", supplier: PANTRY, purchaseUnit: "kg", purchaseQty: 1, baseUnit: "kg", unitCost: 305, reorderLevel: 2 },
  { name: "Mayonnaise", category: "Pantry", supplier: PANTRY, purchaseUnit: "kg", purchaseQty: 1, baseUnit: "kg", unitCost: 245, reorderLevel: 4 },
  { name: "Salt", category: "Pantry", supplier: PANTRY, purchaseUnit: "kg", purchaseQty: 1, baseUnit: "kg", unitCost: 26, reorderLevel: 6 },
  { name: "Black Pepper", category: "Pantry", supplier: PANTRY, purchaseUnit: "kg", purchaseQty: 1, baseUnit: "kg", unitCost: 490, reorderLevel: 2 },
  { name: "Sugar", category: "Pantry", supplier: PANTRY, purchaseUnit: "sack", purchaseQty: 25, baseUnit: "kg", unitCost: 70, reorderLevel: 20 },
  { name: "Bay Leaf", category: "Pantry", supplier: PANTRY, purchaseUnit: "kg", purchaseQty: 1, baseUnit: "kg", unitCost: 900, reorderLevel: 1 },
  { name: "Gelatin", category: "Pantry", supplier: PANTRY, purchaseUnit: "kg", purchaseQty: 1, baseUnit: "kg", unitCost: 330, reorderLevel: 3 },
  { name: "Sago", category: "Pantry", supplier: PANTRY, purchaseUnit: "kg", purchaseQty: 1, baseUnit: "kg", unitCost: 95, reorderLevel: 4 },
  { name: "Iced Tea Powder", category: "Beverages", supplier: PANTRY, purchaseUnit: "kg", purchaseQty: 1, baseUnit: "kg", unitCost: 265, reorderLevel: 4 },
  { name: "Juice Concentrate", category: "Beverages", supplier: PANTRY, purchaseUnit: "L", purchaseQty: 1, baseUnit: "L", unitCost: 125, reorderLevel: 8 },
  { name: "Ground Coffee", category: "Beverages", supplier: PANTRY, purchaseUnit: "kg", purchaseQty: 1, baseUnit: "kg", unitCost: 530, reorderLevel: 3 },
  { name: "Bottled Water", category: "Beverages", supplier: PANTRY, purchaseUnit: "case", purchaseQty: 24, baseUnit: "pc", unitCost: 12, reorderLevel: 96 },
];
