import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, SIGN_IN_PATH, withNext } from "@/lib/auth/routes";

// Clears a stale session cookie (see requireUser) or switches accounts from an
// invite (?next=/invite/<token>). Signing out from the UI uses signOutAction.
export function GET(request: NextRequest) {
  const next = request.nextUrl.searchParams.get("next");
  const response = NextResponse.redirect(new URL(withNext(SIGN_IN_PATH, next), request.url));
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
