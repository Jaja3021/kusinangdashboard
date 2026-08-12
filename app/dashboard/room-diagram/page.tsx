import { LayoutPanelTop, Users } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import { roomDiagram } from "@/lib/dummy-data";

export default function RoomDiagramPage() {
  const totalAssigned = roomDiagram.tables.reduce((sum, t) => sum + t.guestsAssigned, 0);
  const totalSeats = roomDiagram.tables.reduce((sum, t) => sum + t.seats, 0);

  return (
    <div>
      <PageHeader title="Room Diagram" subtitle={roomDiagram.venue} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Venue Capacity" value={String(roomDiagram.capacity)} icon={<LayoutPanelTop size={18} className="text-gold-600" />} />
        <StatCard label="Seats Planned" value={String(totalSeats)} icon={<Users size={18} className="text-gold-600" />} />
        <StatCard label="Guests Assigned" value={String(totalAssigned)} icon={<Users size={18} className="text-gold-600" />} />
      </div>

      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-5">
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-5">
          {roomDiagram.tables.map((t) => {
            const isFull = t.seats > 0 && t.guestsAssigned >= t.seats;
            const isStation = t.seats === 0;
            return (
              <div key={t.id} className="flex flex-col items-center gap-2">
                <div
                  className={`flex h-20 w-20 items-center justify-center border-2 text-center text-xs font-semibold ${
                    t.shape === "round" ? "rounded-full" : "rounded-lg"
                  } ${
                    isStation
                      ? "border-gold-500 bg-gold-500/10 text-gold-600"
                      : isFull
                      ? "border-brand-800 bg-brand-800 text-white"
                      : "border-brand-300 bg-brand-50 text-brand-800"
                  }`}
                >
                  {isStation ? "Buffet" : `${t.guestsAssigned}/${t.seats}`}
                </div>
                <p className="text-xs font-medium text-slate-600">{t.label}</p>
              </div>
            );
          })}
        </div>
        <div className="mt-8 flex flex-wrap gap-6 border-t border-gray-100 pt-5 text-xs text-slate-500">
          <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full border-2 border-brand-300 bg-brand-50" /> Open seats</span>
          <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full border-2 border-brand-800 bg-brand-800" /> Fully seated</span>
          <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full border-2 border-gold-500 bg-gold-500/10" /> Service station</span>
        </div>
      </div>
    </div>
  );
}
