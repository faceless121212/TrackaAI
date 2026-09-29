// Plain-language summaries of the copilot's proposed changes, for its confirm cards.

type Input = Record<string, unknown> | undefined;

const str = (value: unknown) => (typeof value === "string" ? value : undefined);

export function describeChange(tool: string, input: Input): { title: string; details: string[] } {
  const key = str(input?.key);
  const details: string[] = [];
  const add = (label: string, value: unknown) => {
    if (value === undefined) return;
    if (value === null) details.push(`${label}: none`);
    else if (Array.isArray(value)) details.push(`${label}: ${value.length ? value.join(", ") : "none"}`);
    else details.push(`${label}: ${String(value)}`);
  };

  switch (tool) {
    case "move_task":
      return { title: key && input?.column ? `Move ${key} to ${String(input.column)}` : "Move a task", details };
    case "assign_task":
      if (!key) return { title: "Assign a task", details };
      return { title: input?.assignee ? `Assign ${key} to ${String(input.assignee)}` : `Unassign ${key}`, details };
    case "create_task":
      add("Column", input?.column);
      add("Priority", input?.priority);
      add("Assignee", input?.assignee);
      add("Labels", input?.labels);
      if (str(input?.description)) details.push("With a description");
      return { title: input?.title ? `Create “${String(input.title)}”` : "Create a task", details };
    case "update_task":
      add("Title", input?.title);
      add("Priority", input?.priority);
      add("Due date", input?.dueDate);
      add("Labels", input?.labels);
      if (str(input?.description) !== undefined) details.push("New description");
      return { title: key ? `Update ${key}` : "Update a task", details };
    default:
      return { title: tool, details };
  }
}
