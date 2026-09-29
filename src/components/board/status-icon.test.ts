import { describe, expect, it } from "vitest";
import { statusOf } from "./status-icon";

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
