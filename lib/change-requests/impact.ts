// Pure impact computation for a change request — no Supabase, no React.
// Composes lib/requirements/calc.ts and lib/calendar/calc.ts rather than
// reinventing shortage/capacity math; see supabase server-side orchestrator
// lib/change-requests/impact-data.ts for the data fetching this needs.

import { computeIngredientRequirements, computeShortages, stockStatus, type StockStatus } from "@/lib/requirements/calc";
import type { IngredientRequirement, OrderDishSource, UnmappedDish } from "@/lib/requirements/types";
import { buildCalendarDays, classifyDay, ceilingFor } from "@/lib/calendar/calc";
import { countsTowardCapacity } from "@/lib/calendar/types";
import type { CalendarCapacity, DayStatus } from "@/lib/calendar/types";
import type { BlockedDate } from "@/lib/bookings/blocked-dates";
import type { OrderRecord, OrderStatus } from "@/lib/orders/types";
import type { IngredientWithStock } from "@/lib/inventory/types";
import type { IngredientReservations } from "@/lib/inventory/reservations-data";
import type { RecipeWithItems } from "@/lib/costing/types";
import { balanceDue, derivePaymentStatus, type OrderPaymentStatus, type PaymentRecord } from "@/lib/payments/types";
import type { ChangeRequestPayload, ChangeRequestRecord } from "./types";
import { diffPayloads, diffTrayCart, diffPackedMealCart, diffSelectedDishes, detectDrift, type FieldDiff, type DishLineDiff, type CategoryDiff, type DriftField } from "./diff";
import type { OrderWithMenu } from "@/lib/orders/data";

// ---------------------------------------------------------------------
// Inventory impact
// ---------------------------------------------------------------------

export type InventoryImpactRow = {
  ingredientId: string;
  ingredientName: string;
  baseUnit: string;
  unitCost: number;
  requiredBefore: number;
  requiredAfter: number;
  deltaQty: number;
  physicalStock: number;
  reservedByOthers: number;
  availableToThisOrder: number;
  shortageBefore: number;
  shortageAfter: number;
  statusBefore: StockStatus;
  statusAfter: StockStatus;
  isNewShortage: boolean;
  isWorsened: boolean;
};

export type InventoryImpact = {
  rows: InventoryImpactRow[];
  unmappedBefore: UnmappedDish[];
  unmappedAfter: UnmappedDish[];
  newShortageCount: number;
  worsenedCount: number;
  /** Σ max(0, delta) × unitCost — the extra food cost this change would add,
   * ignoring any quantity it frees up. */
  addedCost: number;
};

function buildOrderDishSource(live: OrderWithMenu, payload: ChangeRequestPayload): OrderDishSource {
  return {
    pax: "pax" in payload ? (payload.pax ?? null) : live.pax,
    cart: "cart" in payload ? (payload.cart ?? []) : (live.cart as OrderDishSource["cart"]) ?? [],
    packedMealCart: "packedMealCart" in payload ? (payload.packedMealCart ?? []) : (live.packedMealCart as OrderDishSource["packedMealCart"]) ?? [],
    selectedDishes: "selectedDishes" in payload ? (payload.selectedDishes ?? {}) : (live.selectedDishes as OrderDishSource["selectedDishes"]) ?? {},
  };
}

