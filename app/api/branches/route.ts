import { NextResponse } from "next/server";
import { getCurrentUser, hasFullAccess } from "@/lib/auth/current-user";
import { createBranch, getBranchRows } from "@/lib/mt/branches-server";
import { BRANCH_COLOR_NAMES } from "@/lib/mt/branch-colors";

export async function POST(request: Request) {
  const current = await getCurrentUser();
  if (!current || !hasFullAccess(current.role)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const color = typeof body?.color === "string" ? body.color : "";

  if (!name) {
    return NextResponse.json({ error: "Branch name is required." }, { status: 400 });
  }
  if (!BRANCH_COLOR_NAMES.includes(color as (typeof BRANCH_COLOR_NAMES)[number])) {
    return NextResponse.json({ error: "Invalid color." }, { status: 400 });
  }

  const existing = await getBranchRows();
  if (existing.some((b) => b.name.toLowerCase() === name.toLowerCase())) {
    return NextResponse.json({ error: "A branch with that name already exists." }, { status: 409 });
  }

  try {
    const branch = await createBranch({ name, color: color as (typeof BRANCH_COLOR_NAMES)[number] });
    return NextResponse.json({ branch });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create branch.";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
