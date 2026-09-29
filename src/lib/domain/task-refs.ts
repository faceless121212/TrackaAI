import type { UpdateTaskInput } from "./schemas";

/**
 * Returns the first field of a task patch that points outside the team
 * (assignee not a member, label from another team), or null if all is well.
 * AI-agent assignees are rejected until agents exist (M9).
 */
export function invalidTaskRef(
  patch: Pick<UpdateTaskInput, "assignee" | "labelIds">,
  context: { memberIds: ReadonlySet<string>; labelIds: ReadonlySet<string> },
): "assignee" | "labelIds" | null {
  if (patch.assignee && (patch.assignee.kind !== "user" || !context.memberIds.has(patch.assignee.userId))) {
    return "assignee";
  }
  if (patch.labelIds?.some((id) => !context.labelIds.has(id))) return "labelIds";
  return null;
}
