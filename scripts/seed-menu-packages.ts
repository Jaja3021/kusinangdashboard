// One-off seed: populates public.packages with the real catering catalog —
// Party Trays, Packed Meals, Grazing Table/Board, Basic/Classic Catering, and
// Handaan Packages — transcribed from the sibling herbies project's own seed
// files (c:/project/herbies/supabase/schema.sql, .../handaan-packages.sql).
//
// herbies-dashboard's public.packages IS herbies' public.packages (same
// Supabase project — see lib/menu/data.ts's header comment), but this repo
// never shipped herbies' base schema.sql/handaan-packages.sql seed inserts,
// so this script ports that same data in as a plain insert/upsert instead of
// requiring the raw SQL to be pasted into the Supabase SQL Editor.
//
// Usage: npx tsx scripts/seed-menu-packages.ts
// Safe to re-run: the 6 base packages use upsert+ignoreDuplicates (existing
// rows/admin edits are left alone, matching herbies' own "on conflict do
// nothing"); Handaan Packages uses a plain upsert (always overwritten with
// the full real menu, matching herbies' own "on conflict do update").

import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

function loadEnvLocal() {
  const text = readFileSync(new URL("../.env.local", import.meta.url), "utf-8");
  const env: Record<string, string> = {};
  for (const line of text.split("\n")) {
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (match) env[match[1]] = match[2];
  }
  return env;
}

// ---------- 6 base packages (herbies/supabase/schema.sql seed) ----------

