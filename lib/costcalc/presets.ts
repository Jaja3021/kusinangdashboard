import type { CostItem } from "./types";

export type CostPreset = { id: string; label: string; paxCount: number; items: Omit<CostItem, "id">[] };

export const COST_PRESETS: CostPreset[] = [
  {
    id: "catering-per-pax",
    label: "Catering (per pax)",
    paxCount: 100,
    items: [
      { name: "Pork (per kilo)", qty: 20, unit: "kg", costPerUnit: 280 },
      { name: "Chicken (per kilo)", qty: 15, unit: "kg", costPerUnit: 190 },
      { name: "Rice (per sack)", qty: 2, unit: "sacks", costPerUnit: 1800 },
      { name: "Vegetables & sides", qty: 1, unit: "lot", costPerUnit: 6000 },
    ],
  },
  {
    id: "party-trays-50pax",
    label: "Party Trays (per 50 pax)",
    paxCount: 50,
    items: [
      { name: "Lechon Belly", qty: 1, unit: "tray", costPerUnit: 4500 },
      { name: "Pancit Palabok", qty: 1, unit: "tray", costPerUnit: 1800 },
      { name: "Garlic Rice", qty: 1, unit: "tray", costPerUnit: 1200 },
      { name: "Buko Pandan", qty: 1, unit: "tray", costPerUnit: 1500 },
    ],
  },
  {
    id: "tubs-10pax",
    label: "TUBS (per 10 pax)",
    paxCount: 10,
    items: [
      { name: "Chicken Adobo", qty: 1, unit: "tub", costPerUnit: 900 },
      { name: "Steamed Rice", qty: 1, unit: "tub", costPerUnit: 350 },
    ],
  },
];
