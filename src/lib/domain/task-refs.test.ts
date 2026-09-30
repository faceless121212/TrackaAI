import { describe, expect, it } from "vitest";
import { invalidTaskRef } from "./task-refs";

const context = { memberIds: new Set(["u1"]), agentIds: new Set(["a1"]), labelIds: new Set(["l1", "l2"]) };

describe("invalidTaskRef", () => {
  it("accepts members, the team's agents, team labels, null assignees and untouched fields", () => {
    expect(invalidTaskRef({ assignee: { kind: "user", userId: "u1" }, labelIds: ["l1"] }, context)).toBeNull();
    expect(invalidTaskRef({ assignee: { kind: "agent", agentId: "a1" } }, context)).toBeNull();
    expect(invalidTaskRef({ assignee: null }, context)).toBeNull();
    expect(invalidTaskRef({}, context)).toBeNull();
  });

  it("rejects non-members, other teams' agents and foreign labels", () => {
    expect(invalidTaskRef({ assignee: { kind: "user", userId: "x" } }, context)).toBe("assignee");
    expect(invalidTaskRef({ assignee: { kind: "agent", agentId: "other" } }, context)).toBe("assignee");
    expect(invalidTaskRef({ labelIds: ["l1", "other"] }, context)).toBe("labelIds");
  });
});
