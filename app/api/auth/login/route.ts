import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email : "";
  const password = typeof body?.password === "string" ? body.password : "";

  const invalid = () =>
    NextResponse.json({ error: "Invalid email or password." }, { status: 401 });

  if (!email || !password) return invalid();

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) return invalid();

  const { data: profile } = await supabase
    .from("dashboard_profiles")
    .select("status")
    .eq("user_id", data.user.id)
    .maybeSingle();

  if (!profile || profile.status !== "Active") {
    await supabase.auth.signOut();
    return invalid();
  }

  return NextResponse.json({ ok: true });
}
