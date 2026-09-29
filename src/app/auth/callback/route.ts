import { NextResponse, type NextRequest } from "next/server";
import { SIGN_IN_PATH, safeNextPath } from "@/lib/auth/routes";
import { getRepositories } from "@/server/data";

// The confirmation email's link lands here (Supabase): complete it, which signs
// the user in, then continue to ?next= (an invite) or "/" (onboarding).
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const confirmed = await getRepositories().auth.confirmEmail({
    code: params.get("code"),
    tokenHash: params.get("token_hash"),
    type: params.get("type"),
  });
  const destination = confirmed ? safeNextPath(params.get("next")) : `${SIGN_IN_PATH}?confirm=failed`;
  return NextResponse.redirect(new URL(destination, request.url));
}
