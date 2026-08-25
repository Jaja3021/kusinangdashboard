// Illustrative menu price lists — packages, dishes, grazing spreads, catering,
// and packed meals. Moved out of lib/dummy-data.ts (where nothing imported
// them) so lib/owner-financials/mock.ts has a real price basis to generate
// sales from without creating an import cycle with lib/dummy-data.ts.
//
// Note: `branch` here uses the storefront-facing vocabulary
// ("Quezon City" | "Makati" | "Cebu"), not the Cavite/Laguna/Metro Manila
// registry in lib/mt/branches.ts. Consumers that need a real branch id
// should assign one from lib/mt/branches.ts rather than trust this field.

export const DUMMY_CATALOG_BRANCHES = ["Quezon City", "Makati", "Cebu"] as const;

export type MenuBranch = "Both" | (typeof DUMMY_CATALOG_BRANCHES)[number];

export type MenuPackage = {
  id: string;
  code: string;
  name: string;
  pax: string;
  basePrice: number;
  group: string;
  branch: MenuBranch;
  active: boolean;
  inclusions: string[];
};

export const menuPackages: MenuPackage[] = [
  { id: "PKG-fam-c1", code: "fam-c1", name: "Chicken Adobo Family Combo", pax: "15 pax", basePrice: 8500, group: "Family Combos", branch: "Both", active: true, inclusions: ["Chicken Adobo", "Steamed Rice", "Pancit Bihon", "Buko Juice"] },
  { id: "PKG-fam-c2", code: "fam-c2", name: "Pork Sinigang Family Combo", pax: "15 pax", basePrice: 9000, group: "Family Combos", branch: "Both", active: true, inclusions: ["Sinigang na Baboy", "Steamed Rice", "Ensaladang Talong", "Buko Juice"] },
  { id: "PKG-fam-c3", code: "fam-c3", name: "Kare-Kare Family Combo", pax: "15 pax", basePrice: 10500, group: "Family Combos", branch: "Quezon City", active: true, inclusions: ["Kare-Kare", "Bagoong", "Steamed Rice", "Leche Flan"] },
  { id: "PKG-feast-c1", code: "feast-c1", name: "Lechon Belly Feast Combo", pax: "15 pax", basePrice: 12000, group: "Feast Combos", branch: "Both", active: true, inclusions: ["Lechon Belly", "Pancit Palabok", "Garlic Rice", "Buko Pandan"] },
  { id: "PKG-feast-c2", code: "feast-c2", name: "Crispy Pata Feast Combo", pax: "15 pax", basePrice: 12000, group: "Feast Combos", branch: "Both", active: true, inclusions: ["Crispy Pata", "Java Rice", "Ensaladang Talong", "Leche Flan"] },
  { id: "PKG-feast-c3", code: "feast-c3", name: "Bicol Express Feast Combo", pax: "15 pax", basePrice: 12000, group: "Feast Combos", branch: "Makati", active: true, inclusions: ["Bicol Express", "Steamed Rice", "Lumpiang Shanghai", "Buko Juice"] },
  { id: "PKG-feast-c4", code: "feast-c4", name: "Beef Caldereta Feast Combo", pax: "15 pax", basePrice: 15000, group: "Feast Combos", branch: "Both", active: true, inclusions: ["Beef Caldereta", "Garlic Rice", "Pancit Bihon", "Buko Pandan"] },
  { id: "PKG-feast-c5", code: "feast-c5", name: "Pancit Palabok Feast Combo", pax: "15 pax", basePrice: 15000, group: "Feast Combos", branch: "Both", active: true, inclusions: ["Pancit Palabok", "Lumpiang Shanghai", "Steamed Rice", "Leche Flan"] },
  { id: "PKG-feast-c6", code: "feast-c6", name: "Chicken Inasal Feast Combo", pax: "15 pax", basePrice: 15000, group: "Feast Combos", branch: "Cebu", active: false, inclusions: ["Chicken Inasal", "Java Rice", "Atchara", "Buko Juice"] },
  { id: "PKG-feast-c7", code: "feast-c7", name: "Seafood Kare-Kare Feast Combo", pax: "25 pax", basePrice: 15000, group: "Feast Combos", branch: "Both", active: true, inclusions: ["Seafood Kare-Kare", "Bagoong", "Steamed Rice", "Buko Pandan"] },
  { id: "PKG-feast-c8", code: "feast-c8", name: "Beef Mechado Feast Combo", pax: "25 pax", basePrice: 15000, group: "Feast Combos", branch: "Both", active: true, inclusions: ["Beef Mechado", "Garlic Rice", "Ensaladang Talong", "Leche Flan"] },
  { id: "PKG-feast-c9", code: "feast-c9", name: "Dinuguan Feast Combo", pax: "25 pax", basePrice: 15000, group: "Feast Combos", branch: "Quezon City", active: true, inclusions: ["Dinuguan", "Puto", "Steamed Rice", "Buko Juice"] },
  { id: "PKG-prem-c1", code: "prem-c1", name: "Lechon Belly Premium Combo", pax: "15 pax", basePrice: 20000, group: "Premium", branch: "Both", active: true, inclusions: ["Whole Lechon Belly", "Kare-Kare", "Pancit Palabok", "Buko Pandan", "Leche Flan"] },
  { id: "PKG-xxxl-c1", code: "xxxl-c1", name: "Whole Lechon XXXL Combo", pax: "25 pax", basePrice: 17000, group: "XXXL Combos", branch: "Both", active: true, inclusions: ["Whole Lechon", "Pancit Bihon", "Garlic Rice", "Buko Juice"] },
  { id: "PKG-xxxl-c2", code: "xxxl-c2", name: "Boodle Fight XXXL Combo", pax: "25 pax", basePrice: 17000, group: "XXXL Combos", branch: "Both", active: true, inclusions: ["Grilled Liempo", "Inihaw na Bangus", "Garlic Rice", "Ensaladang Talong"] },
  { id: "PKG-2xxxl-c1", code: "2xxxl-c1", name: "Grand Fiesta 2 XXXL Combo", pax: "50 pax", basePrice: 34000, group: "2 XXXL Combos", branch: "Both", active: true, inclusions: ["2 Whole Lechon", "Kare-Kare", "Pancit Palabok", "Buko Pandan"] },
  { id: "PKG-named-1", code: "named-1", name: "Kusinang Pamana Signature Package", pax: "30 pax", basePrice: 25000, group: "Named Packages", branch: "Both", active: true, inclusions: ["Lechon Belly", "Beef Caldereta", "Pancit Palabok", "Leche Flan", "Buko Juice"] },
  { id: "PKG-special-1", code: "special-1", name: "Simbang Gabi Merienda Special", pax: "40 pax", basePrice: 12000, group: "Special Package", branch: "Both", active: true, inclusions: ["Puto Bumbong", "Bibingka", "Salabat", "Suman"] },
];

