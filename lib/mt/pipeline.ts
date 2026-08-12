// The predicates that decide what counts as a real booking. Ported verbatim
// from the deployed dashboard so every headline number agrees with it.

import { CONFIRMED_STAGES, UNCONFIRMED_STAGES, type Opportunity } from "./types";

const CONFIRMED = new Set<string>(CONFIRMED_STAGES);
const UNCONFIRMED = new Set<string>(UNCONFIRMED_STAGES);

const DEAD: ReadonlySet<string> = new Set(["lost", "abandoned"]);

function stage(o: Opportunity): string {
  return (o.stageName ?? "").trim();
}

/** Cancelled outright, or dead in the pipeline. */
export function isCancelled(o: Opportunity): boolean {
  return stage(o) === "Cancelled" || DEAD.has(o.pipelineStatus);
}

/**
 * Whether a deal is committed. Stage wins over pipeline status, and payment
 * stage is the tiebreaker for records whose stage isn't in either list.
 */
export function isConfirmed(o: Opportunity): boolean {
  const s = stage(o);
  if (UNCONFIRMED.has(s) || DEAD.has(o.pipelineStatus)) return false;
  if (CONFIRMED.has(s) || o.pipelineStatus === "won") return true;
  return o.paymentStage === "Partial Payment" || o.paymentStage === "Full Payment";
}

/** Complimentary events are real bookings but contribute no revenue. */
export function isBillable(o: Opportunity): boolean {
  return o.paymentStage !== "Complimentary";
}
