import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseConfig } from "@/lib/supabase/config";
import type { Database } from "./database.types";
import { createSupabaseServerClient } from "./server-client";

/**
 * A client for work that continues after the response (after()): it carries
 * only the current access token, never the refresh token, so it can't rotate
 * the session (the new cookies could no longer reach the browser, and reusing
 * the old refresh token would sign the user out). Call it while the request is
 * still open; queries run as that user, with RLS.
 */
export async function createAccessTokenClient() {
  const session = (await (await createSupabaseServerClient()).auth.getSession()).data.session;
  if (!session) throw new Error("Not signed in");
  const { url, key } = supabaseConfig();
  return createClient<Database>(url, key, {
    global: { headers: { Authorization: `Bearer ${session.access_token}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
