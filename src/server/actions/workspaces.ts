"use server";

import { refresh, revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createWorkspaceInputSchema, updateWorkspaceInputSchema } from "@/lib/domain";
import { formValues, type FormState } from "@/lib/forms";
import { boardPath, teamPath } from "@/lib/paths";
import { requireTeamMember, requireWorkspaceAccess } from "@/server/auth/guards";
import { assertCan } from "@/server/auth/permissions";
import { getRepositories } from "@/server/data";
import { conflictToFormState, createWorkspaceWithBoard, zodToFormState } from "./shared";

export async function createWorkspaceAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData, ["teamSlug", "name", "keyPrefix"]);
  const { team, membership } = await requireTeamMember(values.teamSlug);
  assertCan(membership.role, "workspace:create");
  const parsed = createWorkspaceInputSchema.safeParse({
    teamId: team.id,
    name: values.name,
    keyPrefix: values.keyPrefix.toUpperCase(),
  });
  if (!parsed.success) return zodToFormState(parsed.error, values);

  let boardId: string;
  try {
    boardId = (await createWorkspaceWithBoard(parsed.data)).board.id;
  } catch (error) {
    return conflictToFormState(error, values);
  }
  // Redirects keep the shared [team] layout; revalidate it so the sidebar shows the new workspace.
  revalidatePath(teamPath(team.slug), "layout");
  redirect(boardPath(team.slug, boardId));
}

export async function renameWorkspaceAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData, ["workspaceId", "name"]);
  const { membership } = await requireWorkspaceAccess(values.workspaceId);
  assertCan(membership.role, "workspace:update");
  const parsed = updateWorkspaceInputSchema.safeParse({ name: values.name });
  if (!parsed.success) return zodToFormState(parsed.error, values);

  await getRepositories().workspaces.update(values.workspaceId, parsed.data);
  refresh();
  return { ok: true };
}

export async function deleteWorkspaceAction(workspaceId: string): Promise<void> {
  const { team, membership } = await requireWorkspaceAccess(workspaceId);
  assertCan(membership.role, "workspace:delete");
  await getRepositories().workspaces.delete(workspaceId);
  revalidatePath(teamPath(team.slug), "layout");
  redirect(teamPath(team.slug));
}