const BASE_PACKAGES = [
  {
    slug: "party-trays",
    name: "Party Trays",
    category: "Tray Orders",
    description: "Build your own party trays — mix and match Filipino favorites by category and size.",
    recommended: true,
    pax_tiers: [],
    inclusions: [
      "Foil-sealed party trays",
      "Serving tongs and ladles",
      "Disposable plates and utensils",
      "Free delivery within city limits",
    ],
    add_ons: [
      "Extra tray (any dish) — ₱850",
      "Rush order (within 24 hrs) — ₱1,000",
      "Paper cups and napkins bundle — ₱300",
    ],
    price_per_head: null,
    minimum_head_count: null,
    tray_catalog: [
      { id: "beef-kare-kare", name: "Beef Kare-Kare", category: "Beef", prices: { Family: 1800, Feast: 4200, XXXL: 9500 } },
      { id: "beef-caldereta", name: "Beef Caldereta", category: "Beef", prices: { Family: 1800, Feast: 4200, XXXL: 9500 } },
      { id: "crispy-beef-tapa", name: "Crispy Beef Tapa", category: "Beef", prices: { Family: 1700, Feast: 4000, XXXL: 9000 } },
      { id: "beef-bulalo", name: "Beef Bulalo", category: "Beef", prices: { Family: 1900, Feast: 4400, XXXL: 9800 } },
      { id: "kinilaw-na-tanigue", name: "Kinilaw na Tanigue", category: "Seafood", prices: { Family: 1900, Feast: 4400, XXXL: 9800 } },
      { id: "garlic-butter-shrimp", name: "Garlic Butter Shrimp", category: "Seafood", prices: { Family: 2000, Feast: 4600, XXXL: 10200 } },
      { id: "grilled-bangus-belly", name: "Grilled Bangus Belly", category: "Seafood", prices: { Family: 1700, Feast: 4000, XXXL: 9000 } },
      { id: "sinigang-na-hipon", name: "Sinigang na Hipon", category: "Seafood", prices: { Family: 1900, Feast: 4400, XXXL: 9800 } },
      { id: "crispy-pork-sisig", name: "Crispy Pork Sisig", category: "Pork", prices: { Family: 1600, Feast: 3800, XXXL: 8500 } },
      { id: "bagnet-kare-kare", name: "Bagnet Kare-Kare", category: "Pork", prices: { Family: 1700, Feast: 4000, XXXL: 9000 } },
      { id: "lechon-kawali", name: "Lechon Kawali", category: "Pork", prices: { Family: 1600, Feast: 3800, XXXL: 8500 } },
      { id: "pork-binagoongan", name: "Pork Binagoongan", category: "Pork", prices: { Family: 1500, Feast: 3600, XXXL: 8000 } },
      { id: "chicken-inasal", name: "Chicken Inasal", category: "Chicken", prices: { Family: 1400, Feast: 3200, XXXL: 7200 } },
      { id: "chicken-adobo-flakes", name: "Chicken Adobo Flakes", category: "Chicken", prices: { Family: 1400, Feast: 3200, XXXL: 7200 } },
      { id: "buttered-chicken", name: "Buttered Chicken", category: "Chicken", prices: { Family: 1450, Feast: 3300, XXXL: 7400 } },
      { id: "chicken-pastel", name: "Chicken Pastel", category: "Chicken", prices: { Family: 1450, Feast: 3300, XXXL: 7400 } },
      { id: "rolled-lasagna", name: "Rolled Lasagna", category: "Pasta", prices: { Family: 1300, Feast: 3000, XXXL: 6800 } },
      { id: "baked-mac", name: "Baked Mac", category: "Pasta", prices: { Family: 1300, Feast: 3000, XXXL: 6800 } },
      { id: "filipino-style-spaghetti", name: "Filipino-Style Spaghetti", category: "Pasta", prices: { Family: 1200, Feast: 2800, XXXL: 6300 } },
      { id: "creamy-carbonara", name: "Creamy Carbonara", category: "Pasta", prices: { Family: 1350, Feast: 3100, XXXL: 7000 } },
      { id: "leche-flan", name: "Leche Flan", category: "Dessert", prices: { Family: 1100, Feast: 2500, XXXL: 5600 } },
      { id: "halo-halo", name: "Halo-Halo", category: "Dessert", prices: { Family: 1200, Feast: 2700, XXXL: 6000 } },
      { id: "turon", name: "Turon", category: "Dessert", prices: { Family: 950, Feast: 2200, XXXL: 4900 } },
      { id: "buko-pandan-salad", name: "Buko Pandan Salad", category: "Dessert", prices: { Family: 1050, Feast: 2400, XXXL: 5300 } },
      { id: "garlic-rice", name: "Garlic Rice", category: "Rice", prices: { Family: 900, Feast: 2000, XXXL: 4500 } },
      { id: "java-rice", name: "Java Rice", category: "Rice", prices: { Family: 950, Feast: 2100, XXXL: 4700 } },
      { id: "plain-rice", name: "Plain Rice", category: "Rice", prices: { Family: 700, Feast: 1600, XXXL: 3600 } },
      { id: "bagoong-rice", name: "Bagoong Rice", category: "Rice", prices: { Family: 950, Feast: 2100, XXXL: 4700 } },
    ],
    packed_meal_catalog: null,
    branch: null,
    active: true,
    dish_slots: [],
  },
  {
    slug: "packed-meals",
    name: "Packed Meals",
    category: "Tray Orders",
    description: "Individually packed Filipino meal boxes, priced per piece — the more you order, the less per piece.",
    recommended: false,
    pax_tiers: [],
    inclusions: [
      "Individually sealed meal boxes",
      "Disposable spoon and fork sets",
      "Labeled per dish for easy distribution",
      "Free delivery within city limits",
    ],
    add_ons: ["Rush order (within 24 hrs) — ₱1,000", "Bottled water per box — ₱20/box"],
    price_per_head: null,
    minimum_head_count: null,
    tray_catalog: null,
    packed_meal_catalog: [
      {
        category: "Snacks",
        description: "Salads, wraps, and Filipino snack packs — light meals perfect for casual events.",
        dishes: ["Lumpiang Shanghai", "Cheesy Lumpia", "Turon", "Chicken Empanada", "Fishball Skewers", "Kwek-Kwek", "Siomai", "Beef Tapa Wrap"],
        tiers: [
          { minQty: 25, label: "25+ pcs", pricePerPc: 350 },
          { minQty: 50, label: "50+ pcs", pricePerPc: 300 },
          { minQty: 100, label: "100+ pcs", pricePerPc: 250 },
        ],
      },
      {
        category: "Salad / Noodles",
        description: "Pancit and noodle favorites — pastas come with sourdough artisanal bread.",
        dishes: ["Pancit Canton", "Pancit Bihon", "Pancit Palabok", "Sotanghon Guisado", "Filipino-Style Spaghetti", "Bam-i", "Ensaladang Mangga", "Buko Salad"],
        tiers: [
          { minQty: 25, label: "25+ pcs", pricePerPc: 450 },
          { minQty: 50, label: "50+ pcs", pricePerPc: 400 },
          { minQty: 100, label: "100+ pcs", pricePerPc: 350 },
        ],
      },
      {
        category: "Rice Meals",
        tag: "Best Sellers",
        description: "Our most popular rice-topping dishes — beef, seafood, pork, and chicken options.",
        dishes: ["Chicken Adobo Rice", "Beef Tapa Rice", "Pork Sisig Rice", "Chicken Inasal Rice", "Grilled Bangus Rice", "Pork Barbecue Rice", "Beef Caldereta Rice", "Chicken Curry Rice"],
        tiers: [
          { minQty: 25, label: "25+ pcs", pricePerPc: 325 },
          { minQty: 50, label: "50+ pcs", pricePerPc: 285 },
          { minQty: 100, label: "100+ pcs", pricePerPc: 250 },
        ],
      },
      {
        category: "Premium Rice Meals",
        description: "Premium beef, seafood, pork, and chicken dishes for a more elevated experience.",
        dishes: ["Lechon Belly Rice", "Grilled Salmon Rice", "Bistek Tagalog Rice", "Garlic Butter Shrimp Rice", "Crispy Pata Rice", "Herb-Roasted Chicken Rice", "Beef Kare-Kare Rice", "Salted Egg Crab Rice"],
        tiers: [
          { minQty: 25, label: "25+ pcs", pricePerPc: 850 },
          { minQty: 50, label: "50+ pcs", pricePerPc: 650 },
          { minQty: 100, label: "100+ pcs", pricePerPc: 500 },
        ],
      },
    ],
    branch: null,
    active: true,
    dish_slots: [],
  },
  {
    slug: "grazing-table",
    name: "Grazing Table",
    category: "Grazing",
    description: "A rustic grazing spread of Filipino bite-sized favorites, styled for the table.",
    recommended: false,
    pax_tiers: [50, 100, 150].map((pax) => ({
      pax,
      paxLabel: pax === 50 ? "50-100" : pax === 100 ? "100-150" : "150-200",
      menus: [
        {
          id: `grazing-table-${pax}`,
          name: "Full Spread",
          price: 20000,
          mains: ["Embutido Bites", "Morcon Slices", "Cheesy Lumpia", "Korean-Style Fried Chicken Bites", "Beef Nachos Bites", "Salted Egg Chicken Wings"],
          sides: ["Buttered Corn", "Chicken Macaroni Salad", "Fresh Fruit Platter"],
          snacks: ["Puto", "Kutsinta", "Mini Empanada"],
        },
      ],
    })),
    inclusions: [
      "2 rustic wooden tables",
      "1 coffee dispenser",
      "1 rustic barrel",
      "2 juice jars",
      "Ceramic serving platters and bowls",
      "Reusable table runners, greenery, and decorations",
      "Disposable plates, cutlery, and paper cups",
      "Mugs with logo",
      "2 serving staff to refill and maintain the spread",
      "3 hrs of service",
    ],
    add_ons: ["Extra hour of service — ₱1,500/hr", "Transpo fee — depends on location", "Service charge — 10%"],
    price_per_head: null,
    minimum_head_count: null,
    tray_catalog: null,
    packed_meal_catalog: null,
    branch: null,
    active: true,
    dish_slots: [],
  },
  {
    slug: "grazing-board",
    name: "Grazing Board",
    category: "Grazing",
    description: "Beautifully styled small-format Filipino boards, perfect for intimate spreads.",
    recommended: false,
    pax_tiers: [15, 30, 60].map((pax) => ({
      pax,
      paxLabel: pax === 15 ? "15-25" : pax === 30 ? "30-50" : "60-100",
      menus: [
        {
          id: `grazing-board-${pax}`,
          name: "Full Spread",
          price: 20000,
          mains: ["Cured Longganisa Rolls", "Baked Cheesy Embutido", "Crispy Tadyang Bites", "Garlic Parmesan Wings", "Smoked Bangus Dip", "Chicharon Bulaklak"],
          sides: ["Mixed Nuts Medley", "Toasted Garlic Bread", "Berry Buko Salad"],
          snacks: ["Bibingka", "Suman sa Lihiya", "Leche Flan Bites"],
        },
      ],
    })),
    inclusions: [
      "1 rustic wooden board barrel",
      "Coffee and juice dispensers",
      "Ceramic serving platters",
      "Disposable paper cups and napkins",
      "Decorative styling (florals and greenery)",
      "1 staff on-site to refill and maintain the board",
      "3 hrs of service",
    ],
    add_ons: ["Extra hour of service — ₱1,500/hr", "Transpo fee — depends on location", "Service charge — 10%"],
    price_per_head: null,
    minimum_head_count: null,
    tray_catalog: null,
    packed_meal_catalog: null,
    branch: null,
    active: true,
    dish_slots: [],
  },
  {
    slug: "basic-catering",
    name: "Basic Catering Package",
    category: "Full-Service Catering",
    description: "Simple, satisfying full-buffet service for everyday events. Tables and waiters included.",
    recommended: false,
    pax_tiers: [],
    inclusions: [
      "8-10 seater round tables with white cover",
      "Monoblock chairs with white cover",
      "Buffet skirted table set-up",
      "Spoon, fork, and dinner plate sets",
      "Chafing dishes for all hot food",
      "Waiters in uniform",
      "3-4 hrs of service",
    ],
    add_ons: [
      "Lechon chopping — ₱2,500 / 2 lechons",
      "Service charge — 10%",
      "Transpo, hauling, set-up and pull-out — ₱12,000 / 100 pax",
    ],
    price_per_head: 950,
    minimum_head_count: 50,
    tray_catalog: null,
    packed_meal_catalog: null,
    branch: null,
    active: true,
    dish_slots: [],
  },
  {
    slug: "classic-catering",
    name: "Classic Catering Package",
    category: "Full-Service Catering",
    description: "Premium full service — adds pork dishes, 2 types of dessert, more chafing dishes, and upgraded lights.",
    recommended: true,
    pax_tiers: [],
    inclusions: [
      "8-10 seater round tables with white cover",
      "Monoblock chairs with white cover",
      "Buffet skirted table set-up",
      "Dinner plates, saucer, and soup bowl sets",
      "Chafing dishes and swan lights",
      "Waiters in uniform",
      "Color-themed table napkins, ribbons, and centerpiece",
      "3-4 hrs of service",
    ],
    add_ons: [
      "Lechon chopping — ₱2,500 / 2 lechons",
      "Service charge — 10%",
      "Transpo, hauling, set-up and pull-out — ₱12,000 / 100 pax",
    ],
    price_per_head: 1250,
    minimum_head_count: 50,
    tray_catalog: null,
    packed_meal_catalog: null,
    branch: null,
    active: true,
    dish_slots: [],
  },
];

