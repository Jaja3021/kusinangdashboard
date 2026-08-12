// Shape of a CRM opportunity record. Mirrors the field set the deployed
// dashboard consumes, so the derive functions in ./revenue and ./pipeline are
// straight ports rather than reinterpretations.

/** Where a deal sits in the pipeline, independent of its display stage. */
export type PipelineStatus = "won" | "open" | "lost" | "abandoned";

/** Stages that mean the booking is real and should be counted. */
export const CONFIRMED_STAGES = [
  "Confirmed",
  "Upcoming Event",
  "Half Paid",
  "Fully Paid",
  "3 Days Before Event",
  "Tomorrows Event",
  "Awaiting Balance",
  "Clear to Delivered",
  "Ready for Pickup",
  "Delivered",
  "Completed",
  "Order Confirmed",
  "Partial Payment",
  "Full Payment",
] as const;

/** Stages that mean nothing is committed yet (or the deal died). */
export const UNCONFIRMED_STAGES = [
  "Cancelled",
  "Awaiting Confirmation",
  "New Inquiry",
  "Contacted",
] as const;

export type StageName =
  | (typeof CONFIRMED_STAGES)[number]
  | (typeof UNCONFIRMED_STAGES)[number];

export type PaymentStage =
  | "New Inquiry"
  | "Partial Payment"
  | "Full Payment"
  | "Complimentary"
  | "Completed"
  | "Cancelled";

/** Row-level display status, used by the status badges. */
export type OrderStatus =
  | "New"
  | "Pending"
  | "Confirmed"
  | "For Preparation"
  | "Preparing"
  | "Out for Delivery"
  | "Setup Ongoing"
  | "Delivered"
  | "Completed"
  | "Cancelled";

export type InquirySource =
  | "Facebook"
  | "Instagram"
  | "Messenger"
  | "Referral"
  | "Walk-in"
  | "Website";

export type Opportunity = {
  id: string;
  reference: string;
  name: string;
  email: string;
  phone: string;
  branch: string;
  /** `YYYY-MM-DD` in Asia/Manila. Empty when the event has no date yet. */
  eventDate: string;
  eventTime: string;
  /** `YYYY-MM-DD` — when the inquiry came in. */
  createdDate: string;
  /** ISO timestamp, used only for recency sorting. */
  lastModified: string;
  eventType: string;
  packageName: string;
  stageName: StageName;
  pipelineStatus: PipelineStatus;
  paymentStage: PaymentStage;
  /** Contract value in pesos. */
  amount: number;
  /** Collected so far, in pesos. */
  amountPaid: number;
  pax: number;
  status: OrderStatus;
  source: InquirySource | "";
  notes: string;
};

/** An inclusive `YYYY-MM-DD` window. */
export type DateRange = { from: string; to: string };
