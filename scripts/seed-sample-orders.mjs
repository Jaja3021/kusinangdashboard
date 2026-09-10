// One-off seed: inserts a handful of clean, well-formed sample orders dated
// today, each referencing a real package from public.packages (the same
// catalog scripts/seed-menu-packages.ts ported in from the herbies project).
// Purpose: give Kitchen Today / Kitchen Board / Market List something real
// and readable to render, instead of the "test 1"/"test 2" placeholder rows
// already in the table (left untouched — see check-data.mjs).
//
// Usage: node scripts/seed-sample-orders.mjs

import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

function loadEnvLocal() {
  const text = readFileSync(new URL("../.env.local", import.meta.url), "utf-8");
  const env = {};
  for (const line of text.split("\n")) {
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (match) env[match[1]] = match[2];
  }
  return env;
}

const env = loadEnvLocal();
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const TODAY = "2026-09-08";

function orderNumber(seq) {
  const hex = Math.floor(Math.random() * 0xffff).toString(16).toUpperCase().padStart(4, "0");
  return `KP-2026-${20080 + seq}-${hex}`;
}

const ORDERS = [
  // 1. Party Trays — build-your-own tray cart, resolved against party-trays'
  // real trayCatalog (see scripts/seed-menu-packages.ts).
  {
    package_slug: "party-trays",
    package_name: "Party Trays",
    menu_id: "party-trays-cart",
    menu_name: "Your Custom Order",
    pax: 25,
    quantity_label: "25 pax",
    event_type: "Birthday Party",
    event_time: "10:30 AM",
    branch: "cavite",
    delivery_method: "pickup",
    first_name: "Ramon",
    last_name: "Villanueva",
    email: "ramon.villanueva@example.com",
    phone: "09171234501",
    address: null,
    instructions: "Please pack rice separately from the ulam trays.",
    cart: [
      { dishId: "beef-kare-kare", size: "XXXL", qty: 1 },
      { dishId: "chicken-inasal", size: "XXXL", qty: 1 },
      { dishId: "baked-mac", size: "XXXL", qty: 1 },
      { dishId: "garlic-rice", size: "XXXL", qty: 2 },
      { dishId: "halo-halo", size: "XXXL", qty: 1 },
    ],
    packed_meal_cart: [],
    selected_dishes: {},
    menu_snapshot: {
      id: "party-trays-cart",
      name: "Your Custom Order",
      mains: [
        "Beef Kare-Kare — XXXL ×1 (PHP 9,500)",
        "Chicken Inasal — XXXL ×1 (PHP 7,200)",
        "Baked Mac — XXXL ×1 (PHP 6,800)",
        "Garlic Rice — XXXL ×2 (PHP 9,000)",
        "Halo-Halo — XXXL ×1 (PHP 6,000)",
      ],
      sides: [],
      snacks: [],
    },
    subtotal: 38500,
    delivery_fee: 0,
    rush_fee: 0,
    total: 38500,
    status: "Confirmed",
    payment_status: "Deposit Paid",
    deposit_amount: 19250,
    amount_paid: 19250,
  },
  // 2. Packed Meals — priced per piece, two dish lines.
  {
    package_slug: "packed-meals",
    package_name: "Packed Meals",
    menu_id: "packed-meals-cart",
    menu_name: "Your Custom Order",
    pax: 50,
    quantity_label: "50 pcs",
    event_type: "Corporate Event",
    event_time: "12:00 PM",
    branch: "laguna",
    delivery_method: "delivery",
    first_name: "Ligaya",
    last_name: "Santos",
    email: "ligaya.santos@example.com",
    phone: "09182345612",
    address: "Unit 4B, Vista Mall, Sta. Rosa, Laguna",
    instructions: "Deliver to the receiving dock, ask for Ms. Santos.",
    cart: [],
    packed_meal_cart: [
      { category: "Rice Meals", dish: "Chicken Inasal Rice", qty: 50, pricePerPc: 285 },
      { category: "Salad / Noodles", dish: "Pancit Palabok", qty: 50, pricePerPc: 400 },
    ],
    selected_dishes: {},
    menu_snapshot: {
      id: "packed-meals-cart",
      name: "Your Custom Order",
      mains: ["Chicken Inasal Rice — 50 pcs (PHP 14,250)", "Pancit Palabok — 50 pcs (PHP 20,000)"],
      sides: [],
      snacks: [],
    },
    subtotal: 34250,
    delivery_fee: 800,
    rush_fee: 0,
    total: 35050,
    status: "Preparing",
    payment_status: "Paid",
    deposit_amount: 17525,
    amount_paid: 35050,
  },
  // 3. Grazing Table — fixed "Full Spread" menu at the 100-pax tier.
  {
    package_slug: "grazing-table",
    package_name: "Grazing Table",
    menu_id: "grazing-table-100",
    menu_name: "Full Spread",
    pax: 100,
    quantity_label: "100-150",
    event_type: "Debut Package",
    event_time: "2:00 PM",
    branch: "metro-manila",
    delivery_method: "pickup",
    first_name: "Katrina",
    last_name: "Reyes",
    email: "katrina.reyes@example.com",
    phone: "09193456723",
    address: null,
    instructions: null,
    cart: [],
    packed_meal_cart: [],
    selected_dishes: {},
    menu_snapshot: {
      id: "grazing-table-100",
      name: "Full Spread",
      group: "Grazing",
      mains: ["Embutido Bites", "Morcon Slices", "Cheesy Lumpia", "Korean-Style Fried Chicken Bites", "Beef Nachos Bites", "Salted Egg Chicken Wings"],
      sides: ["Buttered Corn", "Chicken Macaroni Salad", "Fresh Fruit Platter"],
      snacks: ["Puto", "Kutsinta", "Mini Empanada"],
      price: 20000,
    },
    subtotal: 20000,
    delivery_fee: 0,
    rush_fee: 0,
    total: 20000,
    status: "Confirmed",
    payment_status: "Partially Paid",
    deposit_amount: 10000,
    amount_paid: 12000,
  },
  // 4. Basic Catering Package — head-count priced, no menu variant.
  {
    package_slug: "basic-catering",
    package_name: "Basic Catering Package",
    menu_id: null,
    menu_name: null,
    pax: 60,
    quantity_label: "60 pax",
    event_type: "Wedding Package",
    event_time: "5:00 PM",
    branch: "cavite",
    delivery_method: "delivery",
    first_name: "Herbert",
    last_name: "Cruz",
    email: "herbert.cruz@example.com",
    phone: "09204567834",
    address: "Barangay Covered Court, Imus, Cavite",
    instructions: "Setup by 3:30 PM, program starts at 5.",
    cart: [],
    packed_meal_cart: [],
    selected_dishes: {},
    menu_snapshot: {
      mains: ["Pork Menudo", "Beef Mechado", "Sweet & Sour Fish Fillet", "Chicken Curry", "Pork Sinigang", "Chicken Afritada"],
      sides: ["Steamed Garlic Rice", "Pancit Bihon", "Ensaladang Mangga"],
      snacks: ["Pandesal Rolls", "Soft Drinks", "Sago't Gulaman"],
    },
    subtotal: 57000,
    delivery_fee: 3000,
    rush_fee: 0,
    total: 60000,
    status: "Cooking",
    payment_status: "Deposit Paid",
    deposit_amount: 30000,
    amount_paid: 30000,
  },
  // 5. Handaan Packages — named combo at the 25-pax tier.
  {
    package_slug: "handaan-packages",
    package_name: "Handaan Packages",
    menu_id: "handaan-packages-25-hapag-pamilya-1",
    menu_name: "Hapag Pamilya — Pista",
    pax: 25,
    quantity_label: "25",
    event_type: "Fiesta",
    event_time: "6:30 PM",
    branch: "laguna",
    delivery_method: "pickup",
    first_name: "Marites",
    last_name: "Ocampo",
    email: "marites.ocampo@example.com",
    phone: "09215678945",
    address: null,
    instructions: null,
    cart: [],
    packed_meal_cart: [],
    selected_dishes: {},
    menu_snapshot: {
      id: "handaan-packages-25-hapag-pamilya-1",
      name: "Hapag Pamilya — Pista",
      group: "Hapag Pamilya",
      mains: ["Hapag Beef Kare-Kare", "Hapag Chicken Inasal", "Hapag Grilled Bangus"],
      sides: ["Hapag Pinakbet", "Hapag Garlic Rice"],
      snacks: ["Hapag Leche Flan", "Hapag Iced Tea"],
      price: 12000,
    },
    subtotal: 12000,
    delivery_fee: 0,
    rush_fee: 0,
    total: 12000,
    status: "Confirmed",
    payment_status: "Unpaid",
    deposit_amount: 6000,
    amount_paid: 0,
  },
];

