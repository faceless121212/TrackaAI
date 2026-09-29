import { describe, expect, it } from "vitest";
import { describeChange } from "./copilot-changes";

describe("describeChange", () => {
  it("says in plain words what each change will do", () => {
    expect(describeChange("move_task", { key: "ENG-3", column: "Done" })).toEqual({ title: "Move ENG-3 to Done", details: [] });
    expect(describeChange("assign_task", { key: "ENG-3", assignee: "Ann" })).toEqual({ title: "Assign ENG-3 to Ann", details: [] });
    expect(describeChange("assign_task", { key: "ENG-3", assignee: null })).toEqual({ title: "Unassign ENG-3", details: [] });
    expect(
      describeChange("create_task", { title: "Add dark mode", column: "Todo", priority: "high", assignee: "me", labels: ["Feature"] }),
    ).toEqual({
      title: "Create “Add dark mode”",
      details: ["Column: Todo", "Priority: high", "Assignee: me", "Labels: Feature"],
    });
    expect(describeChange("update_task", { key: "ENG-2", title: "New", dueDate: null, labels: [] })).toEqual({
      title: "Update ENG-2",
      details: ["Title: New", "Due date: none", "Labels: none"],
    });
  });

  it("copes with input that is still streaming", () => {
    expect(describeChange("move_task", undefined)).toEqual({ title: "Move a task", details: [] });
  });
});
