import type { UpdateTaskInput } from "./schemas";

/**
 * Returns the first field of a task patch that points outside the team
 * (assignee not a member or the team's AI teammate, label from another team),
 * or null if all is well.
 */
export function invalidTaskRef(
  patch: Pick<UpdateTaskInput, "assignee" | "labelIds">,
  context: { memberIds: ReadonlySet<string>; agentIds: ReadonlySet<string>; labelIds: ReadonlySet<string> },
): "assignee" | "labelIds" | null {
  const assignee = patch.assignee;
  if (assignee) {
    const known =
      assignee.kind === "user" ? context.memberIds.has(assignee.userId) : context.agentIds.has(assignee.agentId);
    if (!known) return "assignee";
  }
  if (patch.labelIds?.some((id) => !context.labelIds.has(id))) return "labelIds";
  return null;
}
