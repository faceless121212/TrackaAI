/**
 * With DEBUG_SUPABASE=1, logs every Supabase request with its duration (to spot
 * slow pages: each line is a round trip). Otherwise the default fetch.
 */
export function supabaseFetch(label: string, baseUrl: string): typeof fetch | undefined {
  if (process.env.DEBUG_SUPABASE !== "1") return undefined;
  return async (input, init) => {
    const started = performance.now();
    const response = await fetch(input, init);
    const path = String(input instanceof Request ? input.url : input).replace(baseUrl, "");
    console.log(`[supabase ${label}] ${Math.round(performance.now() - started)}ms ${path.slice(0, 120)}`);
    return response;
  };
}
