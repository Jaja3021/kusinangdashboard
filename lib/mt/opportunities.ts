// Dummy CRM records for the dashboard. Illustrative only — no real customers.
//
// Generated from a fixed seed rather than written out by hand, so the set is
// large enough for the charts to look alive while staying byte-identical on
// every render. That determinism matters: the server and the client both
// evaluate this module, and any drift between them is a hydration mismatch.
//
// Event dates are anchored to today so "Today's Orders" and the balance
// notifications always have something to show.

import { addDays, todayManila } from "./dates";
import { BRANCH_NAMES } from "./branches";
import type {
  InquirySource,
  Opportunity,
  OrderStatus,
  PaymentStage,
  PipelineStatus,
  StageName,
} from "./types";

/** mulberry32 — small, fast, and stable across engines. */
function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST_NAMES = [
  "Maria", "Josefina", "Ramon", "Antonio", "Liza", "Carlo", "Angelica",
  "Ferdinand", "Teresita", "Michael", "Rosario", "Benjamin", "Cristina",
  "Paolo", "Imelda", "Eduardo", "Lourdes", "Rafael", "Corazon", "Miguel",
  "Divina", "Alfonso", "Perlita", "Gregorio", "Nenita", "Ricardo", "Amparo",
  "Salvador", "Estrella", "Bienvenido",
];

const LAST_NAMES = [
  "Santos", "Cruz", "Dela Cruz", "Reyes", "Bautista", "Mendoza", "Ramos",
  "Aquino", "Lim", "Garcia", "Torres", "Flores", "Del Rosario", "Fernandez",
  "Villanueva", "Castillo", "Navarro", "Domingo", "Salazar", "Pascual",
];

const EVENT_TYPES = [
  "Wedding Reception", "Debut", "Christening", "Corporate Gala",
  "Birthday Party", "Fiesta Reunion", "Anniversary", "Graduation Lunch",
  "Baptism", "Corporate Lunch",
];

const PACKAGES = [
  "Pamana Heritage Buffet", "Fiesta Grazing Table", "Kasalan Premium",
  "Handaan Silver", "Salu-Salo Bronze", "Merienda Cena", "Corporate Bento",
];

// Weighted so the donut has a clear leader and a believable long tail.
const SOURCES: InquirySource[] = [
  "Facebook", "Facebook", "Facebook", "Facebook",
  "Referral", "Referral", "Referral",
  "Instagram", "Instagram",
  "Messenger", "Messenger",
  "Walk-in",
  "Website",
];

const EVENT_TIMES = ["10:00 AM", "11:30 AM", "12:00 PM", "5:00 PM", "6:30 PM", "7:00 PM"];

const WON_STAGES: StageName[] = [
  "Confirmed", "Upcoming Event", "Half Paid", "Fully Paid",
  "Clear to Delivered", "Ready for Pickup", "Delivered", "Completed",
  "Order Confirmed",
];

const OPEN_STAGES: StageName[] = ["New Inquiry", "Contacted", "Awaiting Confirmation"];

type Recipe = {
  pipelineStatus: PipelineStatus;
  stageName: StageName;
  paymentStage: PaymentStage;
  status: OrderStatus;
  /** Fraction of `amount` already collected. */
  paidRatio: number;
};

const pick = <T,>(rng: () => number, list: readonly T[]): T =>
  list[Math.floor(rng() * list.length)];

const between = (rng: () => number, min: number, max: number): number =>
  min + Math.floor(rng() * (max - min + 1));

/**
 * Decide the whole status cluster at once. Keeping stage, pipeline status,
 * payment stage and paid ratio consistent is what makes the derived metrics
 * believable — a "Fully Paid" record with a balance would poison the KPIs.
 */
