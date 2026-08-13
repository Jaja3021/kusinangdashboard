import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CostCalculation, CostItem } from "./types";

type Row = {
  id: string;
  branch: string;
  name: string;
  pax_count: number;
  selling_price_per_pax: number;
  target_gp_pct: number;
  items: CostItem[];
  labour_cost: number;
  overhead_cost: number;
};

const COLUMNS = "id, branch, name, pax_count, selling_price_per_pax, target_gp_pct, items, labour_cost, overhead_cost";

function rowToCalc(row: Row): CostCalculation {
  return {
    id: row.id,
    branch: row.branch,
    name: row.name,
    paxCount: row.pax_count,
    sellingPricePerPax: row.selling_price_per_pax,
    targetGpPct: row.target_gp_pct,
    items: row.items,
    labourCost: row.labour_cost,
    overheadCost: row.overhead_cost,
  };
}

export async function listCostCalculations(branch: string): Promise<CostCalculation[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("cost_calculations")
    .select(COLUMNS)
    .eq("branch", branch)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to load cost calculations: ${error.message}`);
  return (data as Row[]).map(rowToCalc);
}

export async function saveCostCalculation(calc: Omit<CostCalculation, "id">): Promise<CostCalculation> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("cost_calculations")
    .insert({
      branch: calc.branch,
      name: calc.name,
      pax_count: calc.paxCount,
      selling_price_per_pax: calc.sellingPricePerPax,
      target_gp_pct: calc.targetGpPct,
      items: calc.items,
      labour_cost: calc.labourCost,
      overhead_cost: calc.overheadCost,
    })
    .select(COLUMNS)
    .single();
  if (error) throw new Error(`Failed to save cost calculation: ${error.message}`);
  return rowToCalc(data as Row);
}
