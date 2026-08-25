// One-off cleanup: wipes public.orders and public.payments (test/dummy
// bookings created during development). change_requests, kitchen_stages,
// and inventory_reservations all reference orders with `on delete cascade`
// (see supabase/change_requests.sql, kitchen_stages.sql,
// inventory_reservations.sql), so deleting orders clears those too.
// Payments has no such FK guarantee in this repo (its schema lives in the
// herbies project) so it's deleted explicitly, before orders, either way.
//
// Usage: node scripts/clear-orders.mjs
import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

function loadEnvLocal() {
  const text = readFileSync(new URL("../.env.local", import.meta.url), "utf-8");
  const env = {};
  for (const line of text.split("\n")) {
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (match) env[match[1]] = match[2];
  }
  return env;
}

const env = loadEnvLocal();
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const { count: orderCount } = await supabase.from("orders").select("id", { count: "exact", head: true });
  const { count: paymentCount } = await supabase.from("payments").select("id", { count: "exact", head: true });
  console.log(`About to delete ${orderCount ?? 0} orders and ${paymentCount ?? 0} payments.`);

  const { error: paymentsError } = await supabase.from("payments").delete().not("id", "is", null);
  if (paymentsError) throw new Error(`Failed to delete payments: ${paymentsError.message}`);

  const { error: ordersError } = await supabase.from("orders").delete().not("id", "is", null);
  if (ordersError) throw new Error(`Failed to delete orders: ${ordersError.message}`);

  console.log("Done.");
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
