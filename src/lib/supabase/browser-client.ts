"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/server/data/supabase/database.types";

let client: SupabaseClient<Database> | undefined;

/**
 * The browser's Supabase client (reads the session from cookies). Only used
 * for realtime; data access stays on the server behind the repositories.
 */
export function getBrowserSupabase(url: string, key: string) {
  client ??= createBrowserClient<Database>(url, key);
  return client;
}
