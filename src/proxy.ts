import { NextResponse, type NextRequest } from "next/server";
import {
  AUTH_CALLBACK_PATH,
  SESSION_COOKIE,
  isOpenPath,
  isPublicPath,
  signInRedirectPath,
} from "@/lib/auth/routes";
import { resolveDataBackend } from "@/server/data/backend";
import { refreshSupabaseSession } from "@/server/data/supabase/proxy-session";

/** A redirect that keeps any cookies the session refresh set. */
function redirect(url: URL, from?: NextResponse) {
  const response = NextResponse.redirect(url);
  from?.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));
  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname, search, searchParams } = request.nextUrl;

  // Supabase falls back to the Site URL ("/?code=…") when a confirmation
  // redirect isn't allow-listed; forward it to the callback.
  if (pathname === "/" && searchParams.has("code")) {
    return NextResponse.redirect(new URL(`${AUTH_CALLBACK_PATH}${search}`, request.url));
  }
  if (isOpenPath(pathname)) return NextResponse.next();

  let hasSession: boolean;
  let response: NextResponse | undefined;
  if (resolveDataBackend(process.env.DATA_BACKEND) === "supabase") {
    const session = await refreshSupabaseSession(request);
    response = session.response;
    hasSession = session.userId !== null;
  } else {
    // Mock backend: optimistic cookie check; pages verify it via requireUser().
    hasSession = request.cookies.has(SESSION_COOKIE);
  }

  if (!hasSession && !isPublicPath(pathname)) {
    return redirect(new URL(signInRedirectPath(pathname, search), request.url), response);
  }
  if (hasSession && isPublicPath(pathname)) {
    return redirect(new URL("/", request.url), response);
  }
  return response ?? NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