// ---------- Handaan Packages (herbies/supabase/handaan-packages.sql) ----------

function menu(id: string, name: string, price: number, group: string, mains: string[], sides: string[], snacks: string[], badge?: string) {
  return { id, name, price, group, mains, sides, snacks, ...(badge ? { badge } : {}) };
}

const HANDAAN_PAX_TIERS = [
  {
    pax: 15,
    paxLabel: "15",
    menus: [
      menu("handaan-packages-15-hapag-pamilya-1", "Hapag Pamilya — Pista", 7500, "Hapag Pamilya", ["Hapag Beef Kare-Kare", "Hapag Chicken Inasal", "Hapag Grilled Bangus"], ["Hapag Pinakbet", "Hapag Garlic Rice"], ["Hapag Leche Flan", "Hapag Iced Tea"]),
      menu("handaan-packages-15-hapag-pamilya-2", "Hapag Pamilya — Kasalo", 8000, "Hapag Pamilya", ["Hapag Beef Mechado", "Hapag Chicken Adobo", "Hapag Kinilaw na Tanigue"], ["Hapag Chopsuey", "Hapag Java Rice"], ["Hapag Halo-Halo", "Hapag Four Seasons Juice"]),
      menu("handaan-packages-15-hapag-pamilya-3", "Hapag Pamilya — Handaan", 8500, "Hapag Pamilya", ["Hapag Beef Bulalo", "Hapag Chicken Curry", "Hapag Camaron Rebosado"], ["Hapag Laing", "Hapag Bagoong Rice"], ["Hapag Turon", "Hapag Buko Juice"]),
      menu("handaan-packages-15-salu-salo-1", "Salu-Salo — Bayanihan", 9500, "Salu-Salo", ["Salu-Salo Beef Caldereta", "Salu-Salo Chicken Afritada", "Salu-Salo Sinigang na Hipon"], ["Salu-Salo Ginataang Gulay", "Salu-Salo Plain Rice"], ["Salu-Salo Buko Pandan", "Salu-Salo Sago't Gulaman"]),
      menu("handaan-packages-15-salu-salo-2", "Salu-Salo — Kapistahan", 10000, "Salu-Salo", ["Salu-Salo Beef Salpicao", "Salu-Salo Buttered Chicken", "Salu-Salo Garlic Butter Shrimp"], ["Salu-Salo Buttered Mixed Vegetables", "Salu-Salo Garlic Rice"], ["Salu-Salo Maja Blanca", "Salu-Salo Calamansi Juice"]),
      menu("handaan-packages-15-salu-salo-3", "Salu-Salo — Pagtitipon", 10500, "Salu-Salo", ["Salu-Salo Crispy Beef Tapa", "Salu-Salo Fried Chicken", "Salu-Salo Ginataang Alimasag"], ["Salu-Salo Dinengdeng", "Salu-Salo Java Rice"], ["Salu-Salo Sapin-Sapin", "Salu-Salo Blue Lemonade"]),
      menu("handaan-packages-15-salu-salo-4", "Salu-Salo — Handugan", 11000, "Salu-Salo", ["Salu-Salo Bistek Tagalog", "Salu-Salo Chicken Cordon Bleu", "Salu-Salo Escabeche"], ["Salu-Salo Ginisang Ampalaya", "Salu-Salo Bagoong Rice"], ["Salu-Salo Bibingka", "Salu-Salo Pink Lychee Juice"]),
      menu("handaan-packages-15-salu-salo-5", "Salu-Salo — Pagdiriwang", 11500, "Salu-Salo", ["Salu-Salo Beef Morcon", "Salu-Salo Chicken Teriyaki", "Salu-Salo Sweet and Sour Fish"], ["Salu-Salo Adobong Kangkong", "Salu-Salo Plain Rice"], ["Salu-Salo Cassava Cake", "Salu-Salo Melon Juice"]),
      menu("handaan-packages-15-marangyang-piging-1", "Marangyang Piging — Diwata", 12500, "Marangyang Piging", ["Piging Beef Nilaga", "Piging Salted Egg Chicken", "Piging Pinaputok na Tilapia"], ["Piging Lumpiang Gulay", "Piging Garlic Rice"], ["Piging Ube Halaya", "Piging Brewed Coffee"]),
    ],
  },
  {
    pax: 25,
    paxLabel: "25",
    menus: [
      menu("handaan-packages-25-hapag-pamilya-1", "Hapag Pamilya — Pista", 12000, "Hapag Pamilya", ["Hapag Beef Kare-Kare", "Hapag Chicken Inasal", "Hapag Grilled Bangus"], ["Hapag Pinakbet", "Hapag Garlic Rice"], ["Hapag Leche Flan", "Hapag Iced Tea"]),
      menu("handaan-packages-25-hapag-pamilya-2", "Hapag Pamilya — Kasalo", 12500, "Hapag Pamilya", ["Hapag Beef Mechado", "Hapag Chicken Adobo", "Hapag Kinilaw na Tanigue"], ["Hapag Chopsuey", "Hapag Java Rice"], ["Hapag Halo-Halo", "Hapag Four Seasons Juice"]),
      menu("handaan-packages-25-hapag-pamilya-3", "Hapag Pamilya — Handaan", 13000, "Hapag Pamilya", ["Hapag Beef Bulalo", "Hapag Chicken Curry", "Hapag Camaron Rebosado"], ["Hapag Laing", "Hapag Bagoong Rice"], ["Hapag Turon", "Hapag Buko Juice"]),
      menu("handaan-packages-25-salu-salo-6", "Salu-Salo — Ligaya", 14000, "Salu-Salo", ["Salu-Salo Beef Caldereta", "Salu-Salo Chicken Afritada", "Salu-Salo Sinigang na Hipon"], ["Salu-Salo Ginataang Gulay", "Salu-Salo Plain Rice"], ["Salu-Salo Buko Pandan", "Salu-Salo Sago't Gulaman"]),
      menu("handaan-packages-25-salu-salo-7", "Salu-Salo — Saya", 14500, "Salu-Salo", ["Salu-Salo Beef Salpicao", "Salu-Salo Buttered Chicken", "Salu-Salo Garlic Butter Shrimp"], ["Salu-Salo Buttered Mixed Vegetables", "Salu-Salo Garlic Rice"], ["Salu-Salo Maja Blanca", "Salu-Salo Calamansi Juice"]),
      menu("handaan-packages-25-salu-salo-8", "Salu-Salo — Alay", 15000, "Salu-Salo", ["Salu-Salo Crispy Beef Tapa", "Salu-Salo Fried Chicken", "Salu-Salo Ginataang Alimasag"], ["Salu-Salo Dinengdeng", "Salu-Salo Java Rice"], ["Salu-Salo Sapin-Sapin", "Salu-Salo Blue Lemonade"]),
      menu("handaan-packages-25-xxxl-handa-1", "Pista Grande 1", 16000, "Pista Grande", ["Grande Bistek Tagalog", "Grande Chicken Cordon Bleu", "Grande Escabeche"], ["Grande Ginisang Ampalaya", "Grande Bagoong Rice"], ["Grande Bibingka", "Grande Pink Lychee Juice"]),
      menu("handaan-packages-25-xxxl-handa-2", "Pista Grande 2", 17000, "Pista Grande", ["Grande Beef Morcon", "Grande Chicken Teriyaki", "Grande Sweet and Sour Fish"], ["Grande Adobong Kangkong", "Grande Plain Rice"], ["Grande Cassava Cake", "Grande Melon Juice"]),
      menu("handaan-packages-25-xxxl-handa-3", "Pista Grande 3", 18000, "Pista Grande", ["Grande Beef Nilaga", "Grande Salted Egg Chicken", "Grande Pinaputok na Tilapia"], ["Grande Lumpiang Gulay", "Grande Garlic Rice"], ["Grande Ube Halaya", "Grande Brewed Coffee"]),
      menu("handaan-packages-25-xxxl-handa-4", "Pista Grande 4", 19000, "Pista Grande", ["Grande Lengua Estofado", "Grande Chicken Pastel", "Grande Ginataang Hipon"], ["Grande Ginataang Kalabasa", "Grande Java Rice"], ["Grande Puto", "Grande Sago't Gulaman"]),
      menu("handaan-packages-25-xxxl-handa-5", "Pista Grande 5", 20000, "Pista Grande", ["Grande Beef Pares", "Grande Herb-Roasted Chicken", "Grande Buttered Shrimp"], ["Grande Chopsuey", "Grande Bagoong Rice"], ["Grande Leche Flan", "Grande Four Seasons Juice"]),
      menu("handaan-packages-25-marangyang-piging-1", "Marangyang Piging — Diwata", 22000, "Marangyang Piging", ["Piging Beef Ribs Kare-Kare", "Piging Chicken Galantina", "Piging Grilled Tuna Panga"], ["Piging Ginataang Gulay", "Piging Garlic Rice"], ["Piging Sans Rival", "Piging Brewed Coffee"]),
    ],
  },
  {
    pax: 45,
    paxLabel: "45",
    menus: [
      menu("handaan-packages-45-pista-grande-6", "Pista Grande 6", 23500, "Pista Grande", ["Grande Beef Bulalo", "Grande Chicken Curry", "Grande Sinigang na Hipon"], ["Grande Ginataang Gulay", "Grande Garlic Rice"], ["Grande Leche Flan", "Grande Iced Tea"]),
      menu("handaan-packages-45-pista-grande-7", "Pista Grande 7", 24000, "Pista Grande", ["Grande Crispy Beef Tapa", "Grande Buttered Chicken", "Grande Camaron Rebosado"], ["Grande Buttered Mixed Vegetables", "Grande Java Rice"], ["Grande Halo-Halo", "Grande Four Seasons Juice"]),
      menu("handaan-packages-45-pista-grande-8", "Pista Grande 8", 24500, "Pista Grande", ["Grande Beef Morcon", "Grande Fried Chicken", "Grande Ginataang Alimasag"], ["Grande Dinengdeng", "Grande Bagoong Rice"], ["Grande Turon", "Grande Buko Juice"]),
    ],
  },
  {
    pax: 70,
    paxLabel: "50-70",
    menus: [
      menu("handaan-packages-70-marangyang-piging-1", "Marangyang Piging — Diwata", 36000, "Marangyang Piging", ["Piging Beef Bulalo", "Piging Buttered Chicken", "Piging Ginataang Alimasag"], ["Piging Dinengdeng", "Piging Bagoong Rice"], ["Piging Buko Pandan", "Piging Sago't Gulaman"]),
      menu("handaan-packages-70-marangyang-piging-3", "Marangyang Piging — Ginhawa", 37500, "Marangyang Piging", ["Piging Beef Nilaga", "Piging Chicken Teriyaki", "Piging Camaron Rebosado"], ["Piging Adobong Kangkong", "Piging Java Rice"], ["Piging Sapin-Sapin", "Piging Blue Lemonade"]),
      menu("handaan-packages-70-marangyang-piging-2", "Marangyang Piging — Maharlika", 39000, "Marangyang Piging", ["Piging Crispy Beef Tapa", "Piging Fried Chicken", "Piging Grilled Bangus"], ["Piging Pinakbet", "Piging Garlic Rice"], ["Piging Maja Blanca", "Piging Calamansi Juice"]),
      menu("handaan-packages-70-marangyang-piging-4", "Marangyang Piging — Kapalaran", 40500, "Marangyang Piging", ["Piging Beef Morcon", "Piging Salted Egg Chicken", "Piging Sweet and Sour Fish"], ["Piging Lumpiang Gulay", "Piging Plain Rice"], ["Piging Cassava Cake", "Piging Melon Juice"]),
      menu("handaan-packages-70-marangyang-piging-5", "Marangyang Piging — Pagpapala", 42000, "Marangyang Piging", ["Piging Lengua Estofado", "Piging Herb-Roasted Chicken", "Piging Pinaputok na Tilapia"], ["Piging Ginisang Ampalaya", "Piging Bagoong Rice"], ["Piging Ube Halaya", "Piging Brewed Coffee"]),
      menu("handaan-packages-70-espesyal-na-pagsasama-1", "Espesyal na Pagsasama 1", 44000, "Espesyal na Pagsasama", ["Espesyal Beef Kare-Kare", "Espesyal Chicken Inasal", "Espesyal Grilled Bangus", "Espesyal Beef Caldereta"], ["Espesyal Pinakbet", "Espesyal Garlic Rice", "Espesyal Chopsuey"], ["Espesyal Leche Flan", "Espesyal Iced Tea"]),
      menu("handaan-packages-70-espesyal-na-pagsasama-2", "Espesyal na Pagsasama 2", 47000, "Espesyal na Pagsasama", ["Espesyal Beef Bulalo", "Espesyal Chicken Curry", "Espesyal Camaron Rebosado", "Espesyal Beef Salpicao"], ["Espesyal Buttered Mixed Vegetables", "Espesyal Java Rice", "Espesyal Dinengdeng"], ["Espesyal Halo-Halo", "Espesyal Four Seasons Juice"]),
    ],
  },
  {
    pax: 50,
    paxLabel: "50",
    menus: [
      menu("handaan-packages-50-hapag-pamilya-ani", "Hapag Pamilya — Ani", 21000, "Hapag Pamilya", ["Hapag Beef Kare-Kare", "Hapag Chicken Inasal", "Hapag Grilled Bangus"], ["Hapag Pinakbet", "Hapag Garlic Rice"], ["Hapag Leche Flan", "Hapag Iced Tea"]),
      menu("handaan-packages-50-hapag-pamilya-saya", "Hapag Pamilya — Saya", 22000, "Hapag Pamilya", ["Hapag Beef Mechado", "Hapag Chicken Adobo", "Hapag Sinigang na Hipon"], ["Hapag Ginataang Gulay", "Hapag Java Rice"], ["Hapag Halo-Halo", "Hapag Four Seasons Juice"]),
      menu("handaan-packages-50-hapag-pamilya-ligaya", "Hapag Pamilya — Ligaya", 23000, "Hapag Pamilya", ["Hapag Beef Bulalo", "Hapag Chicken Curry", "Hapag Camaron Rebosado"], ["Hapag Buttered Mixed Vegetables", "Hapag Bagoong Rice"], ["Hapag Turon", "Hapag Buko Juice"]),
      menu("handaan-packages-50-hapag-pamilya-kasiyahan", "Hapag Pamilya — Kasiyahan", 24000, "Hapag Pamilya", ["Hapag Beef Caldereta", "Hapag Buttered Chicken", "Hapag Garlic Butter Shrimp"], ["Hapag Laing", "Hapag Plain Rice"], ["Hapag Maja Blanca", "Hapag Calamansi Juice"]),
    ],
  },
  {
    pax: 100,
    paxLabel: "100",
    badge: "LIMITED TIME",
    menus: [
      menu("handaan-packages-100-hapag-pamilya-pagdiriwang", "Hapag Pamilya — Pagdiriwang", 35000, "Hapag Pamilya", ["Hapag Beef Kare-Kare", "Hapag Chicken Inasal", "Hapag Grilled Bangus"], ["Hapag Pinakbet", "Hapag Garlic Rice"], ["Hapag Leche Flan", "Hapag Four Seasons Juice"]),
      menu("handaan-packages-100-hapag-pamilya-marangya", "Hapag Pamilya — Marangya", 35000, "Hapag Pamilya", ["Hapag Beef Mechado", "Hapag Chicken Adobo", "Hapag Kinilaw na Tanigue"], ["Hapag Chopsuey", "Hapag Java Rice"], ["Hapag Halo-Halo", "Hapag Buko Juice"]),
      menu("handaan-packages-100-hapag-pamilya-base", "Hapag Pamilya", 35000, "Hapag Pamilya", ["Hapag Bistek Tagalog", "Hapag Chicken Curry", "Hapag Camaron Rebosado"], ["Hapag Buttered Mixed Vegetables", "Hapag Bagoong Rice"], ["Hapag Cassava Cake", "Hapag Iced Tea"]),
      menu("handaan-packages-100-hapag-pamilya-dakilang-handaan", "Hapag Pamilya — Dakilang Handaan", 35000, "Hapag Pamilya", ["Hapag Beef Bulalo", "Hapag Buttered Chicken", "Hapag Sinigang na Hipon"], ["Hapag Ginataang Gulay", "Hapag Plain Rice"], ["Hapag Maja Blanca", "Hapag Calamansi Juice"]),
      menu("handaan-packages-100-marangyang-piging-1", "Marangyang Piging — Diwata", 35000, "Marangyang Piging", ["Piging Beef Bulalo", "Piging Buttered Chicken", "Piging Grilled Bangus"], ["Piging Pinakbet", "Piging Garlic Rice"], ["Piging Leche Flan", "Piging Buko Juice"], "LIMITED TIME"),
    ],
  },
];

