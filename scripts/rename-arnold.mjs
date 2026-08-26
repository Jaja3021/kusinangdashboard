// One-off: reattributes admin_expenses.logged_by rows from "Ralph -
// MultiplyTalents" to "Arnold-MultiplyTalents" (dummy-data cleanup only —
// does not touch Ralph's actual account profile).
//
// Usage: node scripts/rename-arnold.mjs
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

const OLD_NAME = "Ralph - MultiplyTalents";
const NEW_NAME = "Arnold-MultiplyTalents";

async function main() {
  const { data, error } = await supabase
    .from("admin_expenses")
    .update({ logged_by: NEW_NAME })
    .eq("logged_by", OLD_NAME)
    .select("id");
  if (error) throw new Error(`Failed to update admin_expenses: ${error.message}`);
  console.log(`Updated ${data.length} admin_expenses row(s) from "${OLD_NAME}" to "${NEW_NAME}".`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
