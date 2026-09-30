import { describe, expect, it } from "vitest";
import { assigneeValue, parseAssigneeValue } from "./forms";

describe("assignee picker values", () => {
  it("round-trip members, AI teammates and nobody", () => {
    for (const assignee of [null, { kind: "user", userId: "u1" }, { kind: "agent", agentId: "a1" }] as const) {
      expect(parseAssigneeValue(assigneeValue(assignee))).toEqual(assignee);
    }
    expect(parseAssigneeValue("")).toBeNull();
  });
});