const HANDAAN_PACKAGE = {
  slug: "handaan-packages",
  name: "Handaan Packages",
  category: "Tray Orders",
  description: "Pre-composed Filipino set menus by guest count — pick your group size, choose a named combo, then add extra dishes if you like.",
  recommended: false,
  pax_tiers: HANDAAN_PAX_TIERS,
  inclusions: [
    "Buffet-style set menu, plated on request",
    "Serving utensils and chafing dishes",
    "Disposable plates and utensils",
    "Free delivery within city limits",
  ],
  add_ons: [
    "Add Food at checkout — extra dishes priced per size",
    "Rush order (within 24 hrs) — ₱1,000",
    "Additional serving staff — inquire for rate",
  ],
  price_per_head: null,
  minimum_head_count: null,
  tray_catalog: null,
  packed_meal_catalog: null,
  branch: null,
  active: true,
  dish_slots: [],
};

async function main() {
  const env = loadEnvLocal();
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: baseData, error: baseError } = await supabase
    .from("packages")
    .upsert(BASE_PACKAGES, { onConflict: "slug", ignoreDuplicates: true })
    .select("slug");
  if (baseError) throw new Error(`Failed to seed base packages: ${baseError.message}`);
  console.log(`Base packages: ${BASE_PACKAGES.length} defined, ${(baseData ?? []).length} newly inserted (existing slugs left untouched).`);

  const { data: partyTrays, error: partyTraysError } = await supabase
    .from("packages")
    .select("tray_catalog")
    .eq("slug", "party-trays")
    .single();
  if (partyTraysError) throw new Error(`Failed to load party-trays' tray_catalog for Handaan's add-on catalog: ${partyTraysError.message}`);

  const handaanRow = { ...HANDAAN_PACKAGE, add_on_catalog: (partyTrays as { tray_catalog: unknown }).tray_catalog };
  const { error: handaanError } = await supabase.from("packages").upsert(handaanRow, { onConflict: "slug" });
  if (handaanError) {
    if (/column .*add_on_catalog.* does not exist/i.test(handaanError.message)) {
      console.error(
        'Handaan Packages needs an "add_on_catalog" column that doesn\'t exist yet on public.packages.\n' +
          "Run this once in the Supabase SQL Editor, then re-run this script:\n\n" +
          "  alter table public.packages add column if not exists add_on_catalog jsonb;\n"
      );
      process.exit(1);
    }
    throw new Error(`Failed to seed Handaan Packages: ${handaanError.message}`);
  }
  console.log(`Handaan Packages: seeded with ${HANDAAN_PAX_TIERS.length} pax tiers.`);

  const { count, error: countError } = await supabase.from("packages").select("id", { count: "exact", head: true });
  if (countError) throw new Error(`Failed to count packages: ${countError.message}`);
  console.log(`public.packages now has ${count} row(s) total.`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
