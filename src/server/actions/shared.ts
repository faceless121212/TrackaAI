import "server-only";
import { headers } from "next/headers";
import { z } from "zod";
import type { CreateWorkspaceInput, Invite, Role, Team, UpdateTaskInput } from "@/lib/domain";
import { invalidTaskRef } from "@/lib/domain";
import { resolveAppOrigin } from "@/lib/app-url";
import type { ActionResult, FormState } from "@/lib/forms";
import { invitePath, settingsPath } from "@/lib/paths";
import { ForbiddenError, can } from "@/server/auth/permissions";
import { assertWithinPlan, countNewInvitees } from "@/server/billing/limits";
import { ConflictError, NotFoundError, PlanLimitError, getRepositories } from "@/server/data";

// Helpers for the "use server" modules in this folder (not an action module itself).

/**
 * Maps a ConflictError to form errors. For a plan limit, `team` adds a link to
 * the plans; only the owner can upgrade, so everyone else is told to ask them.
 */
export function conflictToFormState(
  error: unknown,
  values: Record<string, string>,
  team?: { slug: string; role: Role },
): FormState {
  if (error instanceof PlanLimitError) {
    if (!team) return { formError: error.message, values };
    const owner = can(team.role, "billing:manage");
    return {
      formError: owner ? error.message : `${error.message} Ask the team owner to upgrade.`,
      upgradeHref: settingsPath(team.slug, "billing"),
      values,
    };
  }
  if (error instanceof ConflictError) return { fieldErrors: { [error.field]: [error.message] }, values };
  throw error;
}

export function zodToFormState(error: z.ZodError, values: Record<string, string>): FormState {
  return { fieldErrors: z.flattenError(error).fieldErrors, values };
}

/** Maps expected failures to a message for a toast; rethrows anything else. */
export function toActionError(error: unknown): ActionResult {
  if (error instanceof ConflictError || error instanceof ForbiddenError) return { ok: false, error: error.message };
  if (error instanceof NotFoundError) return { ok: false, error: "This item no longer exists." };
  if (error instanceof z.ZodError) return { ok: false, error: error.issues[0]?.message ?? "Invalid input" };
  throw error;
}

/** Creates a workspace plus its default board (PRD §5.1). */
export async function createWorkspaceWithBoard(team: Pick<Team, "id" | "plan">, input: CreateWorkspaceInput) {
  const repos = getRepositories();
  await assertWithinPlan(repos, team, "workspaces");
  const workspace = await repos.workspaces.create(input);
  const board = await repos.boards.create({ workspaceId: workspace.id, name: workspace.name, description: null });
  return { workspace, board };
}

/** Rejects assignees who aren't team members and labels from other teams. */
export async function assertTaskRefs(teamId: string, patch: Pick<UpdateTaskInput, "assignee" | "labelIds">) {
  const repos = getRepositories();
  const [members, labels] = await Promise.all([repos.memberships.list(teamId), repos.labels.listForTeam(teamId)]);
  const field = invalidTaskRef(patch, {
    memberIds: new Set(members.map((m) => m.userId)),
    labelIds: new Set(labels.map((l) => l.id)),
  });
  if (field) throw new ConflictError(field, field === "assignee" ? "Pick a member of this team" : "Unknown label");
}

/** Absolute URL for a path, for links that leave the app (invite links, emails). */
export async function absoluteUrl(path: string): Promise<string> {
  const h = await headers();
  const origin = resolveAppOrigin({
    appUrl: process.env.APP_URL,
    host: h.get("x-forwarded-host") ?? h.get("host"),
    proto: h.get("x-forwarded-proto"),
    production: process.env.NODE_ENV === "production",
  });
  return `${origin}${path}`;
}

/** Sends invite emails. Until Resend arrives in M5 the link is only logged; the members page can copy it. */
export async function deliverInvites(invites: Invite[]) {
  for (const invite of invites) {
    console.info(`[invite] ${invite.email} (${invite.role}) → ${await absoluteUrl(invitePath(invite.token))}`);
  }
}

/** Throws PlanLimitError if inviting `emails` would take the team past its plan's size. */
export async function assertRoomForInvites(team: Pick<Team, "id" | "plan">, emails: string[]) {
  const repos = getRepositories();
  const adding = await countNewInvitees(repos, team.id, emails);
  if (adding > 0) await assertWithinPlan(repos, team, "members", adding);
}
