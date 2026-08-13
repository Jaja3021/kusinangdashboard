// Room Diagram editor: element catalogue + the shapes Supabase's
// public.room_layouts table stores/returns. Mirrors lib/orders/types.ts's
// split between "what the DB stores" and "what the UI works with".

export type TableKind =
  | "round-60"
  | "round-72"
  | "round-48"
  | "round-36"
  | "rect-30x96"
  | "rect-30x72"
  | "head-table"
  | "highboy-24"
  | "stage"
  | "bar";

export type StructKind = "wall-h" | "wall-v" | "wall-s" | "pillar" | "door" | "window";

export type RoomElementKind = TableKind | StructKind;

export type ElementSpec = {
  label: string;
  /** Seats this element contributes to the "Total seats" stat. 0 for structural/standing elements. */
  seats: number;
  width: number;
  height: number;
  shape: "round" | "rect" | "line" | "diagonal";
};

export const TABLE_SPECS: Record<TableKind, ElementSpec> = {
  "round-60": { label: "Round 60\"", seats: 8, width: 60, height: 60, shape: "round" },
  "round-72": { label: "Round 72\"", seats: 10, width: 72, height: 72, shape: "round" },
  "round-48": { label: "Round 48\"", seats: 6, width: 48, height: 48, shape: "round" },
  "round-36": { label: "Round 36\"", seats: 4, width: 36, height: 36, shape: "round" },
  "rect-30x96": { label: "30\"x96\"", seats: 8, width: 96, height: 30, shape: "rect" },
  "rect-30x72": { label: "30\"x72\"", seats: 6, width: 72, height: 30, shape: "rect" },
  "head-table": { label: "Head Table", seats: 6, width: 108, height: 30, shape: "rect" },
  "highboy-24": { label: "Highboy 24\"", seats: 0, width: 24, height: 24, shape: "round" },
  stage: { label: "Stage", seats: 0, width: 140, height: 60, shape: "rect" },
  bar: { label: "Bar", seats: 0, width: 100, height: 32, shape: "rect" },
};

export const STRUCT_SPECS: Record<StructKind, ElementSpec> = {
  "wall-h": { label: "Wall (H)", seats: 0, width: 120, height: 8, shape: "line" },
  "wall-v": { label: "Wall (V)", seats: 0, width: 8, height: 120, shape: "line" },
  "wall-s": { label: "Wall (S)", seats: 0, width: 120, height: 8, shape: "diagonal" },
  pillar: { label: "Pillar", seats: 0, width: 20, height: 20, shape: "round" },
  door: { label: "Door", seats: 0, width: 36, height: 8, shape: "rect" },
  window: { label: "Window", seats: 0, width: 36, height: 8, shape: "rect" },
};

export function specFor(kind: RoomElementKind): ElementSpec {
  return (TABLE_SPECS as Record<string, ElementSpec>)[kind] ?? STRUCT_SPECS[kind as StructKind];
}

export function isTableKind(kind: RoomElementKind): kind is TableKind {
  return kind in TABLE_SPECS;
}

/** Top-left position in room-canvas pixels. */
export type RoomElement = {
  id: string;
  kind: RoomElementKind;
  x: number;
  y: number;
};

export type RoomLayout = {
  id: string;
  branch: string;
  hallSlug: string;
  hallName: string;
  capacity: number;
  canvasWidth: number;
  canvasHeight: number;
  elements: RoomElement[];
};
