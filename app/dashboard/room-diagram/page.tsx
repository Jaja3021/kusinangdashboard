import RoomDiagramEditor from "@/components/dashboard/RoomDiagramEditor";
import { getRoomLayouts } from "@/lib/rooms/data";

export const dynamic = "force-dynamic";

export default async function RoomDiagramPage() {
  const layouts = await getRoomLayouts();
  return <RoomDiagramEditor layouts={layouts} />;
}
