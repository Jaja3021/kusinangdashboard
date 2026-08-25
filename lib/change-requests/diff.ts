// Pure diffing over two ChangeRequestPayload snapshots (and, for drift
// detection, the live order). No Supabase — reused by both the server-side
// impact builder and, if a lighter client-side preview is ever needed, a
// client component.

import { dishKey } from "@/lib/menu/dish-catalog";
import { formatPeso } from "@/lib/format";
import type { ChangeRequestPayload, ChangeRequestRecord } from "./types";
import type { OrderWithMenu } from "@/lib/orders/data";

const EPSILON = 0.005;

function numbersEqual(a: number, b: number): boolean {
  return Math.abs(a - b) < EPSILON;
}

type DiffKind = "int" | "money" | "text" | "dishes" | "categories";

export type FieldDiff = {
  key: keyof ChangeRequestPayload;
  label: string;
  kind: DiffKind;
  before: unknown;
  after: unknown;
  changed: boolean;
  /** Signed numeric delta — int/money kinds only, null otherwise. */
  delta: number | null;
};

const DIFF_FIELDS: { key: keyof ChangeRequestPayload; label: string; kind: DiffKind }[] = [
  { key: "pax", label: "PAX", kind: "int" },
  { key: "servers", label: "Servers", kind: "int" },
  { key: "packageName", label: "Package", kind: "text" },
  { key: "menuName", label: "Menu", kind: "text" },
  { key: "quantityLabel", label: "Quantity", kind: "text" },
  { key: "cart", label: "Tray Cart", kind: "dishes" },
  { key: "packedMealCart", label: "Packed Meals", kind: "dishes" },
  { key: "selectedDishes", label: "Selected Dishes", kind: "categories" },
  { key: "subtotal", label: "Subtotal", kind: "money" },
  { key: "deliveryFee", label: "Delivery Fee", kind: "money" },
  { key: "rushFee", label: "Rush Fee", kind: "money" },
];

type DishLine = { dishId: string; size: string; qty: number };

function normalizeDishLines(lines: { dishId: string; size?: string; qty: number }[] | undefined): DishLine[] {
  if (!lines) return [];
  return lines
    .filter((l) => l.qty > 0)
    .map((l) => ({ dishId: l.dishId, size: l.size ?? "", qty: l.qty }))
    .sort((a, b) => `${dishKey(a.dishId)}::${a.size}`.localeCompare(`${dishKey(b.dishId)}::${b.size}`));
}

function sameValue(kind: DiffKind, a: unknown, b: unknown): boolean {
  if (kind === "int" || kind === "money") {
    const an = Number(a ?? 0);
    const bn = Number(b ?? 0);
    return numbersEqual(an, bn);
  }
  if (kind === "text") {
    return (a ?? "") === (b ?? "");
  }
  if (kind === "dishes") {
    const av = normalizeDishLines(a as DishLine[] | undefined);
    const bv = normalizeDishLines(b as DishLine[] | undefined);
    return JSON.stringify(av) === JSON.stringify(bv);
  }
  // categories
  const av = (a ?? {}) as Record<string, string>;
  const bv = (b ?? {}) as Record<string, string>;
  const keys = new Set([...Object.keys(av), ...Object.keys(bv)]);
  for (const k of keys) {
    if ((av[k] ?? "") !== (bv[k] ?? "")) return false;
  }
  return true;
}

/** Only keys PRESENT in `requested` are candidates — an absent key is "the
 * Meal Builder didn't touch this field," not "clear it." `before` falls
 * back to the live order's current value when `original` omitted the key
 * (the snapshot was taken before this field existed, or the field simply
 * wasn't captured), so drift never masquerades as "no change." */
export function diffPayloads(
  original: ChangeRequestPayload,
  requested: ChangeRequestPayload,
  live: ChangeRequestPayload,
): FieldDiff[] {
  const diffs: FieldDiff[] = [];

  for (const field of DIFF_FIELDS) {
    if (!(field.key in requested)) continue;

    const after = requested[field.key];
    const before = field.key in original ? original[field.key] : live[field.key];
    const changed = !sameValue(field.kind, before, after);

    let delta: number | null = null;
    if (changed && (field.kind === "int" || field.kind === "money")) {
      delta = Number(after ?? 0) - Number(before ?? 0);
    }

    diffs.push({ key: field.key, label: field.label, kind: field.kind, before, after, changed, delta });
  }

  return diffs;
}

export type DishLineDiff = {
  lineKey: string;
  dishId: string;
  size: string;
  beforeQty: number;
  afterQty: number;
  deltaQty: number;
  kind: "added" | "removed" | "changed" | "same";
};

