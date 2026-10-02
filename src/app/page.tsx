import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LandingPage } from "@/components/marketing/landing-page";
import { SESSION_COOKIE, SIGN_OUT_PATH } from "@/lib/auth/routes";
import { ONBOARDING_PATH, teamPath } from "@/lib/paths";
import { getCurrentUser, getCurrentUserId } from "@/server/auth/session";
import { getRepositories } from "@/server/data";
import { resolveDataBackend } from "@/server/data/backend";

export const metadata: Metadata = {
  title: { absolute: "TrackaAI · Project management with AI teammates" },
  description:
    "Fast Kanban boards with AI built in: hand issues to AI teammates, ask your board anything and draft tasks from a sentence.",
};

// Visitors get the landing page; members go straight to their first team (or onboarding).
export default async function RootPage() {
  const user = await getCurrentUser();
  if (!user) {
    // A session the proxy accepts but that maps to no user would bounce between
    // here and /sign-in (the proxy sends signed-in visitors back to "/"):
    // a Supabase token whose user was deleted (verified locally, valid ~1 h), or
    // a dead mock cookie (the proxy only checks it exists). /sign-out clears it.
    const mockCookie = resolveDataBackend(process.env.DATA_BACKEND) === "mock" && (await cookies()).has(SESSION_COOKIE);
    if (mockCookie || (await getCurrentUserId()) !== null) redirect(SIGN_OUT_PATH);
    return <LandingPage />;
  }
  const [team] = await getRepositories().teams.listForUser(user.id);
  redirect(team ? teamPath(team.slug) : ONBOARDING_PATH);
}
