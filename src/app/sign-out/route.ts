import { NextResponse, type NextRequest } from "next/server";
import { SIGN_IN_PATH, withNext } from "@/lib/auth/routes";
import { getRepositories } from "@/server/data";

// Clears a stale session (see requireUser) or switches accounts from an invite
// (?next=/invite/<token>). Signing out from the UI uses signOutAction.
export async function GET(request: NextRequest) {
  await getRepositories().auth.signOut();
  const next = request.nextUrl.searchParams.get("next");
  return NextResponse.redirect(new URL(withNext(SIGN_IN_PATH, next), request.url));
}
