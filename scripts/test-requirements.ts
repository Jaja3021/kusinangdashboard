// Exercises lib/requirements/calc.ts against the brief's own worked
// examples (Test 1, 2, 5, 6 from the "TEST CASES" section) plus the shortage
// formula. No test runner is configured in this repo (no vitest/jest in
// package.json) — this follows the same "run it with tsx" convention as the
// other scripts/*.ts one-offs, asserting with a plain helper and a nonzero
// exit code on failure so it's CI-usable without adding a new dependency.
//
// Usage: npx tsx scripts/test-requirements.ts

import { computeIngredientRequirements, computeShortages, resolveOrderDishes, stockStatus } from "../lib/requirements/calc";
import type { RecipeWithItems } from "../lib/costing/types";
import type { OrderDishSource } from "../lib/requirements/types";

let failures = 0;
function assertEqual(actual: unknown, expected: unknown, label: string) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`${ok ? "PASS" : "FAIL"} — ${label}${ok ? "" : `\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`}`);
  if (!ok) failures++;
}
function assertClose(actual: number, expected: number, label: string, epsilon = 1e-9) {
  const ok = Math.abs(actual - expected) < epsilon;
  console.log(`${ok ? "PASS" : "FAIL"} — ${label} (actual: ${actual}, expected: ${expected})`);
  if (!ok) failures++;
}

// Mirrors the seed's Chicken Inasal (catering, per_pax): 100g chicken, 20g
// marinade, 10ml oil per pax — exactly the brief's worked example.
const chickenInasal: RecipeWithItems = {
  id: "recipe-chicken-inasal",
  name: "Chicken Inasal",
  size: "",
  category: "Chicken",
  srp: 220,
  laborCost: 18,
  overheadCost: 10,
  dishKey: "chicken-inasal",
  basis: "per_pax",
  yieldQty: 1,
  items: [
    { id: "i1", recipeId: "recipe-chicken-inasal", ingredientId: "ing-chicken", ingredientName: "Chicken", unit: "kg", qty: 0.1, unitCost: 220 },
    { id: "i2", recipeId: "recipe-chicken-inasal", ingredientId: "ing-marinade", ingredientName: "Marinade", unit: "kg", qty: 0.02, unitCost: 180 },
    { id: "i3", recipeId: "recipe-chicken-inasal", ingredientId: "ing-oil", ingredientName: "Cooking Oil", unit: "L", qty: 0.01, unitCost: 96 },
  ],
};

function order(overrides: Partial<OrderDishSource> & { id: string; orderNumber: string; eventDate?: string | null }) {
  return {
    pax: null,
    cart: [],
    packedMealCart: [],
    selectedDishes: {},
    eventDate: null,
    ...overrides,
  };
}

// --- Test 1: 100 PAX Chicken Inasal --------------------------------------
{
  const eventA = order({ id: "order-a", orderNumber: "KP-A", pax: 100, selectedDishes: { Chicken: "Chicken Inasal" } });
  const { requirements, unmapped } = computeIngredientRequirements([eventA], [chickenInasal]);
  const chicken = requirements.find((r) => r.ingredientId === "ing-chicken");
  assertClose(chicken?.requiredQty ?? -1, 10, "Test 1 — 100 PAX Chicken Inasal needs 10kg chicken");
  assertEqual(unmapped.length, 0, "Test 1 — no unmapped dishes");
}

// --- Test 2: PAX change 100 -> 150 recalculates requirements -------------
{
  const at100 = resolveOrderDishes({ pax: 100, cart: [], packedMealCart: [], selectedDishes: { Chicken: "Chicken Inasal" } }, [chickenInasal]);
  const at150 = resolveOrderDishes({ pax: 150, cart: [], packedMealCart: [], selectedDishes: { Chicken: "Chicken Inasal" } }, [chickenInasal]);
  assertEqual(at100[0].quantity, 100, "Test 2 — resolved quantity at 100 PAX");
  assertEqual(at150[0].quantity, 150, "Test 2 — resolved quantity at 150 PAX");
  const req100 = computeIngredientRequirements([order({ id: "o", orderNumber: "KP-O", pax: 100, selectedDishes: { Chicken: "Chicken Inasal" } })], [chickenInasal]);
  const req150 = computeIngredientRequirements([order({ id: "o", orderNumber: "KP-O", pax: 150, selectedDishes: { Chicken: "Chicken Inasal" } })], [chickenInasal]);
  assertClose(req100.requirements[0].requiredQty, 10, "Test 2 — 100 PAX = 10kg");
  assertClose(req150.requirements[0].requiredQty, 15, "Test 2 — 150 PAX = 15kg");
}

