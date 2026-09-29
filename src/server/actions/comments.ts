"use server";

import { refresh } from "next/cache";
import { createCommentInputSchema } from "@/lib/domain";
import { formValues, type ActionResult, type FormState } from "@/lib/forms";
import { requireTaskAccess } from "@/server/auth/guards";
import { ForbiddenError, assertCan, can } from "@/server/auth/permissions";
import { getRepositories } from "@/server/data";
import { toActionError, zodToFormState } from "./shared";

export async function addCommentAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData, ["taskId", "body"]);
  const { user, membership } = await requireTaskAccess(values.taskId);
  assertCan(membership.role, "comment:create");
  const parsed = createCommentInputSchema.safeParse(values);
  if (!parsed.success) return zodToFormState(parsed.error, values);

  await getRepositories().comments.create({ ...parsed.data, author: { kind: "user", userId: user.id } });
  refresh();
  return { ok: true };
}

/** Authors can delete their own comments; owners and admins can delete any. */
export async function deleteCommentAction(commentId: string): Promise<ActionResult> {
  try {
    const repos = getRepositories();
    const comment = await repos.comments.get(commentId);
    if (!comment) return { ok: false, error: "This item no longer exists." };
    const { user, membership } = await requireTaskAccess(comment.taskId);
    const isAuthor = comment.author.kind === "user" && comment.author.userId === user.id;
    if (!isAuthor && !can(membership.role, "comment:moderate")) {
      throw new ForbiddenError(membership.role, "comment:moderate");
    }
    await repos.comments.delete(commentId);
  } catch (error) {
    return toActionError(error);
  }
  refresh();
  return { ok: true };
}
