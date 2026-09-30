import "server-only";
import { notFound } from "next/navigation";
import { cache } from "react";
import { getRepositories } from "@/server/data";
import { requireUser, requireUserId } from "./session";

// Guards resolve an id (or team slug) up to its team and check the caller is a
// member, in one lookup that runs alongside loading the user's profile. So
// server actions can trust ids from the client: unknown ids and other teams'
// ids both 404.

async function withUser<T>(lookup: (userId: string) => Promise<T | null>) {
  const userId = await requireUserId();
  const [user, access] = await Promise.all([requireUser(), lookup(userId)]);
  if (!access) notFound();
  return { user, ...access };
}

/** Loads the team by slug and the caller's membership; 404s for non-members. */
export const requireTeamMember = cache((teamSlug: string) => withUser((id) => getRepositories().access.team(teamSlug, id)));

export const requireWorkspaceAccess = cache((workspaceId: string) =>
  withUser((id) => getRepositories().access.workspace(workspaceId, id)),
);

export const requireBoardAccess = cache((boardId: string) => withUser((id) => getRepositories().access.board(boardId, id)));

export const requireColumnAccess = cache((columnId: string) =>
  withUser((id) => getRepositories().access.column(columnId, id)),
);

export const requireTaskAccess = cache((taskId: string) => withUser((id) => getRepositories().access.task(taskId, id)));

export const requireLabelAccess = cache(async (labelId: string) => {
  const label = await getRepositories().labels.get(labelId);
  if (!label) notFound();
  const user = await requireUser();
  const membership = await getRepositories().memberships.get(label.teamId, user.id);
  if (!membership) notFound();
  return { user, membership, label };
});

export const requireInviteAccess = cache(async (inviteId: string) => {
  const invite = await getRepositories().invites.get(inviteId);
  if (!invite) notFound();
  const user = await requireUser();
  const membership = await getRepositories().memberships.get(invite.teamId, user.id);
  if (!membership) notFound();
  return { user, membership, invite };
});
