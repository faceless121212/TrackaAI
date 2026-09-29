import { describe, expect, it } from "vitest";
import { ForbiddenError, assertCan, assignableRoles, can, canLeaveTeam, canManageMember } from "./permissions";

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
    "team:update",
    "label:manage",
  ] as const)("limits %s to owners and admins", (action) => {
    expect(can("owner", action)).toBe(true);
    expect(can("admin", action)).toBe(true);
    expect(can("member", action)).toBe(false);
  });

  it.each(["team:delete", "ownership:transfer"] as const)("limits %s to the owner", (action) => {
    expect(can("owner", action)).toBe(true);
    expect(can("admin", action)).toBe(false);
    expect(can("member", action)).toBe(false);
  });
});

describe("assertCan", () => {
  it("throws ForbiddenError when the role lacks the permission", () => {
    expect(() => assertCan("member", "member:invite")).toThrow(ForbiddenError);
    expect(() => assertCan("admin", "member:invite")).not.toThrow();
  });
});

describe("member management", () => {
  it("lets the owner manage admins and members, admins manage members, and nobody manage the owner", () => {
    expect(canManageMember("owner", "admin")).toBe(true);
    expect(canManageMember("owner", "member")).toBe(true);
    expect(canManageMember("admin", "member")).toBe(true);
    expect(canManageMember("admin", "admin")).toBe(false);
    expect(canManageMember("member", "member")).toBe(false);
    for (const actor of ["owner", "admin", "member"] as const) expect(canManageMember(actor, "owner")).toBe(false);
  });

  it("offers admin and member as assignable roles to managers only", () => {
    expect(assignableRoles("owner")).toEqual(["admin", "member"]);
    expect(assignableRoles("admin")).toEqual(["admin", "member"]);
    expect(assignableRoles("member")).toEqual([]);
  });

  it("requires the owner to hand over ownership before leaving", () => {
    expect(canLeaveTeam("owner")).toBe(false);
    expect(canLeaveTeam("admin")).toBe(true);
    expect(canLeaveTeam("member")).toBe(true);
  });
});
