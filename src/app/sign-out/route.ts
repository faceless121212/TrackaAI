import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, SIGN_IN_PATH } from "@/lib/auth/routes";

// Clears a stale session cookie (see requireUser). Signing out from the UI
// uses the signOutAction server action instead.
export function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL(SIGN_IN_PATH, request.url));
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