// Individual a la carte dishes reuse the MenuPackage shape (pax/inclusions
// are simply unused for this tab) — same reasoning as the original.
export const menuDishes: MenuPackage[] = [
  { id: "DSH-01", code: "dish-01", name: "Chicken Adobo", pax: "", basePrice: 280, group: "Ulam", branch: "Both", active: true, inclusions: [] },
  { id: "DSH-02", code: "dish-02", name: "Beef Caldereta", pax: "", basePrice: 380, group: "Ulam", branch: "Both", active: true, inclusions: [] },
  { id: "DSH-03", code: "dish-03", name: "Kare-Kare", pax: "", basePrice: 420, group: "Ulam", branch: "Quezon City", active: true, inclusions: [] },
  { id: "DSH-04", code: "dish-04", name: "Lechon Kawali", pax: "", basePrice: 350, group: "Ulam", branch: "Both", active: true, inclusions: [] },
  { id: "DSH-05", code: "dish-05", name: "Sinigang na Baboy", pax: "", basePrice: 320, group: "Soups", branch: "Both", active: true, inclusions: [] },
  { id: "DSH-06", code: "dish-06", name: "Bicol Express", pax: "", basePrice: 300, group: "Ulam", branch: "Makati", active: true, inclusions: [] },
  { id: "DSH-07", code: "dish-07", name: "Pancit Bihon", pax: "", basePrice: 250, group: "Rice & Noodles", branch: "Both", active: true, inclusions: [] },
  { id: "DSH-08", code: "dish-08", name: "Pancit Palabok", pax: "", basePrice: 270, group: "Rice & Noodles", branch: "Both", active: true, inclusions: [] },
  { id: "DSH-09", code: "dish-09", name: "Garlic Rice", pax: "", basePrice: 120, group: "Rice & Noodles", branch: "Both", active: true, inclusions: [] },
  { id: "DSH-10", code: "dish-10", name: "Lumpiang Shanghai", pax: "", basePrice: 220, group: "Appetizers", branch: "Both", active: true, inclusions: [] },
  { id: "DSH-11", code: "dish-11", name: "Leche Flan", pax: "", basePrice: 180, group: "Dessert", branch: "Both", active: true, inclusions: [] },
  { id: "DSH-12", code: "dish-12", name: "Buko Pandan", pax: "", basePrice: 190, group: "Dessert", branch: "Cebu", active: true, inclusions: [] },
  { id: "DSH-13", code: "dish-13", name: "Puto Bumbong", pax: "", basePrice: 150, group: "Kakanin", branch: "Both", active: false, inclusions: [] },
  { id: "DSH-14", code: "dish-14", name: "Halo-Halo", pax: "", basePrice: 160, group: "Dessert", branch: "Both", active: true, inclusions: [] },
];

