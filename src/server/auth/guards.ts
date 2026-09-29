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

// The helpers below resolve an entity id up to its team and check membership,
// so server actions can trust ids coming from the client. Unknown ids and
// other teams' ids both 404.

export const requireWorkspaceAccess = cache(async (workspaceId: string) => {
  const user = await requireUser();
  const repos = getRepositories();
  const workspace = await repos.workspaces.get(workspaceId);
  const team = workspace ? await repos.teams.get(workspace.teamId) : null;
  const membership = team ? await repos.memberships.get(team.id, user.id) : null;
  if (!workspace || !team || !membership) notFound();
  return { user, team, membership, workspace };
});

export const requireBoardAccess = cache(async (boardId: string) => {
  const board = await getRepositories().boards.get(boardId);
  if (!board) notFound();
  return { ...(await requireWorkspaceAccess(board.workspaceId)), board };
});

export const requireColumnAccess = cache(async (columnId: string) => {
  const column = await getRepositories().boards.getColumn(columnId);
  if (!column) notFound();
  return { ...(await requireBoardAccess(column.boardId)), column };
});

export const requireTaskAccess = cache(async (taskId: string) => {
  const task = await getRepositories().tasks.get(taskId);
  if (!task) notFound();
  return { ...(await requireBoardAccess(task.boardId)), task };
});

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
