import { describe, expect, it } from "vitest";
import { seedShowcaseDb } from "./showcase-seed";

describe("seedShowcaseDb", () => {
  it("builds a Pro team with people, an AI teammate and a full board", async () => {
    const db = await seedShowcaseDb();
    expect(db.teams).toEqual([expect.objectContaining({ slug: "acme", plan: "pro" })]);
    expect(db.memberships).toHaveLength(4);
    expect(db.agents).toHaveLength(1);
    expect(db.tasks.length).toBeGreaterThanOrEqual(12);
    expect(new Set(db.tasks.map((t) => t.columnId)).size).toBe(5);
  });
});
