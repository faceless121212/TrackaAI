export const SESSION_COOKIE = "tracka_session";
export const SIGN_IN_PATH = "/sign-in";
export const SIGN_UP_PATH = "/sign-up";
export const SIGN_OUT_PATH = "/sign-out";
export const CHECK_EMAIL_PATH = "/sign-up/check-email";
export const AUTH_CALLBACK_PATH = "/auth/callback";
export const PRICING_PATH = "/pricing";

// Signed-in users are bounced from these to "/".
const PUBLIC_PATHS = [SIGN_IN_PATH, SIGN_UP_PATH];
// These skip the session check entirely (e.g. clearing a stale cookie).
const OPEN_PATHS = [SIGN_OUT_PATH, AUTH_CALLBACK_PATH];
// For everyone, signed in or not: the session is refreshed, nobody is redirected.
const SESSION_OPTIONAL_PATHS = [PRICING_PATH];

function matches(paths: string[], pathname: string): boolean {
  return paths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export function isPublicPath(pathname: string): boolean {
  return matches(PUBLIC_PATHS, pathname);
}

export function isOpenPath(pathname: string): boolean {
  return matches(OPEN_PATHS, pathname);
}

export function isSessionOptionalPath(pathname: string): boolean {
  return matches(SESSION_OPTIONAL_PATHS, pathname);
}

export function signInRedirectPath(pathname: string, search: string): string {
  const next = `${pathname}${search}`;
  return next === "/" ? SIGN_IN_PATH : `${SIGN_IN_PATH}?next=${encodeURIComponent(next)}`;
}

const NEXT_BASE = "http://next.invalid";

// Only allow same-origin relative paths, so ?next= can't be used as an open
// redirect. Resolving against a dummy origin catches every trick browsers
// normalise away ("//x", "/\\x", tabs/newlines inside "/\t/x").
export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/")) return "/";
  try {
    const url = new URL(next, NEXT_BASE);
    if (url.origin !== NEXT_BASE) return "/";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
}

/** Links between sign-in and sign-up keep the pending destination (e.g. an invite link). */
export function withNext(path: string, next: string | null | undefined): string {
  const safe = safeNextPath(next);
  return safe === "/" ? path : `${path}?next=${encodeURIComponent(safe)}`;
}
