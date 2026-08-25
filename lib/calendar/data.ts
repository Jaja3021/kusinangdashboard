// Server-only reads for the Catering Calendar.

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { BRANCHES } from "@/lib/mt/branches";
import type { CalendarCapacity } from "./types";

type CapacityRow = { branch: string; max_events_per_day: number; max_pax_per_day: number };

/** Per-branch ceilings. A branch with no row yet falls back to the same
 * defaults the table declares, so the calendar works the moment
 * supabase/calendar_capacity.sql exists even before anyone visits Settings. */
export async function getCalendarCapacity(): Promise<CalendarCapacity[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("calendar_capacity")
    .select("branch, max_events_per_day, max_pax_per_day");
  if (error) throw new Error(`Failed to load calendar capacity: ${error.message}`);

  const byBranch = new Map(
    (data as CapacityRow[]).map((r) => [
      r.branch,
      { branch: r.branch, maxEventsPerDay: r.max_events_per_day, maxPaxPerDay: r.max_pax_per_day },
    ]),
  );

  return BRANCHES.map(
    (b) => byBranch.get(b.id) ?? { branch: b.id, maxEventsPerDay: 3, maxPaxPerDay: 400 },
  );
}

export async function updateCalendarCapacity(input: CalendarCapacity): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("calendar_capacity").upsert(
    {
      branch: input.branch,
      max_events_per_day: input.maxEventsPerDay,
      max_pax_per_day: input.maxPaxPerDay,
    },
    { onConflict: "branch" },
  );
  if (error) throw new Error(`Failed to update capacity for ${input.branch}: ${error.message}`);
}
