import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseConfig } from "@/lib/supabase/config";
import { supabaseFetch } from "@/lib/supabase/debug-fetch";
import type { Database } from "./database.types";

/**
 * A Supabase client bound to this request's session cookies, so every query
 * runs as the signed-in user and row-level security applies.
 */
export async function createSupabaseServerClient() {
  const { url, key } = supabaseConfig();
  const store = await cookies();
  return createServerClient<Database>(url, key, {
    global: { fetch: supabaseFetch("server", url) },
    cookies: {
      getAll: () => store.getAll(),
      setAll: (items) => {
        try {
          for (const { name, value, options } of items) store.set(name, value, options);
        } catch {
          // Server Components can't write cookies; proxy.ts refreshes the session instead.
        }
      },
    },
  });
}
