import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseConfig } from "@/lib/supabase/config";
import type { Database } from "./database.types";

/**
 * Refreshes the Supabase session for this request (rotating cookies when the
 * access token expires) and reports who is signed in. Any redirect proxy.ts
 * issues must carry `response`'s cookies, or the refreshed session is lost.
 */
export async function refreshSupabaseSession(request: NextRequest) {
  const { url, key } = supabaseConfig();
  let response = NextResponse.next({ request });
  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (items) => {
        for (const { name, value } of items) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of items) response.cookies.set(name, value, options);
      },
    },
  });
  const { data } = await supabase.auth.getUser();
  return { response, userId: data.user?.id ?? null };
}
