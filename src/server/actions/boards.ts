"use server";

import { refresh, revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { columnNameSchema, createBoardInputSchema, updateBoardInputSchema } from "@/lib/domain";
import { formValues, type ActionResult, type FormState } from "@/lib/forms";
import { boardPath, teamPath } from "@/lib/paths";
import { requireBoardAccess, requireColumnAccess, requireWorkspaceAccess } from "@/server/auth/guards";
import { assertCan } from "@/server/auth/permissions";
import { getRepositories } from "@/server/data";
import { toActionError, zodToFormState } from "./shared";

export async function createBoardAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData, ["workspaceId", "name"]);
  const { team, membership } = await requireWorkspaceAccess(values.workspaceId);
  assertCan(membership.role, "board:create");
  const parsed = createBoardInputSchema.safeParse({ workspaceId: values.workspaceId, name: values.name });
  if (!parsed.success) return zodToFormState(parsed.error, values);

  const board = await getRepositories().boards.create(parsed.data);
  // Redirects keep the shared [team] layout; revalidate it so the sidebar lists the board.
  revalidatePath(teamPath(team.slug), "layout");
  redirect(boardPath(team.slug, board.id));
}

export async function updateBoardAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData, ["boardId", "name", "description"]);
  const { membership } = await requireBoardAccess(values.boardId);
  assertCan(membership.role, "board:update");
  const parsed = updateBoardInputSchema.safeParse({
    name: values.name,
    description: values.description.trim() || null,
  });
  if (!parsed.success) return zodToFormState(parsed.error, values);

  await getRepositories().boards.update(values.boardId, parsed.data);
  refresh();
  return { ok: true };
}

export async function deleteBoardAction(boardId: string): Promise<void> {
  const { team, membership } = await requireBoardAccess(boardId);
  assertCan(membership.role, "board:delete");
  await getRepositories().boards.delete(boardId);
  revalidatePath(teamPath(team.slug), "layout");
  redirect(teamPath(team.slug));
}

export async function addColumnAction(boardId: string, name: string): Promise<ActionResult> {
  try {
    const { membership } = await requireBoardAccess(boardId);
    assertCan(membership.role, "column:manage");
    await getRepositories().boards.createColumn(boardId, columnNameSchema.parse(name));
  } catch (error) {
    return toActionError(error);
  }
  refresh();
  return { ok: true };
}

export async function renameColumnAction(columnId: string, name: string): Promise<ActionResult> {
  try {
    const { membership } = await requireColumnAccess(columnId);
    assertCan(membership.role, "column:manage");
    await getRepositories().boards.renameColumn(columnId, columnNameSchema.parse(name));
  } catch (error) {
    return toActionError(error);
  }
  refresh();
  return { ok: true };
}

export async function moveColumnAction(columnId: string, index: number): Promise<ActionResult> {
  try {
    const { membership } = await requireColumnAccess(columnId);
    assertCan(membership.role, "column:manage");
    await getRepositories().boards.moveColumn(columnId, index);
  } catch (error) {
    return toActionError(error);
  }
  refresh();
  return { ok: true };
}

export async function deleteColumnAction(columnId: string): Promise<ActionResult> {
  try {
    const { membership } = await requireColumnAccess(columnId);
    assertCan(membership.role, "column:manage");
    await getRepositories().boards.deleteColumn(columnId);
  } catch (error) {
    return toActionError(error);
  }
  refresh();
  return { ok: true };
}
