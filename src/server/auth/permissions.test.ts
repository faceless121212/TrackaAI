import { describe, expect, it } from "vitest";
import { ForbiddenError, assertCan, can } from "./permissions";

describe("can", () => {
  it.each(["team:read", "task:create", "task:update", "task:delete", "comment:create"] as const)(
    "lets every role %s",
    (action) => {
      for (const role of ["owner", "admin", "member"] as const) expect(can(role, action)).toBe(true);
    },
  );

  it.each([
    "workspace:create",
    "workspace:update",
    "workspace:delete",
    "board:create",
    "board:update",
    "board:delete",
    "column:manage",
    "comment:moderate",
    "member:invite",
  ] as const)("limits %s to owners and admins", (action) => {
    expect(can("owner", action)).toBe(true);
    expect(can("admin", action)).toBe(true);
    expect(can("member", action)).toBe(false);
  });
});

describe("assertCan", () => {
  it("throws ForbiddenError when the role lacks the permission", () => {
    expect(() => assertCan("member", "member:invite")).toThrow(ForbiddenError);
    expect(() => assertCan("admin", "member:invite")).not.toThrow();
  });
});