export function computeInventoryImpact(input: {
  orderId: string;
  orderNumber: string;
  eventDate: string | null;
  order: OrderWithMenu;
  original: ChangeRequestPayload;
  requested: ChangeRequestPayload;
  recipes: RecipeWithItems[];
  ingredients: IngredientWithStock[];
  reservations: Map<string, IngredientReservations>;
  /** Unused in Phase 1 (stock/reservations are summed all-branch, matching
   * lib/purchasing/data.ts) — plumbed through so per-branch is a two-line
   * change later. */
  branch?: string | null;
}): InventoryImpact {
  const beforeSource = buildOrderDishSource(input.order, input.original);
  const afterSource = buildOrderDishSource(input.order, input.requested);

  const beforeResult = computeIngredientRequirements(
    [{ id: input.orderId, orderNumber: input.orderNumber, eventDate: input.eventDate, ...beforeSource }],
    input.recipes,
  );
  const afterResult = computeIngredientRequirements(
    [{ id: input.orderId, orderNumber: input.orderNumber, eventDate: input.eventDate, ...afterSource }],
    input.recipes,
  );

  const ingredientById = new Map(input.ingredients.map((i) => [i.id, i]));

  // Own-reservation add-back: this order's own current hold is already
  // inside reservedStock. Subtract it out of `reserved`, never add it to
  // `physical` — computeShortages floors availableStock at zero assuming it
  // can never exceed physical stock, so the map must already reflect that.
  const stockByIngredient = new Map<string, { ingredientId: string; physicalStock: number; reservedStock: number }>();
  for (const ing of input.ingredients) {
    const res = input.reservations.get(ing.id);
    const own = (res?.sources ?? []).filter((s) => s.orderId === input.orderId).reduce((sum, s) => sum + s.qty, 0);
    const reservedByOthers = Math.max(0, (res?.totalReserved ?? 0) - own);
    stockByIngredient.set(ing.id, { ingredientId: ing.id, physicalStock: ing.totalStock, reservedStock: reservedByOthers });
  }

  const beforeShortages = new Map(computeShortages(beforeResult.requirements, stockByIngredient).map((r) => [r.ingredientId, r]));
  const afterShortages = new Map(computeShortages(afterResult.requirements, stockByIngredient).map((r) => [r.ingredientId, r]));

  const beforeReqById = new Map(beforeResult.requirements.map((r) => [r.ingredientId, r]));
  const afterReqById = new Map(afterResult.requirements.map((r) => [r.ingredientId, r]));

  const allIds = new Set([...beforeReqById.keys(), ...afterReqById.keys()]);

  const rows: InventoryImpactRow[] = [];
  let newShortageCount = 0;
  let worsenedCount = 0;
  let addedCost = 0;

  for (const id of allIds) {
    const ing = ingredientById.get(id);
    if (!ing) continue;

    const requiredBefore = beforeReqById.get(id)?.requiredQty ?? 0;
    const requiredAfter = afterReqById.get(id)?.requiredQty ?? 0;
    const deltaQty = requiredAfter - requiredBefore;

    const beforeShortage = beforeShortages.get(id);
    const afterShortage = afterShortages.get(id);
    const shortageBefore = beforeShortage?.shortageQty ?? 0;
    const shortageAfter = afterShortage?.shortageQty ?? Math.max(0, requiredAfter - (stockByIngredient.get(id)?.physicalStock ?? 0));

    const statusBefore = stockStatus({ availableStock: beforeShortage?.availableStock ?? ing.totalStock, shortageQty: shortageBefore, reorderLevel: ing.reorderLevel });
    const statusAfter = stockStatus({ availableStock: afterShortage?.availableStock ?? ing.totalStock, shortageQty: shortageAfter, reorderLevel: ing.reorderLevel });

    const isNewShortage = shortageBefore <= 0 && shortageAfter > 0;
    const isWorsened = shortageAfter > shortageBefore;
    if (isNewShortage) newShortageCount += 1;
    if (isWorsened) worsenedCount += 1;
    if (deltaQty > 0) addedCost += deltaQty * ing.unitCost;

    rows.push({
      ingredientId: id,
      ingredientName: ing.name,
      baseUnit: ing.baseUnit,
      unitCost: ing.unitCost,
      requiredBefore,
      requiredAfter,
      deltaQty,
      physicalStock: ing.totalStock,
      reservedByOthers: stockByIngredient.get(id)?.reservedStock ?? 0,
      availableToThisOrder: afterShortage?.availableStock ?? beforeShortage?.availableStock ?? ing.totalStock,
      shortageBefore,
      shortageAfter,
      statusBefore,
      statusAfter,
      isNewShortage,
      isWorsened,
    });
  }

  rows.sort((a, b) => {
    if (a.isNewShortage !== b.isNewShortage) return a.isNewShortage ? -1 : 1;
    return Math.abs(b.deltaQty) - Math.abs(a.deltaQty);
  });

  return {
    rows,
    unmappedBefore: beforeResult.unmapped,
    unmappedAfter: afterResult.unmapped,
    newShortageCount,
    worsenedCount,
    addedCost,
  };
}

/** Σ requiredQty × ingredient.unitCost — mirrors lib/purchasing/data.ts's
 * estimatedCost formula exactly, so this dashboard never shows two
 * disagreeing "food cost" numbers for the same requirement set. Deliberately
 * NOT lib/costing/types.ts's cogs() — that's per-recipe-batch, not
 * per-order. */
export function foodCostOf(requirements: IngredientRequirement[], unitCostById: Map<string, number>): number {
  return requirements.reduce((sum, r) => sum + r.requiredQty * (unitCostById.get(r.ingredientId) ?? 0), 0);
}

// ---------------------------------------------------------------------
// Kitchen capacity impact
// ---------------------------------------------------------------------

export type CapacityImpact = {
  known: boolean;
  date: string | null;
  branch: string | null;
  eventCount: number;
  totalPaxBefore: number;
  totalPaxAfter: number;
  maxEvents: number;
  maxPax: number;
  statusBefore: DayStatus;
  statusAfter: DayStatus;
  paxUtilBefore: number;
  paxUtilAfter: number;
  worsened: boolean;
  sameDayOrders: { id: string; orderNumber: string; pax: number | null; status: OrderStatus }[];
};

