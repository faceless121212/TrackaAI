export type DataBackend = "mock" | "supabase";

/**
 * The configured backend. On Vercel (`VERCEL` is set by the platform) the mock
 * backend is refused: its JSON file can't be written there, and its session
 * cookies would be signed with the development key.
 */
export function resolveDataBackend(value: string | undefined, onVercel = Boolean(process.env.VERCEL)): DataBackend {
  let backend: DataBackend;
  if (value === undefined || value === "") backend = "mock";
  else if (value === "mock" || value === "supabase") backend = value;
  else throw new Error(`Unknown DATA_BACKEND "${value}". Expected "mock" or "supabase".`);
  if (backend === "mock" && onVercel) {
    throw new Error("Set DATA_BACKEND=supabase (and the Supabase values) for this Vercel environment: the mock backend can't run on Vercel.");
  }
  return backend;
}
