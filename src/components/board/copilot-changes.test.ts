import { describe, expect, it } from "vitest";
import { describeChange } from "./copilot-changes";

describe("describeChange", () => {
  it("says in plain words what each change will do", () => {
    expect(describeChange("move_task", { key: "ENG-3", column: "Done" })).toEqual({ title: "Move ENG-3 to Done", details: [], key: "ENG-3" });
    expect(describeChange("assign_task", { key: "ENG-3", assignee: "Ann" })).toMatchObject({ title: "Assign ENG-3 to Ann" });
    expect(describeChange("assign_task", { key: "ENG-3", assignee: null })).toMatchObject({ title: "Unassign ENG-3" });
    expect(
      describeChange("create_task", { title: "Add dark mode", column: "Todo", priority: "high", assignee: "me", labels: ["Feature"] }),
    ).toEqual({
      title: "Create “Add dark mode”",
      details: ["Column: Todo", "Priority: high", "Assignee: me", "Labels: Feature"],
    });
    expect(describeChange("update_task", { key: "ENG-2", title: "New", dueDate: null, labels: [] })).toEqual({
      title: "Update ENG-2",
      details: ["Title: New", "Due date: none", "Labels (replaces current): none"],
      key: "ENG-2",
    });
  });

  it("shows the full description text a change would write", () => {
    expect(describeChange("create_task", { title: "T", description: "See [docs](https://x.test)" }).text).toEqual({
      label: "Description",
      value: "See [docs](https://x.test)",
    });
    expect(describeChange("update_task", { key: "ENG-2", description: "" }).text).toEqual({
      label: "Replaces the description with",
      value: "(empty)",
    });
  });

  it("copes with input that is still streaming", () => {
    expect(describeChange("move_task", undefined)).toEqual({ title: "Move a task", details: [], key: undefined });
  });
});