export function computeCapacityImpact(input: {
  order: { id: string; eventDate: string | null; branch: string | null; status: OrderStatus; pax: number | null };
  requestedPax: number | null;
  sameDayOrders: OrderRecord[];
  capacities: CalendarCapacity[];
  blockedDates: BlockedDate[];
}): CapacityImpact {
  const { order, requestedPax, capacities, blockedDates } = input;

  if (!order.eventDate) {
    return {
      known: false, date: null, branch: order.branch, eventCount: 0,
      totalPaxBefore: 0, totalPaxAfter: 0, maxEvents: 0, maxPax: 0,
      statusBefore: "available", statusAfter: "available",
      paxUtilBefore: 0, paxUtilAfter: 0, worsened: false, sameDayOrders: [],
    };
  }

  const scopedOrders = order.branch ? input.sameDayOrders.filter((o) => o.branch === order.branch) : input.sameDayOrders;

  const days = buildCalendarDays({
    dates: [order.eventDate],
    orders: scopedOrders,
    blockedDates,
    capacities,
    branchId: order.branch,
  });
  const day = days.get(order.eventDate)!;

  // This order is already counted inside day.totalPax — subtract its
  // current contribution before adding the requested one, or the order
  // gets counted against itself.
  const thisOrderCounts = countsTowardCapacity({ status: order.status } as OrderRecord);
  const ownPaxBefore = thisOrderCounts ? (order.pax ?? 0) : 0;
  const ownPaxAfter = thisOrderCounts ? (requestedPax ?? order.pax ?? 0) : 0;
  const totalPaxAfter = day.totalPax - ownPaxBefore + ownPaxAfter;

  const { maxEvents, maxPax } = ceilingFor(capacities, order.branch);
  const statusAfter = classifyDay({
    eventCount: day.eventCount,
    totalPax: totalPaxAfter,
    maxEvents,
    maxPax,
    closed: day.status === "closed",
  });

  const rank: Record<DayStatus, number> = { available: 0, limited: 1, full: 2, exceeded: 3, closed: 4 };

  return {
    known: true,
    date: order.eventDate,
    branch: order.branch,
    eventCount: day.eventCount,
    totalPaxBefore: day.totalPax,
    totalPaxAfter,
    maxEvents,
    maxPax,
    statusBefore: day.status,
    statusAfter,
    paxUtilBefore: day.paxUtilization,
    paxUtilAfter: maxPax > 0 ? (totalPaxAfter / maxPax) * 100 : 0,
    worsened: rank[statusAfter] > rank[day.status],
    sameDayOrders: scopedOrders
      .filter((o) => o.eventDate === order.eventDate)
      .map((o) => ({ id: o.id, orderNumber: o.orderNumber, pax: o.pax, status: o.status })),
  };
}

// ---------------------------------------------------------------------
// Staff impact — declared delta only. No roster, no scheduling, no
// invented availability data exists anywhere in this app.
// ---------------------------------------------------------------------

export type StaffImpact = {
  before: number | null;
  after: number | null;
  delta: number | null;
};

export function computeStaffImpact(order: { servers: number | null }, requested: ChangeRequestPayload): StaffImpact {
  if (!("servers" in requested)) return { before: order.servers, after: order.servers, delta: 0 };
  const after = requested.servers ?? null;
  const delta = order.servers !== null && after !== null ? after - order.servers : null;
  return { before: order.servers, after, delta };
}

// ---------------------------------------------------------------------
// Financial impact
// ---------------------------------------------------------------------

export type FinancialImpact = {
  originalTotal: number;
  requestedTotal: number;
  priceDifference: number;
  liveOrderTotal: number;
  totalDrift: number;
  hasDrift: boolean;
  foodCostBefore: number;
  foodCostAfter: number;
  foodCostDelta: number;
  marginBefore: number;
  marginAfter: number;
  depositAmount: number;
  amountPaid: number;
  balanceDueBefore: number;
  balanceDueAfter: number;
  paymentStatusNow: OrderPaymentStatus;
  paymentStatusProjected: OrderPaymentStatus;
  paymentStatusRegresses: boolean;
};

const PAYMENT_STATUS_RANK: Record<OrderPaymentStatus, number> = {
  Unpaid: 0,
  "Awaiting Verification": 1,
  "Partially Paid": 2,
  "Deposit Paid": 3,
  Paid: 4,
};

