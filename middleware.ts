import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Optimistic route guard for /dashboard — the real authorization boundary is
// the RLS policies on orders/packages/dashboard_profiles, since API routes
// and Server Actions are independently callable and this only covers page
// navigation.
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, {
              ...options,
              sameSite: "none",
              secure: true,
            }),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && pathname.startsWith("/dashboard")) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  if (user && pathname.startsWith("/dashboard") && pathname !== "/dashboard") {
    const { data: profile } = await supabase
      .from("dashboard_profiles")
      .select("role, page_access")
      .eq("user_id", user.id)
      .maybeSingle();

    const fullAccess = profile?.role === "Owner" || profile?.role === "Developer";
    const pageAccess: string[] = profile?.page_access ?? [];
    // Same boundary rule as lib/auth/page-access.ts's hasPageAccess (kept
    // inline rather than imported so this Edge-runtime middleware doesn't
    // pull in that module's client-side dependency chain): a grant matches
    // itself or a real sub-route, never a sibling that merely shares the
    // prefix (a grant of /dashboard/kitchen must not also cover
    // /dashboard/kitchen-today or /dashboard/kitchen-board).
    const allowed =
      fullAccess ||
      pageAccess.some((granted) => pathname === granted || pathname.startsWith(`${granted}/`));

    if (!allowed) {
      const dashboardUrl = request.nextUrl.clone();
      dashboardUrl.pathname = "/dashboard";
      return NextResponse.redirect(dashboardUrl);
    }
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/login"],
};
