import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Cookie-bound client used by every Server Component/Route Handler/Server
// Action. Next 14's cookies() is synchronous (unlike Next 16, which herbies
// runs and awaits it) — no await here.
export function createSupabaseServerClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Called from a Server Component render, where cookies can't be
            // written — middleware.ts refreshes the session on the next request.
          }
        },
      },
    },
  );
}
