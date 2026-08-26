// One-off: (1) corrects the bootstrap account seeded by seed-admin.mjs
// (which always used role "Owner") down to "Developer" for a given email —
// there is no Owner account yet — and (2) creates a demo Kitchen Staff
// account for testing the new role/branch/page-access model.
//
// Usage: node scripts/seed-demo-staff.mjs
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

const DEVELOPER_EMAIL = "jhonarnoldfadriquila1@gmail.com";

const DEMO_EMAIL = "demo@gmail.com";
const DEMO_PASSWORD = "kusinang2026";
const DEMO_NAME = "Demo Staff";
const DEMO_BRANCHES = ["Cavite", "Laguna", "Metro Manila"];
const DEMO_PAGE_ACCESS = [
  "/dashboard",
  "/dashboard/kitchen",
  "/dashboard/orders",
  "/dashboard/bookings",
  "/dashboard/inventory",
  "/dashboard/staff-tasks",
];

async function fixDeveloperRole() {
  const { data, error } = await supabase
    .from("dashboard_profiles")
    .update({ role: "Developer" })
    .eq("email", DEVELOPER_EMAIL)
    .select("user_id, email, role");
  if (error) throw new Error(`Failed to update ${DEVELOPER_EMAIL}: ${error.message}`);
  if (!data || data.length === 0) {
    console.warn(`No dashboard_profiles row found for ${DEVELOPER_EMAIL} — skipped.`);
  } else {
    console.log(`Set ${DEVELOPER_EMAIL} to role Developer.`);
  }
}

async function seedDemoStaff() {
  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    email_confirm: true,
  });
  if (createError) throw new Error(`Failed to create auth user: ${createError.message}`);

  const userId = created.user.id;

  const { error: adminError } = await supabase.from("admins").upsert({ user_id: userId, email: DEMO_EMAIL });
  if (adminError) throw new Error(`Failed to insert into admins: ${adminError.message}`);

  const { error: profileError } = await supabase.from("dashboard_profiles").upsert({
    user_id: userId,
    name: DEMO_NAME,
    email: DEMO_EMAIL,
    role: "Kitchen Staff",
    branches: DEMO_BRANCHES,
    page_access: DEMO_PAGE_ACCESS,
    can_close_dates: false,
    status: "Active",
  });
  if (profileError) throw new Error(`Failed to insert into dashboard_profiles: ${profileError.message}`);

  console.log(`Created demo staff ${DEMO_EMAIL} (${userId}).`);
}

async function main() {
  await fixDeveloperRole();
  await seedDemoStaff();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
