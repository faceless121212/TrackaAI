import { canAdd, type PlanResource, type Team } from "@/lib/domain";
import { PlanLimitError } from "@/server/data/errors";
import type { Repositories } from "@/server/data/types";

// The one place server actions check plan limits (the database enforces the
// same limits as a backstop). Pass getRepositories() from the caller.

/** Throws PlanLimitError unless `adding` more of `resource` fit the team's plan. */
export async function assertWithinPlan(
  repos: Repositories,
  team: Pick<Team, "id" | "plan">,
  resource: PlanResource,
  adding = 1,
): Promise<void> {
  const used = await currentUse(repos, team.id, resource);
  if (!canAdd(team.plan, resource, used, adding)) throw new PlanLimitError(team.plan, resource);
}

/** The first moment of the current calendar month (UTC): AI runs reset then. */
export function monthStart(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

async function currentUse(repos: Repositories, teamId: string, resource: PlanResource): Promise<number> {
  if (resource === "aiRuns") return repos.aiUsage.countSince(teamId, monthStart());
  const usage = await repos.teams.usage(teamId);
  return resource === "members" ? usage.members + usage.pendingInvites : usage.workspaces;
}

/**
 * For accepting an invite: the invite already holds a seat, so only members
 * count. Fails if the team moved to a smaller plan after inviting.
 */
export async function assertSeatToJoin(repos: Repositories, teamId: string): Promise<void> {
  // On Supabase an invitee can't read the team yet; the database's member
  // limit trigger makes the same check inside accept_invite.
  const team = await repos.teams.get(teamId);
  if (!team) return;
  const usage = await repos.teams.usage(teamId);
  if (!canAdd(team.plan, "members", usage.members)) throw new PlanLimitError(team.plan, "members");
}

/** How many of `emails` would become new invites (members and pending invitees are skipped). */
export async function countNewInvitees(repos: Repositories, teamId: string, emails: string[]): Promise<number> {
  const [members, pending] = await Promise.all([
    repos.memberships.listMembers(teamId),
    repos.invites.listPending(teamId),
  ]);
  const taken = new Set([...members.map((m) => m.user.email), ...pending.map((i) => i.email)].map((e) => e.toLowerCase()));
  return new Set(emails.map((e) => e.toLowerCase()).filter((e) => !taken.has(e))).size;
}
