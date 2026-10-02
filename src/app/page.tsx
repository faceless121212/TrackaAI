import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LandingPage } from "@/components/marketing/landing-page";
import { SESSION_COOKIE, SIGN_OUT_PATH } from "@/lib/auth/routes";
import { ONBOARDING_PATH, teamPath } from "@/lib/paths";
import { getCurrentUser } from "@/server/auth/session";
import { getRepositories } from "@/server/data";

export const metadata: Metadata = {
  title: { absolute: "TrackaAI · Project management with AI teammates" },
  description:
    "Fast Kanban boards with AI built in: hand issues to AI teammates, ask your board anything and draft tasks from a sentence.",
};

// Visitors get the landing page; members go straight to their first team (or onboarding).
export default async function RootPage() {
  const user = await getCurrentUser();
  if (!user) {
    // A dead mock-backend cookie would make the proxy bounce /sign-in back here;
    // /sign-out clears it first. (Supabase sessions are validated in the proxy.)
    if ((await cookies()).has(SESSION_COOKIE)) redirect(SIGN_OUT_PATH);
    return <LandingPage />;
  }
  const [team] = await getRepositories().teams.listForUser(user.id);
  redirect(team ? teamPath(team.slug) : ONBOARDING_PATH);
}