function diffDishArrays(
  before: { dishId: string; size?: string; qty: number }[] | undefined,
  after: { dishId: string; size?: string; qty: number }[] | undefined,
): DishLineDiff[] {
  const beforeLines = normalizeDishLines(before);
  const afterLines = normalizeDishLines(after);

  const byKey = new Map<string, { before?: DishLine; after?: DishLine }>();
  for (const line of beforeLines) {
    const k = `${dishKey(line.dishId)}::${line.size}`;
    byKey.set(k, { ...byKey.get(k), before: line });
  }
  for (const line of afterLines) {
    const k = `${dishKey(line.dishId)}::${line.size}`;
    byKey.set(k, { ...byKey.get(k), after: line });
  }

  const out: DishLineDiff[] = [];
  for (const [lineKey, pair] of byKey) {
    const beforeQty = pair.before?.qty ?? 0;
    const afterQty = pair.after?.qty ?? 0;
    if (numbersEqual(beforeQty, afterQty)) {
      out.push({ lineKey, dishId: (pair.after ?? pair.before)!.dishId, size: (pair.after ?? pair.before)!.size, beforeQty, afterQty, deltaQty: 0, kind: "same" });
      continue;
    }
    const kind = beforeQty === 0 ? "added" : afterQty === 0 ? "removed" : "changed";
    out.push({ lineKey, dishId: (pair.after ?? pair.before)!.dishId, size: (pair.after ?? pair.before)!.size, beforeQty, afterQty, deltaQty: afterQty - beforeQty, kind });
  }

  return out.sort((a, b) => a.lineKey.localeCompare(b.lineKey));
}

/** Tray-cart line diffs, resolving `before` against the live order when
 * `original_data.cart` wasn't captured. */
export function diffTrayCart(original: ChangeRequestPayload, requested: ChangeRequestPayload, live: ChangeRequestPayload): DishLineDiff[] {
  if (!("cart" in requested)) return [];
  const before = "cart" in original ? original.cart : live.cart;
  return diffDishArrays(before, requested.cart);
}

/** Packed-meal line diffs — same fallback rule as diffTrayCart. */
export function diffPackedMealCart(original: ChangeRequestPayload, requested: ChangeRequestPayload, live: ChangeRequestPayload): DishLineDiff[] {
  if (!("packedMealCart" in requested)) return [];
  const before = "packedMealCart" in original ? original.packedMealCart : live.packedMealCart;
  return diffDishArrays(before, requested.packedMealCart);
}

export type CategoryDiff = { category: string; before: string | null; after: string | null; changed: boolean };

export function diffSelectedDishes(original: ChangeRequestPayload, requested: ChangeRequestPayload, live: ChangeRequestPayload): CategoryDiff[] {
  if (!("selectedDishes" in requested)) return [];
  const before = ("selectedDishes" in original ? original.selectedDishes : live.selectedDishes) ?? {};
  const after = requested.selectedDishes ?? {};
  const categories = new Set([...Object.keys(before), ...Object.keys(after)]);
  return [...categories]
    .map((category) => ({
      category,
      before: before[category] ?? null,
      after: after[category] ?? null,
      changed: (before[category] ?? "") !== (after[category] ?? ""),
    }))
    .filter((d) => d.changed)
    .sort((a, b) => a.category.localeCompare(b.category));
}

export type DriftField = { key: string; label: string; snapshot: unknown; live: unknown };

/** Compares `original_data`/`original_total` (the Meal Builder's snapshot at
 * submit time) against the live order. A mismatch means the order changed
 * out from under this request — e.g. another change was approved, or an
 * admin edited it directly — and the request should be treated as stale.
 * Scoped to the headline scalar fields (pax, servers, package, menu name)
 * plus total; dish-level drift is not tracked here (there is no confirmed
 * report of it happening, and the total check already catches the common
 * case where drift matters — a price that moved out from under the
 * request). */
export function detectDrift(record: ChangeRequestRecord, live: OrderWithMenu): DriftField[] {
  const drift: DriftField[] = [];

  if (!numbersEqual(record.originalTotal, live.total)) {
    drift.push({ key: "total", label: "Order Total", snapshot: record.originalTotal, live: live.total });
  }

  const livePayload: ChangeRequestPayload = {
    pax: live.pax,
    servers: live.servers,
    packageName: live.packageName,
    menuName: live.menuName,
  };

  for (const field of DIFF_FIELDS) {
    if (!(field.key in record.originalData)) continue;
    const snapshot = record.originalData[field.key];
    const liveValue = livePayload[field.key];
    if (liveValue === undefined) continue;
    if (!sameValue(field.kind, snapshot, liveValue)) {
      drift.push({ key: field.key, label: field.label, snapshot, live: liveValue });
    }
  }

  return drift;
}

function formatDelta(kind: DiffKind, delta: number): string {
  const sign = delta > 0 ? "+" : "";
  return kind === "money" ? `${sign}${formatPeso(delta)}` : `${sign}${delta}`;
}

/** "PAX 150 → 180 (+30), +2 servers, 2 dish changes" — the one-line summary
 * for the list column and the approve confirmation dialog. */
export function summarizeChanges(diffs: FieldDiff[]): string {
  const changed = diffs.filter((d) => d.changed);
  if (changed.length === 0) return "No field changes";

  const parts = changed.map((d) => {
    if (d.kind === "dishes" || d.kind === "categories") return d.label;
    if (d.delta !== null) return `${d.label} ${formatDelta(d.kind, d.delta)}`;
    return `${d.label} changed`;
  });

  return parts.join(", ");
}
