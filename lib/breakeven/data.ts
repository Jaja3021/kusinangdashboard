import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { BreakEvenSettings } from "./types";

type Row = {
  branch: string;
  rent: number;
  utilities: number;
  staff_salaries: number;
  insurance: number;
  marketing: number;
  other_fixed: number;
  variable_cost_per_event: number;
  avg_pax_per_event: number;
  selling_price_per_pax: number;
};

const COLUMNS =
  "branch, rent, utilities, staff_salaries, insurance, marketing, other_fixed, variable_cost_per_event, avg_pax_per_event, selling_price_per_pax";

function rowToSettings(row: Row): BreakEvenSettings {
  return {
    branch: row.branch,
    rent: row.rent,
    utilities: row.utilities,
    staffSalaries: row.staff_salaries,
    insurance: row.insurance,
    marketing: row.marketing,
    otherFixed: row.other_fixed,
    variableCostPerEvent: row.variable_cost_per_event,
    avgPaxPerEvent: row.avg_pax_per_event,
    sellingPricePerPax: row.selling_price_per_pax,
  };
}

export async function getBreakEvenSettings(): Promise<BreakEvenSettings[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.from("breakeven_settings").select(COLUMNS).order("branch");
  if (error) throw new Error(`Failed to load break-even settings: ${error.message}`);
  return (data as Row[]).map(rowToSettings);
}

export async function saveBreakEvenSettings(settings: BreakEvenSettings): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("breakeven_settings")
    .update({
      rent: settings.rent,
      utilities: settings.utilities,
      staff_salaries: settings.staffSalaries,
      insurance: settings.insurance,
      marketing: settings.marketing,
      other_fixed: settings.otherFixed,
      variable_cost_per_event: settings.variableCostPerEvent,
      avg_pax_per_event: settings.avgPaxPerEvent,
      selling_price_per_pax: settings.sellingPricePerPax,
    })
    .eq("branch", settings.branch);
  if (error) throw new Error(`Failed to save break-even settings: ${error.message}`);
}
