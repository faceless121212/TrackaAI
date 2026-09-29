export const SESSION_COOKIE = "tracka_session";
export const SIGN_IN_PATH = "/sign-in";
export const SIGN_UP_PATH = "/sign-up";
export const SIGN_OUT_PATH = "/sign-out";

// Signed-in users are bounced from these to "/".
const PUBLIC_PATHS = [SIGN_IN_PATH, SIGN_UP_PATH];
// These skip the session check entirely (e.g. clearing a stale cookie).
const OPEN_PATHS = [SIGN_OUT_PATH];

function matches(paths: string[], pathname: string): boolean {
  return paths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export function isPublicPath(pathname: string): boolean {
  return matches(PUBLIC_PATHS, pathname);
}

export function isOpenPath(pathname: string): boolean {
  return matches(OPEN_PATHS, pathname);
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
