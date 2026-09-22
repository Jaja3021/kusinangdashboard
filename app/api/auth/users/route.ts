import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { can } from "@/lib/auth/permissions";
import { CREATABLE_ROLES } from "@/lib/auth/roles";
import { ALL_PAGE_PATHS } from "@/lib/auth/page-access";
import { getBranchRows } from "@/lib/mt/branches-server";
import { createUser, type UserAccount } from "@/lib/auth/user-store";

export async function POST(request: Request) {
  const current = await getCurrentUser();
  if (!current || !can(current.role, "manage:users")) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const role = typeof body?.role === "string" ? body.role : "";
  const branches = Array.isArray(body?.branches) ? body.branches.filter((b: unknown) => typeof b === "string") : [];
  const pageAccess = Array.isArray(body?.pageAccess)
    ? body.pageAccess.filter((p: unknown) => typeof p === "string" && ALL_PAGE_PATHS.includes(p))
    : [];
  const canCloseDates = body?.canCloseDates === true;
  const password = typeof body?.password === "string" ? body.password : "";

  if (!name || !email || password.length < 8) {
    return NextResponse.json(
      { error: "Name, email, and an 8+ character password are required." },
      { status: 400 },
    );
  }
  if (!CREATABLE_ROLES.includes(role as (typeof CREATABLE_ROLES)[number])) {
    return NextResponse.json({ error: "Invalid role." }, { status: 400 });
  }
  const branchNames = (await getBranchRows()).map((b) => b.name);
  if (branches.length === 0 || !branches.every((b: string) => branchNames.includes(b))) {
    return NextResponse.json({ error: "Select at least one valid branch." }, { status: 400 });
  }
  if (pageAccess.length === 0) {
    return NextResponse.json({ error: "Select at least one valid page." }, { status: 400 });
  }

  try {
    const account = await createUser({
      name,
      email,
      role: role as UserAccount["role"],
      branches,
      pageAccess,
      canCloseDates,
      password,
    });
    return NextResponse.json({ account });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create user.";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
