// One-off bootstrap: creates the first dashboard admin account directly in
// Supabase (Auth user + admins row + dashboard_profiles row), bypassing the
// chicken-and-egg problem that the "Add User" flow itself requires an
// existing admin to be signed in. Re-run for any future project/reset.
//
// Usage: node scripts/seed-admin.mjs <email> <password> <name>
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
const [email, password, ...nameParts] = process.argv.slice(2);
const name = nameParts.join(" ");

if (!email || !password || !name) {
  console.error("Usage: node scripts/seed-admin.mjs <email> <password> <name>");
  process.exit(1);
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createError) throw new Error(`Failed to create auth user: ${createError.message}`);

  const userId = created.user.id;

  const { error: adminError } = await supabase.from("admins").upsert({ user_id: userId, email });
  if (adminError) throw new Error(`Failed to insert into admins: ${adminError.message}`);

  const { error: profileError } = await supabase.from("dashboard_profiles").upsert({
    user_id: userId,
    name,
    email,
    role: "Owner",
    branch: "All Branches",
    status: "Active",
  });
  if (profileError) throw new Error(`Failed to insert into dashboard_profiles: ${profileError.message}`);

  console.log(`Created admin ${email} (${userId}).`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
