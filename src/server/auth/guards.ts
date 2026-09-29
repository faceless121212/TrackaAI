import "server-only";
import { notFound } from "next/navigation";
import { cache } from "react";
import { getRepositories } from "@/server/data";
import { requireUser } from "./session";

/** Loads the team by slug and the caller's membership; 404s for non-members. */
export const requireTeamMember = cache(async (teamSlug: string) => {
  const user = await requireUser();
  const repos = getRepositories();
  const team = await repos.teams.getBySlug(teamSlug);
  const membership = team ? await repos.memberships.get(team.id, user.id) : null;
  if (!team || !membership) notFound();
  return { user, team, membership };
});
