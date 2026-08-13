"use server";

import { revalidatePath } from "next/cache";
import { saveRoomLayout } from "@/lib/rooms/data";
import type { RoomElement } from "@/lib/rooms/types";

export async function saveRoomLayoutAction(
  id: string,
  payload: { elements: RoomElement[]; canvasWidth: number; canvasHeight: number },
): Promise<void> {
  // RLS ("Admin manage room layouts", is_admin()) is the real authorization
  // boundary — a non-admin's update simply affects zero rows.
  await saveRoomLayout(id, payload);
  revalidatePath("/dashboard/room-diagram");
}
