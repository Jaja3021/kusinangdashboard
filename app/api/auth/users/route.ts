import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { createUser, type UserAccount } from "@/lib/auth/user-store";

const VALID_ROLES: UserAccount["role"][] = [
  "Owner",
  "Branch Manager",
  "Event Coordinator",
  "Finance Officer",
  "Staff",
];

export async function POST(request: Request) {
  const current = await getCurrentUser();
  if (!current || current.role !== "Owner") {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const role = typeof body?.role === "string" ? body.role : "";
  const branch = typeof body?.branch === "string" ? body.branch.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!name || !email || !branch || password.length < 8) {
    return NextResponse.json(
      { error: "Name, email, branch, and an 8+ character password are required." },
      { status: 400 },
    );
  }
  if (!VALID_ROLES.includes(role as UserAccount["role"])) {
    return NextResponse.json({ error: "Invalid role." }, { status: 400 });
  }

  try {
    const account = await createUser({
      name,
      email,
      role: role as UserAccount["role"],
      branch,
      password,
    });
    return NextResponse.json({ account });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create user.";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
