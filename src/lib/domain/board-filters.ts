import { PRIORITIES, type Priority, type Task } from "./schemas";

/** `assignee` is "any", "me", "none" (unassigned) or a user id. */
export type BoardFilters = {
  assignee: string;
  priorities: Priority[];
  labelIds: string[];
  query: string;
};

export const EMPTY_FILTERS: BoardFilters = { assignee: "any", priorities: [], labelIds: [], query: "" };

const list = (value: string | null) => (value ? value.split(",").filter(Boolean) : []);

export function parseBoardFilters(params: URLSearchParams): BoardFilters {
  return {
    assignee: params.get("assignee") || "any",
    priorities: list(params.get("priority")).filter((p): p is Priority =>
      (PRIORITIES as readonly string[]).includes(p),
    ),
    labelIds: list(params.get("label")),
    query: (params.get("q") ?? "").trim(),
  };
}

/** Returns `base` with the filter params replaced; unrelated params (e.g. `task`) are kept. */
export function serializeBoardFilters(filters: BoardFilters, base = new URLSearchParams()): URLSearchParams {
  const params = new URLSearchParams(base);
  for (const key of ["assignee", "priority", "label", "q"]) params.delete(key);
  if (filters.assignee !== "any") params.set("assignee", filters.assignee);
  if (filters.priorities.length) params.set("priority", filters.priorities.join(","));
  if (filters.labelIds.length) params.set("label", filters.labelIds.join(","));
  if (filters.query) params.set("q", filters.query);
  return params;
}

export function isFiltered(filters: BoardFilters): boolean {
  return serializeBoardFilters(filters).size > 0;
}

export function filterTasks(tasks: Task[], filters: BoardFilters, currentUserId: string): Task[] {
  const query = filters.query.toLowerCase();
  const assigneeId = filters.assignee === "me" ? currentUserId : filters.assignee;

  return tasks.filter((task) => {
    if (filters.assignee === "none" && task.assignee !== null) return false;
    if (filters.assignee !== "any" && filters.assignee !== "none") {
      if (task.assignee?.kind !== "user" || task.assignee.userId !== assigneeId) return false;
    }
    if (filters.priorities.length && !filters.priorities.includes(task.priority)) return false;
    if (filters.labelIds.length && !task.labelIds.some((id) => filters.labelIds.includes(id))) return false;
    if (query && !task.title.toLowerCase().includes(query) && !task.key.toLowerCase().includes(query)) {
      return false;
    }
    return true;
  });
}