export function computeFinancialImpact(input: {
  record: Pick<ChangeRequestRecord, "originalTotal" | "requestedTotal" | "priceDifference">;
  order: OrderWithMenu;
  foodCostBefore: number;
  foodCostAfter: number;
  payments: PaymentRecord[];
}): FinancialImpact {
  const { record, order, foodCostBefore, foodCostAfter, payments } = input;

  const liveOrderTotal = order.total;
  const totalDrift = liveOrderTotal - record.originalTotal;
  const hasDrift = Math.abs(totalDrift) >= 0.005;

  const verifiedAmount = payments.filter((p) => p.status === "Verified").reduce((sum, p) => sum + p.amount, 0);
  const pendingCount = payments.filter((p) => p.status === "Submitted").length;

  const balanceDueBefore = balanceDue({ total: liveOrderTotal, amountPaid: order.amountPaid });
  const balanceDueAfter = balanceDue({ total: record.requestedTotal, amountPaid: order.amountPaid });

  const paymentStatusNow = order.paymentStatus;
  const paymentStatusProjected = derivePaymentStatus({
    total: record.requestedTotal,
    depositAmount: order.depositAmount,
    verifiedAmount,
    pendingCount,
  });

  const marginBefore = liveOrderTotal > 0 ? ((liveOrderTotal - foodCostBefore) / liveOrderTotal) * 100 : 0;
  const marginAfter = record.requestedTotal > 0 ? ((record.requestedTotal - foodCostAfter) / record.requestedTotal) * 100 : 0;

  return {
    originalTotal: record.originalTotal,
    requestedTotal: record.requestedTotal,
    priceDifference: record.priceDifference,
    liveOrderTotal,
    totalDrift,
    hasDrift,
    foodCostBefore,
    foodCostAfter,
    foodCostDelta: foodCostAfter - foodCostBefore,
    marginBefore,
    marginAfter,
    depositAmount: order.depositAmount,
    amountPaid: order.amountPaid,
    balanceDueBefore,
    balanceDueAfter,
    paymentStatusNow,
    paymentStatusProjected,
    paymentStatusRegresses: PAYMENT_STATUS_RANK[paymentStatusProjected] < PAYMENT_STATUS_RANK[paymentStatusNow],
  };
}

// ---------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------

export type ImpactWarning = { level: "info" | "warn" | "block"; message: string };

export type ChangeRequestImpact = {
  fields: FieldDiff[];
  dishes: { tray: DishLineDiff[]; packed: DishLineDiff[]; categories: CategoryDiff[] };
  staff: StaffImpact;
  inventory: InventoryImpact;
  capacity: CapacityImpact;
  financial: FinancialImpact;
  drift: DriftField[];
  warnings: ImpactWarning[];
};

const RESERVING_STATUSES = new Set<OrderStatus>(["Confirmed", "Preparing", "Cooking", "Completed", "Ready for Delivery"]);

export function assembleWarnings(input: {
  record: ChangeRequestRecord;
  order: OrderWithMenu;
  capacity: CapacityImpact;
  inventory: InventoryImpact;
  financial: FinancialImpact;
}): ImpactWarning[] {
  const { record, order, capacity, inventory, financial } = input;
  const warnings: ImpactWarning[] = [];

  if (order.status === "Completed" || order.status === "Cancelled") {
    warnings.push({ level: "block", message: `This order is ${order.status} — a change request cannot be applied to it.` });
  }
  if (record.status !== "pending") {
    warnings.push({ level: "block", message: `This request is already ${record.status}.` });
  }

  if (financial.hasDrift) {
    warnings.push({
      level: "warn",
      message: `Order total is now ₱${financial.liveOrderTotal.toLocaleString()}; this request was priced against ₱${financial.originalTotal.toLocaleString()}.`,
    });
  }

  if (capacity.known && capacity.worsened && (capacity.statusAfter === "full" || capacity.statusAfter === "exceeded")) {
    warnings.push({ level: "warn", message: `Kitchen capacity on ${capacity.date} will become ${capacity.statusAfter} (${capacity.totalPaxAfter}/${capacity.maxPax || "—"} PAX).` });
  }

  if (inventory.newShortageCount > 0) {
    warnings.push({ level: "warn", message: `This change creates ${inventory.newShortageCount} new ingredient shortage${inventory.newShortageCount === 1 ? "" : "s"}.` });
  }

  if (financial.paymentStatusRegresses) {
    warnings.push({ level: "warn", message: `Payment status will change from ${financial.paymentStatusNow} to ${financial.paymentStatusProjected}.` });
  }

  if (order.eventDate && order.eventDate < new Date().toISOString().slice(0, 10)) {
    warnings.push({ level: "warn", message: "This order's event date is in the past." });
  }

  if (inventory.unmappedAfter.length > 0) {
    warnings.push({ level: "info", message: `${inventory.unmappedAfter.length} dish(es) have no linked recipe — ingredient impact is understated.` });
  }

  if (!RESERVING_STATUSES.has(order.status)) {
    warnings.push({ level: "info", message: `This order (${order.status}) is not currently reserving inventory — the panel above is advisory only.` });
  }

  warnings.push({ level: "info", message: "No staff roster or availability data exists in this system — confirm staffing manually before approving." });

  return warnings;
}
