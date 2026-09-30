import { describe, expect, it, vi } from "vitest";

// Production builds can load this module twice (route handlers vs pages) while
// sharing one cached repositories instance; instanceof must still work.
async function freshCopy() {
  vi.resetModules();
  return import("./errors");
}

describe("repository errors", () => {
  it("are recognised across separate copies of the module", async () => {
    const a = await freshCopy();
    const b = await freshCopy();
    expect(a.RateLimitError).not.toBe(b.RateLimitError);

    expect(new a.RateLimitError(60)).toBeInstanceOf(b.RateLimitError);
    expect(new a.NotFoundError("Task", "1")).toBeInstanceOf(b.NotFoundError);
    expect(new a.ConflictError("slug", "Taken")).toBeInstanceOf(b.ConflictError);
    const limit = new a.PlanLimitError("free", "aiRuns");
    expect(limit).toBeInstanceOf(b.PlanLimitError);
    expect(limit).toBeInstanceOf(b.ConflictError); // still a conflict, as before
  });

  it("don't match each other or plain errors", async () => {
    const { ConflictError, NotFoundError, PlanLimitError, RateLimitError } = await freshCopy();
    expect(new ConflictError("slug", "Taken")).not.toBeInstanceOf(PlanLimitError);
    expect(new NotFoundError("Task", "1")).not.toBeInstanceOf(ConflictError);
    expect(new RateLimitError(60)).not.toBeInstanceOf(ConflictError);
    expect(new Error("x")).not.toBeInstanceOf(NotFoundError);
    expect(null).not.toBeInstanceOf(NotFoundError);
  });
});
