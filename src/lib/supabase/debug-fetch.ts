/**
 * With DEBUG_SUPABASE=1 (development only), logs every Supabase request's
 * method, path and duration, to spot slow pages: each line is a round trip.
 * Query strings are left out: they can hold invite tokens and emails.
 */
export function supabaseFetch(label: string, baseUrl: string): typeof fetch | undefined {
  if (process.env.DEBUG_SUPABASE !== "1") return undefined;
  return async (input, init) => {
    const started = performance.now();
    const response = await fetch(input, init);
    const url = new URL(input instanceof Request ? input.url : String(input), baseUrl);
    const method = init?.method ?? (input instanceof Request ? input.method : "GET");
    console.log(`[supabase ${label}] ${Math.round(performance.now() - started)}ms ${method} ${url.pathname}`);
    return response;
  };
}
