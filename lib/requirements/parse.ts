// Pure parsers for the three JSONB dish-source columns on public.orders.
// Extracted from lib/requirements/data.ts so lib/change-requests/impact.ts
// (which must stay Supabase-free) can build a hypothetical OrderDishSource
// without duplicating this defensive parsing.

import type { TraySize } from "@/lib/menu/types";
import type { OrderDishSource } from "./types";

export const TRAY_SIZES: TraySize[] = ["Family", "Feast", "XXXL"];

export function parseCart(value: unknown): OrderDishSource["cart"] {
  if (!Array.isArray(value)) return [];
  const lines: OrderDishSource["cart"] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const o = item as { dishId?: unknown; size?: unknown; qty?: unknown };
    if (typeof o.dishId !== "string" || typeof o.qty !== "number" || o.qty <= 0) continue;
    const size = typeof o.size === "string" && TRAY_SIZES.includes(o.size as TraySize) ? (o.size as TraySize) : "Family";
    lines.push({ dishId: o.dishId, size, qty: o.qty });
  }
  return lines;
}

export function parsePackedMealCart(value: unknown): OrderDishSource["packedMealCart"] {
  if (!Array.isArray(value)) return [];
  const lines: OrderDishSource["packedMealCart"] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const o = item as { dishId?: unknown; qty?: unknown };
    if (typeof o.dishId !== "string" || typeof o.qty !== "number" || o.qty <= 0) continue;
    lines.push({ dishId: o.dishId, qty: o.qty });
  }
  return lines;
}

export function parseSelectedDishes(value: unknown): OrderDishSource["selectedDishes"] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, string> = {};
  for (const [category, dish] of Object.entries(value as Record<string, unknown>)) {
    if (typeof dish === "string" && dish.trim()) out[category] = dish;
  }
  return out;
}
