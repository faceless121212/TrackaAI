import { describe, expect, it } from "vitest";
import { ForbiddenError, assertCan, can } from "./permissions";

describe("can", () => {
  it("lets every role read the team and create tasks", () => {
    for (const role of ["owner", "admin", "member"] as const) {
      expect(can(role, "team:read")).toBe(true);
      expect(can(role, "task:create")).toBe(true);
    }
  });

  it.each(["workspace:create", "board:create", "member:invite"] as const)(
    "limits %s to owners and admins",
    (action) => {
      expect(can("owner", action)).toBe(true);
      expect(can("admin", action)).toBe(true);
      expect(can("member", action)).toBe(false);
    },
  );
});

describe("assertCan", () => {
  it("throws ForbiddenError when the role lacks the permission", () => {
    expect(() => assertCan("member", "member:invite")).toThrow(ForbiddenError);
    expect(() => assertCan("admin", "member:invite")).not.toThrow();
  });
});
