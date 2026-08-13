export type BreakEvenSettings = {
  branch: string;
  rent: number;
  utilities: number;
  staffSalaries: number;
  insurance: number;
  marketing: number;
  otherFixed: number;
  variableCostPerEvent: number;
  avgPaxPerEvent: number;
  sellingPricePerPax: number;
};

export function totalFixedCosts(s: BreakEvenSettings): number {
  return s.rent + s.utilities + s.staffSalaries + s.insurance + s.marketing + s.otherFixed;
}

export function revenuePerEvent(s: BreakEvenSettings): number {
  return s.sellingPricePerPax * s.avgPaxPerEvent;
}

export function contributionMargin(s: BreakEvenSettings): number {
  return revenuePerEvent(s) - s.variableCostPerEvent;
}

/** Events/month needed to cover fixed costs. Infinity if margin is non-positive (can't ever break even). */
export function breakEvenEvents(s: BreakEvenSettings): number {
  const margin = contributionMargin(s);
  if (margin <= 0) return Infinity;
  return Math.ceil(totalFixedCosts(s) / margin);
}

export function scenarioAt(s: BreakEvenSettings, events: number) {
  const revenue = events * revenuePerEvent(s);
  const totalCosts = totalFixedCosts(s) + events * s.variableCostPerEvent;
  return { events, revenue, totalCosts, profit: revenue - totalCosts };
}
