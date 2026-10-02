import { describe, expect, it } from "vitest";
import { isResolved, statusOf } from "./status";

describe("statusOf", () => {
  it.each([
    ["Backlog", "backlog"],
    ["Todo", "todo"],
    ["In Progress", "started"],
    ["Doing", "started"],
    ["In Review", "review"],
    ["QA", "review"],
    ["Done", "done"],
    ["Shipped", "done"],
    ["Canceled", "canceled"],
    ["Won't do", "canceled"],
    ["Ideas", "todo"],
    // Negations must not read as the state they negate.
    ["Not started", "todo"],
    ["Not done", "todo"],
    ["Inactive", "todo"],
  ])("maps %j to %s", (name, status) => {
    expect(statusOf(name)).toBe(status);
  });
});

describe("isResolved", () => {
  it("is true only for done and canceled", () => {
    expect(["Done", "Won't do"].map((c) => isResolved(statusOf(c)))).toEqual([true, true]);
    expect(["Backlog", "Todo", "In Progress", "In Review"].map((c) => isResolved(statusOf(c)))).toEqual([false, false, false, false]);
  });
});
