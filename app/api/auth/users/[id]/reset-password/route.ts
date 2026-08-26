import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { can } from "@/lib/auth/permissions";
import { resetUserPassword } from "@/lib/auth/user-store";

function generatePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
  let out = "";
  for (let i = 0; i < 12; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const current = await getCurrentUser();
  if (!current || !can(current.role, "manage:users")) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const password = generatePassword();

  try {
    await resetUserPassword(params.id, password);
    return NextResponse.json({ password });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to reset password.";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
