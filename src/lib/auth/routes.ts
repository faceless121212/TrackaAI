export const SESSION_COOKIE = "tracka_session";
export const SIGN_IN_PATH = "/sign-in";

const PUBLIC_PATHS = [SIGN_IN_PATH];

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export function signInRedirectPath(pathname: string, search: string): string {
  const next = `${pathname}${search}`;
  return next === "/" ? SIGN_IN_PATH : `${SIGN_IN_PATH}?next=${encodeURIComponent(next)}`;
}

// Only allow same-origin relative paths, so ?next= can't be used as an open redirect.
export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return "/";
  }
  return next;
}