// --- Test 5 / brief's shortage worked example: 15kg needed, 12kg on hand -
{
  const eventA = order({ id: "order-a", orderNumber: "KP-A", pax: 150, selectedDishes: { Chicken: "Chicken Inasal" } });
  const { requirements } = computeIngredientRequirements([eventA], [chickenInasal]);
  const stockByIngredient = new Map([["ing-chicken", { ingredientId: "ing-chicken", physicalStock: 12, reservedStock: 0 }]]);
  const shortages = computeShortages(requirements, stockByIngredient);
  const chicken = shortages.find((r) => r.ingredientId === "ing-chicken")!;
  assertClose(chicken.requiredQty, 15, "Test 5 — required 15kg");
  assertClose(chicken.availableStock, 12, "Test 5 — available 12kg");
  assertClose(chicken.shortageQty, 3, "Test 5 — shortage 3kg");
  assertEqual(stockStatus({ availableStock: chicken.availableStock, shortageQty: chicken.shortageQty, reorderLevel: 25 }), "insufficient", "Test 5 — status insufficient");
}

// --- Test 6: two events requiring the same ingredient are combined -------
{
  const eventA = order({ id: "order-a", orderNumber: "KP-A", pax: 100, eventDate: "2026-08-30", selectedDishes: { Chicken: "Chicken Inasal" } });
  const eventB = order({ id: "order-b", orderNumber: "KP-B", pax: 80, eventDate: "2026-08-30", selectedDishes: { Chicken: "Chicken Inasal" } });
  const { requirements } = computeIngredientRequirements([eventA, eventB], [chickenInasal]);
  const chicken = requirements.find((r) => r.ingredientId === "ing-chicken")!;
  assertClose(chicken.requiredQty, 18, "Test 6 — combined requirement (10kg + 8kg = 18kg), not two separate purchases");
  assertEqual(chicken.sources.length, 2, "Test 6 — both orders tracked as sources for the 'why' breakdown");
}

// --- Reservation-aware shortage: physical stock minus already-reserved ---
{
  const eventC = order({ id: "order-c", orderNumber: "KP-C", pax: 100, selectedDishes: { Chicken: "Chicken Inasal" } });
  const { requirements } = computeIngredientRequirements([eventC], [chickenInasal]);
  // 20kg physical, 12kg already reserved by other confirmed events -> 8kg available.
  const stockByIngredient = new Map([["ing-chicken", { ingredientId: "ing-chicken", physicalStock: 20, reservedStock: 12 }]]);
  const shortages = computeShortages(requirements, stockByIngredient);
  const chicken = shortages.find((r) => r.ingredientId === "ing-chicken")!;
  assertClose(chicken.availableStock, 8, "Reservation-aware — available = physical - reserved = 8kg");
  assertClose(chicken.shortageQty, 2, "Reservation-aware — shortage = 10kg required - 8kg available = 2kg");
}

// --- Unmapped dish surfaces as a gap, never a silent zero -----------------
{
  const eventD = order({ id: "order-d", orderNumber: "KP-D", pax: 50, selectedDishes: { Dessert: "Some Untracked Dessert" } });
  const { requirements, unmapped } = computeIngredientRequirements([eventD], [chickenInasal]);
  assertEqual(requirements.length, 0, "Unmapped dish — contributes no (silently wrong) ingredient requirement");
  assertEqual(unmapped.length, 1, "Unmapped dish — surfaced as a gap");
  assertEqual(unmapped[0].dishKey, "some-untracked-dessert", "Unmapped dish — key matches dishKey() normalization");
}

console.log(failures === 0 ? "\nAll requirements-engine checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
