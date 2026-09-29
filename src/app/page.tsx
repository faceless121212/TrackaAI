import { redirect } from "next/navigation";
import { ONBOARDING_PATH, teamPath } from "@/lib/paths";
import { requireUser } from "@/server/auth/session";
import { getRepositories } from "@/server/data";

// "/" only routes: to the user's first team, or to onboarding if they have none.
export default async function RootPage() {
  const user = await requireUser();
  const [team] = await getRepositories().teams.listForUser(user.id);
  redirect(team ? teamPath(team.slug) : ONBOARDING_PATH);
}
