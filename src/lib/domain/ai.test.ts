import { describe, expect, it } from "vitest";
import type { Label } from "./schemas";
import { breakdownSchema, matchLabelIds, taskDraftSchema, taskWriterRequestSchema } from "./ai";

const labels: Label[] = [
  { id: "l1", teamId: "t", name: "Bug", color: "red" },
  { id: "l2", teamId: "t", name: "Feature", color: "purple" },
];

describe("AI schemas", () => {
  it("accepts a full task draft and rejects unknown priorities", () => {
    const draft = { title: "Add CSV export", description: "## Acceptance criteria\n- [ ] Works", priority: "high", labels: ["Feature"] };
    expect(taskDraftSchema.parse(draft)).toEqual(draft);
    expect(taskDraftSchema.safeParse({ ...draft, priority: "critical" }).success).toBe(false);
  });

  it("asks for 3 to 8 sub-tasks", () => {
    const subtask = { title: "Step", description: "" };
    expect(breakdownSchema.safeParse({ subtasks: Array(2).fill(subtask) }).success).toBe(false);
    expect(breakdownSchema.safeParse({ subtasks: Array(3).fill(subtask) }).success).toBe(true);
    expect(breakdownSchema.safeParse({ subtasks: Array(9).fill(subtask) }).success).toBe(false);
  });

  it("limits the one-liner a user sends", () => {
    expect(taskWriterRequestSchema.safeParse({ boardId: "b", prompt: "  " }).success).toBe(false);
    expect(taskWriterRequestSchema.safeParse({ boardId: "b", prompt: "x".repeat(501) }).success).toBe(false);
    expect(taskWriterRequestSchema.parse({ boardId: "b", prompt: "  export csv " }).prompt).toBe("export csv");
  });
});

describe("matchLabelIds", () => {
  it("maps suggested names to the team's labels, ignoring case, unknowns and repeats", () => {
    expect(matchLabelIds(["feature", "Nope", "FEATURE", "bug"], labels)).toEqual(["l2", "l1"]);
    expect(matchLabelIds(undefined, labels)).toEqual([]);
  });
});
