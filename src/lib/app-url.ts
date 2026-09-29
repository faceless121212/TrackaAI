/**
 * The origin used for links that leave the app (invite links, emails). The
 * request's Host / X-Forwarded-Host headers can be spoofed, so production must
 * configure APP_URL; development falls back to the request host.
 */
export function resolveAppOrigin({
  appUrl,
  host,
  proto,
  production,
}: {
  appUrl?: string | null;
  host?: string | null;
  proto?: string | null;
  production: boolean;
}): string {
  if (appUrl) return new URL(appUrl).origin;
  if (production) throw new Error("Set APP_URL (e.g. https://tracka.app) so emailed links can't be spoofed via Host headers.");
  const resolvedHost = host ?? "localhost:3000";
  const protocol = proto ?? (resolvedHost.startsWith("localhost") ? "http" : "https");
  return `${protocol}://${resolvedHost}`;
}
