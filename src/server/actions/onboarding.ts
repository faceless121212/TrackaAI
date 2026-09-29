"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import {
  createInvitesInputSchema,
  createTeamInputSchema,
  createWorkspaceInputSchema,
  parseEmailList,
} from "@/lib/domain";
import { formValues, type FormState } from "@/lib/forms";
import { boardPath, onboardingInvitePath, onboardingWorkspacePath, teamPath } from "@/lib/paths";
import { requireTeamMember } from "@/server/auth/guards";
import { assertCan } from "@/server/auth/permissions";
import { requireUser } from "@/server/auth/session";
import { ConflictError, getRepositories } from "@/server/data";

function conflictToFormState(error: unknown, values: Record<string, string>): FormState {
  if (error instanceof ConflictError) return { fieldErrors: { [error.field]: [error.message] }, values };
  throw error;
}

export async function createTeamAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const values = formValues(formData, ["name", "slug"]);
  const parsed = createTeamInputSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };

  try {
    await getRepositories().teams.create({ ...parsed.data, ownerId: user.id });
  } catch (error) {
    return conflictToFormState(error, values);
  }
  redirect(onboardingWorkspacePath(parsed.data.slug));
}

export async function createWorkspaceAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData, ["teamSlug", "name", "keyPrefix"]);
  const { team, membership } = await requireTeamMember(values.teamSlug);
  assertCan(membership.role, "workspace:create");
  const parsed = createWorkspaceInputSchema.safeParse({
    teamId: team.id,
    name: values.name,
    keyPrefix: values.keyPrefix.toUpperCase(),
  });
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };

  const repos = getRepositories();
  let boardId: string;
  try {
    const workspace = await repos.workspaces.create(parsed.data);
    // PRD §5.1: onboarding lands on a seeded default board.
    const board = await repos.boards.create({ workspaceId: workspace.id, name: workspace.name, description: null });
    boardId = board.id;
  } catch (error) {
    return conflictToFormState(error, values);
  }
  redirect(onboardingInvitePath(team.slug, boardId));
}

export async function sendInvitesAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData, ["teamSlug", "boardId", "emails"]);
  const { user, team, membership } = await requireTeamMember(values.teamSlug);
  assertCan(membership.role, "member:invite");
  const parsed = createInvitesInputSchema.safeParse({
    teamId: team.id,
    emails: parseEmailList(values.emails),
  });
  // Errors on individual addresses (emails.3) flatten onto "emails".
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };

  const invites = await getRepositories().invites.create({ ...parsed.data, invitedBy: user.id });
  for (const invite of invites) {
    // Invite emails are sent via Resend from M5; accepting invites arrives in M3.
    console.info(`[invite] ${invite.email} → /invite/${invite.token}`);
  }
  redirect(values.boardId ? boardPath(team.slug, values.boardId) : teamPath(team.slug));
}
