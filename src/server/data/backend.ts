export type DataBackend = "mock" | "supabase";

export function resolveDataBackend(value: string | undefined): DataBackend {
  if (value === undefined || value === "") return "mock";
  if (value === "mock" || value === "supabase") return value;
  throw new Error(`Unknown DATA_BACKEND "${value}". Expected "mock" or "supabase".`);
}
