export const KITCHEN_STAGES = ["Upcoming Orders", "White Board", "Procured", "Cooking", "Confirm"] as const;
export type KitchenStage = (typeof KITCHEN_STAGES)[number];

/** The stage a card moves to next, or null once it's reached the end of the board. */
export function nextStage(stage: KitchenStage): KitchenStage | null {
  const i = KITCHEN_STAGES.indexOf(stage);
  return i >= 0 && i < KITCHEN_STAGES.length - 1 ? KITCHEN_STAGES[i + 1] : null;
}

export type DishLine = { qty: number; name: string };

export type KitchenOrder = {
  id: string;
  orderNumber: string;
  customer: string;
  eventDate: string | null;
  eventTime: string | null;
  pax: number | null;
  quantityLabel: string | null;
  packageName: string;
  branch: string | null;
  deliveryMethod: string | null;
  instructions: string | null;
  dishes: DishLine[];
  stage: KitchenStage;
};
