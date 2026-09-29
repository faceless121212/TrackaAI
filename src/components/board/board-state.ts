import { byPosition, indexInFullList, positionAt, type Column, type Task } from "@/lib/domain";

// Pure helpers behind the board's optimistic UI (useOptimistic reducers) and drag & drop.

export type TaskAction =
  | { type: "move"; id: string; columnId: string; position: string }
  | { type: "update"; id: string; patch: Partial<Task> }
  | { type: "add"; task: Task }
  | { type: "delete"; id: string };

export function taskReducer(tasks: Task[], action: TaskAction): Task[] {
  switch (action.type) {
    case "move":
      return tasks.map((t) =>
        t.id === action.id ? { ...t, columnId: action.columnId, position: action.position } : t,
      );
    case "update":
      return tasks.map((t) => (t.id === action.id ? { ...t, ...action.patch } : t));
    case "add":
      return [...tasks, action.task];
    case "delete":
      return tasks.filter((t) => t.id !== action.id);
  }
}

export type ColumnAction =
  | { type: "move"; id: string; position: string }
  | { type: "rename"; id: string; name: string }
  | { type: "add"; column: Column }
  | { type: "delete"; id: string };

export function columnReducer(columns: Column[], action: ColumnAction): Column[] {
  switch (action.type) {
    case "move":
      return columns.map((c) => (c.id === action.id ? { ...c, position: action.position } : c)).sort(byPosition);
    case "rename":
      return columns.map((c) => (c.id === action.id ? { ...c, name: action.name } : c));
    case "add":
      return [...columns, action.column].sort(byPosition);
    case "delete":
      return columns.filter((c) => c.id !== action.id);
  }
}

/** Tasks per column id, each list in position order; every column gets a list. */
export function groupTasks(columns: Column[], tasks: Task[]): Record<string, Task[]> {
  const grouped: Record<string, Task[]> = Object.fromEntries(columns.map((c) => [c.id, []]));
  for (const task of [...tasks].sort(byPosition)) grouped[task.columnId]?.push(task);
  return grouped;
}

/**
 * Where `taskId` lands when dropped into `columnId`, given the column's visible
 * ids after the drop (filters may hide some tasks). Returns the index the
 * server expects (among the column's other tasks) and the matching position,
 * or null if the task ends where it started.
 */
export function planTaskMove(
  tasks: Task[],
  taskId: string,
  columnId: string,
  visibleIdsAfterDrop: string[],
): { index: number; position: string } | null {
  const task = tasks.find((t) => t.id === taskId);
  if (!task) return null;
  const others = tasks.filter((t) => t.columnId === columnId && t.id !== taskId).sort(byPosition);
  const index = indexInFullList(
    others.map((t) => t.id),
    visibleIdsAfterDrop,
    taskId,
  );
  if (task.columnId === columnId && others.filter((t) => t.position < task.position).length === index) {
    return null;
  }
  return { index, position: positionAt(others.map((t) => t.position), index) };
}