function recipeFor(rng: () => number, isPast: boolean): Recipe {
  const roll = rng();

  if (isPast) {
    // Past events are mostly settled; a few died on the vine.
    if (roll < 0.78) {
      return {
        pipelineStatus: "won",
        stageName: rng() < 0.75 ? "Completed" : "Delivered",
        paymentStage: "Completed",
        status: "Completed",
        paidRatio: 1,
      };
    }
    if (roll < 0.85) {
      return {
        pipelineStatus: "won",
        stageName: "Completed",
        paymentStage: "Complimentary",
        status: "Completed",
        paidRatio: 0,
      };
    }
    if (roll < 0.94) {
      return {
        pipelineStatus: "lost",
        stageName: "Cancelled",
        paymentStage: "Cancelled",
        status: "Cancelled",
        paidRatio: rng() < 0.5 ? 0.25 : 0,
      };
    }
    return {
      pipelineStatus: "abandoned",
      stageName: "Contacted",
      paymentStage: "New Inquiry",
      status: "Cancelled",
      paidRatio: 0,
    };
  }

  if (roll < 0.34) {
    return {
      pipelineStatus: "won",
      stageName: pick(rng, WON_STAGES),
      paymentStage: "Full Payment",
      status: "Confirmed",
      paidRatio: 1,
    };
  }
  if (roll < 0.6) {
    return {
      pipelineStatus: "won",
      stageName: rng() < 0.5 ? "Half Paid" : "Awaiting Balance",
      paymentStage: "Partial Payment",
      status: "For Preparation",
      paidRatio: 0.5,
    };
  }
  if (roll < 0.78) {
    return {
      pipelineStatus: "open",
      stageName: "Awaiting Confirmation",
      paymentStage: "Partial Payment",
      status: "Pending",
      paidRatio: 0.3,
    };
  }
  if (roll < 0.94) {
    return {
      pipelineStatus: "open",
      stageName: pick(rng, OPEN_STAGES),
      paymentStage: "New Inquiry",
      status: "New",
      paidRatio: 0,
    };
  }
  return {
    pipelineStatus: "lost",
    stageName: "Cancelled",
    paymentStage: "Cancelled",
    status: "Cancelled",
    paidRatio: 0,
  };
}

function build(count: number, today: string): Opportunity[] {
  const rng = seeded(20260811);
  const rows: Opportunity[] = [];

  for (let i = 0; i < count; i++) {
    // Spread event dates across the last 11 months and the next 2.
    const offset = between(rng, -330, 60);
    const eventDate = addDays(today, offset);
    const isPast = offset < 0;

    const recipe = recipeFor(rng, isPast);
    const pax = between(rng, 4, 60) * 5;
    const pricePerHead = between(rng, 13, 26) * 50;
    const amount = pax * pricePerHead;

    const first = pick(rng, FIRST_NAMES);
    const last = pick(rng, LAST_NAMES);
    const name = `${first} ${last}`;
    const handle = `${first}.${last}`.toLowerCase().replace(/\s+/g, "");

    // Inquiries land 20–120 days before the event.
    const createdDate = addDays(eventDate, -between(rng, 20, 120));

    rows.push({
      id: `OPP-${String(1000 + i)}`,
      reference: `KP-${String(24000 + i)}`,
      name,
      email: `${handle}@gmail.com`,
      phone: `09${between(rng, 10, 39)} ${between(rng, 100, 999)} ${between(rng, 1000, 9999)}`,
      // Drawn rather than round-robined: cycling by index correlates the branch
      // with the status roll, which made whole panels come out single-branch.
      branch: pick(rng, BRANCH_NAMES),
      eventDate,
      eventTime: pick(rng, EVENT_TIMES),
      createdDate,
      lastModified: `${addDays(eventDate, -between(rng, 0, 18))}T0${between(rng, 1, 9)}:${String(between(rng, 10, 59))}:00+08:00`,
      eventType: pick(rng, EVENT_TYPES),
      packageName: pick(rng, PACKAGES),
      stageName: recipe.stageName,
      pipelineStatus: recipe.pipelineStatus,
      paymentStage: recipe.paymentStage,
      amount,
      amountPaid: Math.round(amount * recipe.paidRatio),
      pax,
      status: recipe.status,
      source: pick(rng, SOURCES),
      notes: "",
    });
  }

  return rows;
}

/**
 * Records pinned to specific dates so the time-sensitive parts of the UI are
 * never empty: today's order table, the "3 days out" hand-off, an unsettled
 * balance on an event that is happening now, and a fresh cancellation.
 */
