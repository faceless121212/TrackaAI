import { describe, expect, it } from "vitest";
import type { Column, Task } from "@/lib/domain";
import { columnReducer, groupTasks, planTaskMove, taskReducer } from "./board-state";

function task(id: string, columnId: string, position: string): Task {
  return {
    id,
    boardId: "b",
    columnId,
    number: 1,
    key: `ENG-${id}`,
    title: id,
    description: "",
    priority: "none",
    assignee: null,
    labelIds: [],
    dueDate: null,
    position,
    parentId: null,
    createdBy: "u",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

const column = (id: string, position: string): Column => ({ id, boardId: "b", name: id, position });

const TASKS = [task("a", "todo", "a0"), task("b", "todo", "a1"), task("c", "todo", "a2"), task("d", "done", "a0")];

describe("groupTasks", () => {
  it("buckets tasks by column in position order, with empty columns present", () => {
    const grouped = groupTasks([column("todo", "a0"), column("done", "a1"), column("empty", "a2")], [...TASKS].reverse());
    expect(grouped.todo.map((t) => t.id)).toEqual(["a", "b", "c"]);
    expect(grouped.done.map((t) => t.id)).toEqual(["d"]);
    expect(grouped.empty).toEqual([]);
  });
});

describe("taskReducer", () => {
  it("moves, updates, adds and deletes", () => {
    const moved = taskReducer(TASKS, { type: "move", id: "a", columnId: "done", position: "a1" });
    expect(moved.find((t) => t.id === "a")).toMatchObject({ columnId: "done", position: "a1" });
    const updated = taskReducer(TASKS, { type: "update", id: "b", patch: { priority: "high" } });
    expect(updated.find((t) => t.id === "b")?.priority).toBe("high");
    expect(taskReducer(TASKS, { type: "add", task: task("e", "todo", "Zz") })).toHaveLength(5);
    expect(taskReducer(TASKS, { type: "delete", id: "a" }).map((t) => t.id)).toEqual(["b", "c", "d"]);
  });
});

describe("columnReducer", () => {
  const columns = [column("x", "a0"), column("y", "a1")];

  it("keeps columns sorted after a move and supports rename/add/delete", () => {
    expect(columnReducer(columns, { type: "move", id: "y", position: "Zz" }).map((c) => c.id)).toEqual(["y", "x"]);
    expect(columnReducer(columns, { type: "rename", id: "x", name: "X" })[0].name).toBe("X");
    expect(columnReducer(columns, { type: "add", column: column("z", "a2") }).map((c) => c.id)).toEqual(["x", "y", "z"]);
    expect(columnReducer(columns, { type: "delete", id: "x" }).map((c) => c.id)).toEqual(["y"]);
  });
});

describe("planTaskMove", () => {
  it("computes index and a position between the new neighbours", () => {
    const plan = planTaskMove(TASKS, "c", "todo", ["a", "c", "b"]);
    expect(plan?.index).toBe(1);
    expect(plan!.position > "a0" && plan!.position < "a1").toBe(true);
  });

  it("moves across columns", () => {
    expect(planTaskMove(TASKS, "a", "done", ["d", "a"])).toMatchObject({ index: 1 });
  });

  it("returns null when the task ends where it started", () => {
    expect(planTaskMove(TASKS, "b", "todo", ["a", "b", "c"])).toBeNull();
  });

  it("respects hidden (filtered-out) tasks", () => {
    // Only a and c visible; c dropped first → lands before a in the full list.
    expect(planTaskMove(TASKS, "c", "todo", ["c", "a"])).toMatchObject({ index: 0 });
  });
});
