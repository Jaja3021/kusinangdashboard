import CostCalculatorEditor from "@/components/dashboard/CostCalculatorEditor";
import { listCostCalculations } from "@/lib/costcalc/data";
import { BRANCHES } from "@/lib/mt/branches";

export const dynamic = "force-dynamic";

export default async function CostCalculatorPage() {
  const perBranch = await Promise.all(BRANCHES.map((b) => listCostCalculations(b.id)));
  const saved = perBranch.flat();
  return <CostCalculatorEditor saved={saved} />;
}
