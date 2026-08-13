import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { RoomElement, RoomLayout } from "./types";

type RoomLayoutRow = {
  id: string;
  branch: string;
  hall_slug: string;
  hall_name: string;
  capacity: number;
  canvas_width: number;
  canvas_height: number;
  elements: RoomElement[];
};

const ROOM_LAYOUT_COLUMNS =
  "id, branch, hall_slug, hall_name, capacity, canvas_width, canvas_height, elements";

function rowToLayout(row: RoomLayoutRow): RoomLayout {
  return {
    id: row.id,
    branch: row.branch,
    hallSlug: row.hall_slug,
    hallName: row.hall_name,
    capacity: row.capacity,
    canvasWidth: row.canvas_width,
    canvasHeight: row.canvas_height,
    elements: row.elements,
  };
}

export async function getRoomLayouts(): Promise<RoomLayout[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("room_layouts")
    .select(ROOM_LAYOUT_COLUMNS)
    .order("branch", { ascending: true })
    .order("hall_slug", { ascending: true });
  if (error) throw new Error(`Failed to load room layouts: ${error.message}`);
  return (data as RoomLayoutRow[]).map(rowToLayout);
}

export async function saveRoomLayout(
  id: string,
  payload: { elements: RoomElement[]; canvasWidth: number; canvasHeight: number },
): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("room_layouts")
    .update({
      elements: payload.elements,
      canvas_width: payload.canvasWidth,
      canvas_height: payload.canvasHeight,
    })
    .eq("id", id);
  if (error) throw new Error(`Failed to save room layout: ${error.message}`);
}
