import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, isPublicPath, signInRedirectPath } from "@/lib/auth/routes";

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSession = request.cookies.has(SESSION_COOKIE);

  if (!hasSession && !isPublicPath(pathname)) {
    return NextResponse.redirect(new URL(signInRedirectPath(pathname, search), request.url));
  }
  if (hasSession && isPublicPath(pathname)) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
