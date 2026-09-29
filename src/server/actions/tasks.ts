"use server";

import { refresh } from "next/cache";
import { createSubtasksInputSchema, createTaskInputSchema, updateTaskInputSchema, type UpdateTaskInput } from "@/lib/domain";
import { formValues, type ActionResult, type FormState } from "@/lib/forms";
import { requireBoardAccess, requireColumnAccess, requireTaskAccess } from "@/server/auth/guards";
import { assertCan } from "@/server/auth/permissions";
import { getRepositories } from "@/server/data";
import { assertTaskRefs, conflictToFormState, toActionError, zodToFormState } from "./shared";

export async function createTaskAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData, ["boardId", "columnId", "title", "description", "priority", "assignee"]);
  const { user, team, membership } = await requireBoardAccess(values.boardId);
  assertCan(membership.role, "task:create");
  const parsed = createTaskInputSchema.safeParse({
    boardId: values.boardId,
    columnId: values.columnId,
    title: values.title,
    description: values.description,
    priority: values.priority || undefined,
    assignee: values.assignee && values.assignee !== "none" ? { kind: "user", userId: values.assignee } : null,
    labelIds: formData.getAll("labelIds").map(String),
  });
  if (!parsed.success) return zodToFormState(parsed.error, values);

  try {
    await assertTaskRefs(team.id, parsed.data);
    await getRepositories().tasks.create({ ...parsed.data, createdBy: user.id });
  } catch (error) {
    return conflictToFormState(error, values);
  }
  refresh();
  return { ok: true };
}

/** Quick-add from the top of a column: title only, inserted first. */
export async function quickAddTaskAction(columnId: string, title: string): Promise<ActionResult> {
  try {
    const { user, membership, column } = await requireColumnAccess(columnId);
    assertCan(membership.role, "task:create");
    const input = createTaskInputSchema.parse({ boardId: column.boardId, columnId, title });
    await getRepositories().tasks.create({ ...input, createdBy: user.id, placement: "start" });
  } catch (error) {
    return toActionError(error);
  }
  refresh();
  return { ok: true };
}

export async function updateTaskAction(taskId: string, patch: UpdateTaskInput): Promise<ActionResult> {
  try {
    const { team, membership } = await requireTaskAccess(taskId);
    assertCan(membership.role, "task:update");
    const parsed = updateTaskInputSchema.parse(patch);
    await assertTaskRefs(team.id, parsed);
    await getRepositories().tasks.update(taskId, parsed);
  } catch (error) {
    return toActionError(error);
  }
  refresh();
  return { ok: true };
}

/** Moves a task to `index` among the other tasks of `columnId` (see indexInFullList). */
export async function moveTaskAction(taskId: string, columnId: string, index: number): Promise<ActionResult> {
  try {
    const { membership } = await requireTaskAccess(taskId);
    assertCan(membership.role, "task:update");
    await getRepositories().tasks.move(taskId, { columnId, index: Math.max(0, Math.trunc(index)) });
  } catch (error) {
    return toActionError(error);
  }
  refresh();
  return { ok: true };
}

export async function deleteTaskAction(taskId: string): Promise<ActionResult> {
  try {
    const { membership } = await requireTaskAccess(taskId);
    assertCan(membership.role, "task:delete");
    await getRepositories().tasks.delete(taskId);
  } catch (error) {
    return toActionError(error);
  }
  refresh();
  return { ok: true };
}

/** Creates the sub-tasks the user picked from an AI breakdown, at the end of the parent's column. */
export async function createSubtasksAction(parentId: string, subtasks: unknown): Promise<ActionResult> {
  try {
    const { user, membership, task: parent } = await requireTaskAccess(parentId);
    assertCan(membership.role, "task:create");
    const items = createSubtasksInputSchema.parse(subtasks);
    const repos = getRepositories();
    for (const item of items) {
      const input = createTaskInputSchema.parse({
        boardId: parent.boardId,
        columnId: parent.columnId,
        title: item.title,
        description: item.description,
        parentId: parent.id,
      });
      await repos.tasks.create({ ...input, createdBy: user.id });
    }
  } catch (error) {
    return toActionError(error);
  }
  refresh();
  return { ok: true };
}