function anchored(today: string): Opportunity[] {
  const base = {
    email: "",
    notes: "",
    eventTime: "6:00 PM",
    source: "Facebook" as InquirySource,
  };

  return [
    {
      ...base,
      id: "OPP-9001",
      reference: "KP-24901",
      name: "Corazon Villanueva",
      email: "corazon.villanueva@gmail.com",
      phone: "0917 220 4471",
      branch: "Quezon City",
      eventDate: today,
      eventTime: "12:00 PM",
      createdDate: addDays(today, -45),
      lastModified: `${addDays(today, -2)}T09:15:00+08:00`,
      eventType: "Wedding Reception",
      packageName: "Pamana Heritage Buffet",
      stageName: "Clear to Delivered" as StageName,
      pipelineStatus: "won" as PipelineStatus,
      paymentStage: "Full Payment" as PaymentStage,
      amount: 171000,
      amountPaid: 171000,
      pax: 180,
      status: "Out for Delivery" as OrderStatus,
      source: "Referral" as InquirySource,
    },
    {
      ...base,
      id: "OPP-9002",
      reference: "KP-24902",
      name: "Eduardo Pascual",
      email: "ed.pascual@outlook.com",
      phone: "0918 552 3390",
      branch: "Makati",
      eventDate: today,
      eventTime: "6:30 PM",
      createdDate: addDays(today, -30),
      lastModified: `${addDays(today, -1)}T14:02:00+08:00`,
      eventType: "Corporate Gala",
      packageName: "Corporate Bento",
      stageName: "Ready for Pickup" as StageName,
      pipelineStatus: "won" as PipelineStatus,
      paymentStage: "Full Payment" as PaymentStage,
      amount: 210000,
      amountPaid: 210000,
      pax: 250,
      status: "Setup Ongoing" as OrderStatus,
      source: "Website" as InquirySource,
    },
    {
      // Event is today and the balance is still open — drives the danger alert.
      ...base,
      id: "OPP-9003",
      reference: "KP-24903",
      name: "Lourdes Domingo",
      email: "lourdes.domingo@gmail.com",
      phone: "0920 114 6602",
      branch: "Cebu",
      eventDate: today,
      eventTime: "5:00 PM",
      createdDate: addDays(today, -22),
      lastModified: `${today}T08:40:00+08:00`,
      eventType: "Debut",
      packageName: "Handaan Silver",
      stageName: "Awaiting Balance" as StageName,
      pipelineStatus: "won" as PipelineStatus,
      paymentStage: "Partial Payment" as PaymentStage,
      amount: 96000,
      amountPaid: 48000,
      pax: 120,
      status: "Preparing" as OrderStatus,
      source: "Instagram" as InquirySource,
    },
    {
      // Just handed to the kitchen.
      ...base,
      id: "OPP-9004",
      reference: "KP-24904",
      name: "Rafael Castillo",
      email: "rafael.castillo@gmail.com",
      phone: "0917 664 9021",
      branch: "Quezon City",
      eventDate: addDays(today, 3),
      createdDate: addDays(today, -60),
      lastModified: `${today}T07:20:00+08:00`,
      eventType: "Fiesta Reunion",
      packageName: "Fiesta Grazing Table",
      stageName: "3 Days Before Event" as StageName,
      pipelineStatus: "won" as PipelineStatus,
      paymentStage: "Partial Payment" as PaymentStage,
      amount: 84500,
      amountPaid: 42250,
      pax: 130,
      status: "For Preparation" as OrderStatus,
      source: "Messenger" as InquirySource,
    },
    {
      // Fresh cancellation — drives the "stop preparation" alert.
      ...base,
      id: "OPP-9005",
      reference: "KP-24905",
      name: "Perlita Salazar",
      email: "perlita.salazar@yahoo.com",
      phone: "0921 330 8845",
      branch: "Makati",
      eventDate: addDays(today, 1),
      createdDate: addDays(today, -40),
      lastModified: `${today}T06:05:00+08:00`,
      eventType: "Birthday Party",
      packageName: "Merienda Cena",
      stageName: "Cancelled" as StageName,
      pipelineStatus: "lost" as PipelineStatus,
      paymentStage: "Cancelled" as PaymentStage,
      amount: 42000,
      amountPaid: 10500,
      pax: 60,
      status: "Cancelled" as OrderStatus,
      source: "Walk-in" as InquirySource,
    },
  ];
}

const TODAY = todayManila();

export const opportunities: Opportunity[] = [...anchored(TODAY), ...build(140, TODAY)];

/** Receipts uploaded and waiting on a human — feeds the review notification. */
export const pendingReceipts = 3;
