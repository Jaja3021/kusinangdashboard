// Server-side data orchestration for one change request's review panel.
// Fetches everything lib/change-requests/impact.ts's pure functions need,
// then composes them — kept separate from impact.ts so that file stays
// Supabase-free and independently testable.

import { getChangeRequestById } from "./data";
import { getOrderWithMenuById, getOrdersInRange } from "@/lib/orders/data";
import { getRecipesWithItems } from "@/lib/costing/data";
import { getIngredientsWithStock } from "@/lib/inventory/data";
import { getReservationsByIngredient } from "@/lib/inventory/reservations-data";
import { getCalendarCapacity } from "@/lib/calendar/data";
import { getBlockedDates } from "@/lib/bookings/blocked-dates";
import { getPaymentsForOrder } from "@/lib/payments/data";
import { diffPayloads, diffTrayCart, diffPackedMealCart, diffSelectedDishes, detectDrift } from "./diff";
import {
  computeInventoryImpact,
  computeCapacityImpact,
  computeStaffImpact,
  computeFinancialImpact,
  foodCostOf,
  assembleWarnings,
  type ChangeRequestImpact,
} from "./impact";
import type { ChangeRequestPayload } from "./types";
import { computeIngredientRequirements } from "@/lib/requirements/calc";
import type { OrderDishSource } from "@/lib/requirements/types";

function orderDishSourceFor(order: { pax: number | null; cart: unknown; packedMealCart: unknown; selectedDishes: unknown }, payload: ChangeRequestPayload): OrderDishSource {
  return {
    pax: "pax" in payload ? (payload.pax ?? null) : order.pax,
    cart: "cart" in payload ? (payload.cart ?? []) : ((order.cart as OrderDishSource["cart"]) ?? []),
    packedMealCart: "packedMealCart" in payload ? (payload.packedMealCart ?? []) : ((order.packedMealCart as OrderDishSource["packedMealCart"]) ?? []),
    selectedDishes: "selectedDishes" in payload ? (payload.selectedDishes ?? {}) : ((order.selectedDishes as OrderDishSource["selectedDishes"]) ?? {}),
  };
}

export async function buildChangeRequestImpact(id: string): Promise<ChangeRequestImpact> {
  const record = await getChangeRequestById(id);
  if (!record) throw new Error("Change request not found.");

  const order = await getOrderWithMenuById(record.orderId);
  if (!order) throw new Error("The order this request was filed against no longer exists.");

  const [recipes, ingredients, reservations, capacities, blockedDates, sameDayOrders, payments] = await Promise.all([
    getRecipesWithItems(),
    getIngredientsWithStock(),
    getReservationsByIngredient(),
    getCalendarCapacity(),
    getBlockedDates(),
    order.eventDate ? getOrdersInRange(order.eventDate, order.eventDate) : Promise.resolve([]),
    getPaymentsForOrder(order.id),
  ]);

  const liveAsPayload: ChangeRequestPayload = {
    pax: order.pax,
    servers: order.servers,
    packageName: order.packageName,
    menuName: order.menuName,
    quantityLabel: order.quantityLabel,
    cart: order.cart as ChangeRequestPayload["cart"],
    packedMealCart: order.packedMealCart as ChangeRequestPayload["packedMealCart"],
    selectedDishes: order.selectedDishes as ChangeRequestPayload["selectedDishes"],
    subtotal: order.subtotal,
    deliveryFee: order.deliveryFee,
    rushFee: order.rushFee,
  };

  const fields = diffPayloads(record.originalData, record.requestedData, liveAsPayload);
  const dishes = {
    tray: diffTrayCart(record.originalData, record.requestedData, liveAsPayload),
    packed: diffPackedMealCart(record.originalData, record.requestedData, liveAsPayload),
    categories: diffSelectedDishes(record.originalData, record.requestedData, liveAsPayload),
  };

  const staff = computeStaffImpact(order, record.requestedData);

  const inventory = computeInventoryImpact({
    orderId: order.id,
    orderNumber: order.orderNumber,
    eventDate: order.eventDate,
    order,
    original: record.originalData,
    requested: record.requestedData,
    recipes,
    ingredients,
    reservations,
  });

  const capacity = computeCapacityImpact({
    order: { id: order.id, eventDate: order.eventDate, branch: order.branch, status: order.status, pax: order.pax },
    requestedPax: "pax" in record.requestedData ? (record.requestedData.pax ?? null) : order.pax,
    sameDayOrders,
    capacities,
    blockedDates,
  });

  const unitCostById = new Map(ingredients.map((i) => [i.id, i.unitCost]));
  const beforeSource = orderDishSourceFor(order, record.originalData);
  const afterSource = orderDishSourceFor(order, record.requestedData);
  const beforeReq = computeIngredientRequirements(
    [{ id: order.id, orderNumber: order.orderNumber, eventDate: order.eventDate, ...beforeSource }],
    recipes,
  ).requirements;
  const afterReq = computeIngredientRequirements(
    [{ id: order.id, orderNumber: order.orderNumber, eventDate: order.eventDate, ...afterSource }],
    recipes,
  ).requirements;

  const financial = computeFinancialImpact({
    record,
    order,
    foodCostBefore: foodCostOf(beforeReq, unitCostById),
    foodCostAfter: foodCostOf(afterReq, unitCostById),
    payments,
  });

  const drift = detectDrift(record, order);
  const warnings = assembleWarnings({ record, order, capacity, inventory, financial });

  return { fields, dishes, staff, inventory, capacity, financial, drift, warnings };
}
