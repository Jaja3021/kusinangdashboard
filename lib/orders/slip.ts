// The itemized breakdown behind an order — used by the Orders page's "View"
// action to show a printable-style slip (customer/event info, particulars,
// amounts) beyond what the OrderRecord row already carries.

import { getOrderWithMenuById } from "./data";
import { parseDishes } from "@/lib/kitchen/data";
import type { DishLine } from "@/lib/kitchen/types";

export type OrderSlip = {
  dishes: DishLine[];
  menuName: string | null;
  deliveryMethod: string | null;
  instructions: string | null;
  subtotal: number;
  deliveryFee: number;
  rushFee: number;
  depositAmount: number;
  amountPaid: number;
};

/** Null for an id getOrderWithMenuById can't find — including mock
 * (celebrity) orders, which never landed in Supabase and so have no
 * itemized slip to show. */
export async function getOrderSlip(id: string): Promise<OrderSlip | null> {
  const order = await getOrderWithMenuById(id);
  if (!order) return null;

  return {
    dishes: parseDishes({
      cart: order.cart,
      packedMealCart: order.packedMealCart,
      selectedDishes: order.selectedDishes,
      menuSnapshot: order.menuSnapshot,
    }),
    menuName: order.menuName,
    deliveryMethod: order.deliveryMethod,
    instructions: order.instructions,
    subtotal: order.subtotal,
    deliveryFee: order.deliveryFee,
    rushFee: order.rushFee,
    depositAmount: order.depositAmount,
    amountPaid: order.amountPaid,
  };
}