export const grazingSpreads: MenuPackage[] = [
  { id: "GRZ-01", code: "graze-1", name: "Fiesta Grazing Table", pax: "50 pax", basePrice: 15000, group: "Grazing", branch: "Both", active: true, inclusions: ["Charcuterie & Local Cheeses", "Fresh Fruits", "Bibingka Bites", "Assorted Kakanin"] },
  { id: "GRZ-02", code: "graze-2", name: "Kakanin & Fruits Grazing Spread", pax: "30 pax", basePrice: 9000, group: "Grazing", branch: "Quezon City", active: true, inclusions: ["Assorted Kakanin", "Fresh Fruits", "Suman", "Buko Pandan Bites"] },
];

export const cateringPackages: MenuPackage[] = [
  { id: "CTR-01", code: "cater-1", name: "Full Service Wedding Catering", pax: "150 pax", basePrice: 145000, group: "Catering", branch: "Both", active: true, inclusions: ["Lechon", "Beef Caldereta", "Pancit Palabok", "Dessert Bar", "Full Table Service"] },
  { id: "CTR-02", code: "cater-2", name: "Corporate Event Catering", pax: "100 pax", basePrice: 95000, group: "Catering", branch: "Both", active: true, inclusions: ["Chicken Inasal", "Garlic Rice", "Pancit Bihon", "Bottled Water"] },
];

export const packedMeals: MenuPackage[] = [
  { id: "PCK-01", code: "pack-1", name: "Standard Packed Meal", pax: "1 pax", basePrice: 180, group: "Packed Meals", branch: "Both", active: true, inclusions: ["Choice of Ulam", "Steamed Rice", "Bottled Water"] },
  { id: "PCK-02", code: "pack-2", name: "Deluxe Packed Meal", pax: "1 pax", basePrice: 250, group: "Packed Meals", branch: "Both", active: true, inclusions: ["Two Ulam", "Steamed Rice", "Dessert", "Bottled Water"] },
  { id: "PCK-03", code: "pack-3", name: "Vegetarian Packed Meal", pax: "1 pax", basePrice: 200, group: "Packed Meals", branch: "Makati", active: true, inclusions: ["Vegetable Ulam", "Steamed Rice", "Fruit"] },
  { id: "PCK-04", code: "pack-4", name: "Executive Packed Meal", pax: "1 pax", basePrice: 320, group: "Packed Meals", branch: "Both", active: true, inclusions: ["Premium Ulam", "Garlic Rice", "Dessert", "Bottled Water", "Individually Boxed"] },
];
