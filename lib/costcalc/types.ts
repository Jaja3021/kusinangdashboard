export type CostItem = {
  id: string;
  name: string;
  qty: number;
  unit: string;
  costPerUnit: number;
};

export type CostCalculation = {
  id: string;
  branch: string;
  name: string;
  paxCount: number;
  sellingPricePerPax: number;
  targetGpPct: number;
  items: CostItem[];
  labourCost: number;
  overheadCost: number;
};

export function foodCostTotal(items: CostItem[]): number {
  return items.reduce((sum, i) => sum + i.qty * i.costPerUnit, 0);
}

export function totalCost(calc: Pick<CostCalculation, "items" | "labourCost" | "overheadCost">): number {
  return foodCostTotal(calc.items) + calc.labourCost + calc.overheadCost;
}

export function totalRevenue(calc: Pick<CostCalculation, "paxCount" | "sellingPricePerPax">): number {
  return calc.paxCount * calc.sellingPricePerPax;
}

export function grossMargin(calc: CostCalculation): number {
  return totalRevenue(calc) - totalCost(calc);
}

export function gpPct(calc: CostCalculation): number {
  const revenue = totalRevenue(calc);
  return revenue > 0 ? (grossMargin(calc) / revenue) * 100 : 0;
}
