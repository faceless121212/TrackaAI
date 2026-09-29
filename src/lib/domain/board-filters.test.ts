import { describe, expect, it } from "vitest";
import {
  EMPTY_FILTERS,
  filterTasks,
  isFiltered,
  parseBoardFilters,
  serializeBoardFilters,
  type BoardFilters,
} from "./board-filters";
import type { Task } from "./schemas";

function task(overrides: Partial<Task>): Task {
  return {
    id: "t",
    boardId: "b",
    columnId: "c",
    number: 1,
    key: "ENG-1",
    title: "Task",
    description: "",
    priority: "none",
    assignee: null,
    labelIds: [],
    dueDate: null,
    position: "a0",
    parentId: null,
    createdBy: "u1",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

const TASKS = [
  task({ id: "a", key: "ENG-1", title: "Fix login", priority: "high", assignee: { kind: "user", userId: "me" }, labelIds: ["bug"] }),
  task({ id: "b", key: "ENG-2", title: "Write docs", priority: "low", assignee: { kind: "user", userId: "ann" }, labelIds: ["docs"] }),
  task({ id: "c", key: "ENG-3", title: "Refactor", priority: "none" }),
];

const ids = (filters: Partial<BoardFilters>) =>
  filterTasks(TASKS, { ...EMPTY_FILTERS, ...filters }, "me").map((t) => t.id);

describe("filterTasks", () => {
  it("returns everything without filters", () => {
    expect(ids({})).toEqual(["a", "b", "c"]);
  });

  it("filters by assignee: me, unassigned or a specific user", () => {
    expect(ids({ assignee: "me" })).toEqual(["a"]);
    expect(ids({ assignee: "none" })).toEqual(["c"]);
    expect(ids({ assignee: "ann" })).toEqual(["b"]);
  });

  it("matches any selected priority and any selected label", () => {
    expect(ids({ priorities: ["high", "none"] })).toEqual(["a", "c"]);
    expect(ids({ labelIds: ["docs", "bug"] })).toEqual(["a", "b"]);
  });

  it("searches title and key, case-insensitively", () => {
    expect(ids({ query: "login" })).toEqual(["a"]);
    expect(ids({ query: "eng-3" })).toEqual(["c"]);
  });

  it("combines filters with AND", () => {
    expect(ids({ priorities: ["high", "low"], labelIds: ["docs"] })).toEqual(["b"]);
  });
});

describe("URL round-trip", () => {
  it("parses known values and drops unknown priorities", () => {
    const params = new URLSearchParams("assignee=me&priority=high,bogus,low&label=l1,l2&q=%20login%20&task=ENG-1");
    expect(parseBoardFilters(params)).toEqual({
      assignee: "me",
      priorities: ["high", "low"],
      labelIds: ["l1", "l2"],
      query: "login",
    });
  });

  it("writes only non-default filters and keeps other params", () => {
    const base = new URLSearchParams("task=ENG-1&priority=urgent");
    const next = serializeBoardFilters({ ...EMPTY_FILTERS, priorities: ["high"], query: "x" }, base);
    expect(next.toString()).toBe("task=ENG-1&priority=high&q=x");
    expect(serializeBoardFilters(EMPTY_FILTERS, base).toString()).toBe("task=ENG-1");
  });

  it("knows when any filter is active", () => {
    expect(isFiltered(EMPTY_FILTERS)).toBe(false);
    expect(isFiltered({ ...EMPTY_FILTERS, query: "x" })).toBe(true);
  });
});