async function main() {
  const rows = ORDERS.map((o, i) => ({
    order_number: orderNumber(i + 1),
    status: o.status,
    package_slug: o.package_slug,
    package_name: o.package_name,
    menu_id: o.menu_id,
    menu_name: o.menu_name,
    menu_snapshot: o.menu_snapshot,
    pax: o.pax,
    quantity_label: o.quantity_label,
    cart: o.cart,
    packed_meal_cart: o.packed_meal_cart,
    selected_dishes: o.selected_dishes,
    event_type: o.event_type,
    event_date: TODAY,
    event_time: o.event_time,
    venue: null,
    instructions: o.instructions,
    branch: o.branch,
    delivery_method: o.delivery_method,
    first_name: o.first_name,
    last_name: o.last_name,
    email: o.email,
    phone: o.phone,
    address: o.address,
    subtotal: o.subtotal,
    delivery_fee: o.delivery_fee,
    total: o.total,
    deposit_amount: o.deposit_amount,
    amount_paid: o.amount_paid,
    payment_status: o.payment_status,
    rush_fee: o.rush_fee,
    servers: null,
    batch_id: null,
  }));

  const { data, error } = await supabase.from("orders").insert(rows).select("id, order_number, package_name, first_name, last_name");
  if (error) throw new Error(`Failed to insert sample orders: ${error.message}`);
  console.log(`Inserted ${data.length} sample orders for ${TODAY}:`);
  for (const row of data) console.log(`  ${row.order_number} — ${row.first_name} ${row.last_name} — ${row.package_name}`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
