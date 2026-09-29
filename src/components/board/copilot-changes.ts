// Plain-language summaries of the copilot's proposed changes, for its confirm cards.
// Everything a change would write is shown, including full description text:
// the model may have been steered by text a teammate planted in a task.

type Input = Record<string, unknown> | undefined;

export type ChangeSummary = {
  title: string;
  details: string[];
  /** The task the change targets, so the card can show its current title. */
  key?: string;
  /** Long text the change would write, shown verbatim. */
  text?: { label: string; value: string };
};

const str = (value: unknown) => (typeof value === "string" ? value : undefined);

export function describeChange(tool: string, input: Input): ChangeSummary {
  const key = str(input?.key);
  const details: string[] = [];
  const add = (label: string, value: unknown) => {
    if (value === undefined) return;
    if (value === null) details.push(`${label}: none`);
    else if (Array.isArray(value)) details.push(`${label}: ${value.length ? value.join(", ") : "none"}`);
    else details.push(`${label}: ${String(value)}`);
  };
  const description = str(input?.description);

  switch (tool) {
    case "move_task":
      return { title: key && input?.column ? `Move ${key} to ${String(input.column)}` : "Move a task", details, key };
    case "assign_task":
      if (!key) return { title: "Assign a task", details };
      return { title: input?.assignee ? `Assign ${key} to ${String(input.assignee)}` : `Unassign ${key}`, details, key };
    case "create_task":
      add("Column", input?.column);
      add("Priority", input?.priority);
      add("Assignee", input?.assignee);
      add("Labels", input?.labels);
      return {
        title: input?.title ? `Create “${String(input.title)}”` : "Create a task",
        details,
        ...(description ? { text: { label: "Description", value: description } } : {}),
      };
    case "update_task":
      add("Title", input?.title);
      add("Priority", input?.priority);
      add("Due date", input?.dueDate);
      add("Labels (replaces current)", input?.labels);
      return {
        title: key ? `Update ${key}` : "Update a task",
        details,
        key,
        ...(description !== undefined
          ? { text: { label: "Replaces the description with", value: description || "(empty)" } }
          : {}),
      };
    default:
      return { title: tool, details };
  }
}
