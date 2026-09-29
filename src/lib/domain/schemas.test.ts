import { describe, expect, it } from "vitest";
import {
  assigneeSchema,
  createCommentInputSchema,
  createInvitesInputSchema,
  createTaskInputSchema,
  keyPrefixSchema,
  labelInputSchema,
  labelSchema,
  signUpInputSchema,
  slugSchema,
  updateLabelInputSchema,
  updateProfileInputSchema,
  updateTaskInputSchema,
  updateTeamInputSchema,
} from "./schemas";

describe("keyPrefixSchema", () => {
  it.each(["ENG", "A1", "WEB22"])("accepts %s", (value) => {
    expect(keyPrefixSchema.safeParse(value).success).toBe(true);
  });

  it.each(["eng", "E", "TOOLONG", "1AB"])("rejects %s", (value) => {
    expect(keyPrefixSchema.safeParse(value).success).toBe(false);
  });
});

describe("slugSchema", () => {
  it.each(["acme", "acme-inc", "team42"])("accepts %s", (value) => {
    expect(slugSchema.safeParse(value).success).toBe(true);
  });

  it.each(["Acme", "-acme", "a", "acme--inc", "acme_inc"])("rejects %s", (value) => {
    expect(slugSchema.safeParse(value).success).toBe(false);
  });
});

describe("createTaskInputSchema", () => {
  it("trims the title and fills defaults", () => {
    expect(
      createTaskInputSchema.parse({ boardId: "b1", columnId: "c1", title: "  Fix login  " }),
    ).toEqual({
      boardId: "b1",
      columnId: "c1",
      title: "Fix login",
      description: "",
      priority: "none",
      assignee: null,
      labelIds: [],
      dueDate: null,
      parentId: null,
    });
  });

  it("rejects a blank title", () => {
    expect(
      createTaskInputSchema.safeParse({ boardId: "b1", columnId: "c1", title: "   " }).success,
    ).toBe(false);
  });

  it("rejects an unknown priority", () => {
    expect(
      createTaskInputSchema.safeParse({ boardId: "b1", columnId: "c1", title: "x", priority: "p0" })
        .success,
    ).toBe(false);
  });
});

describe("updateTaskInputSchema", () => {
  it("leaves unspecified fields out instead of defaulting them", () => {
    expect(updateTaskInputSchema.parse({})).toEqual({});
    expect(updateTaskInputSchema.parse({ priority: "high" })).toEqual({ priority: "high" });
  });
});

describe("assigneeSchema", () => {
  it("accepts users, agents and null", () => {
    expect(assigneeSchema.parse({ kind: "user", userId: "u1" })).toEqual({ kind: "user", userId: "u1" });
    expect(assigneeSchema.parse({ kind: "agent", agentId: "a1" })).toEqual({ kind: "agent", agentId: "a1" });
    expect(assigneeSchema.parse(null)).toBeNull();
  });
});

describe("reserved slugs", () => {
  it.each(["onboarding", "sign-in", "api"])("rejects %s", (value) => {
    expect(slugSchema.safeParse(value).success).toBe(false);
  });
});

describe("signUpInputSchema", () => {
  it("normalises the email", () => {
    expect(
      signUpInputSchema.parse({ name: "Ada", email: "  Ada@Example.TEST ", password: "longenough" }),
    ).toEqual({ name: "Ada", email: "ada@example.test", password: "longenough" });
  });

  it("requires at least 8 password characters", () => {
    const result = signUpInputSchema.safeParse({ name: "Ada", email: "a@b.test", password: "short" });
    expect(result.success).toBe(false);
  });
});

describe("createInvitesInputSchema", () => {
  it("rejects an empty list and invalid emails", () => {
    expect(createInvitesInputSchema.safeParse({ teamId: "t1", emails: [] }).success).toBe(false);
    expect(createInvitesInputSchema.safeParse({ teamId: "t1", emails: ["nope"] }).success).toBe(false);
  });

  it("caps a batch at 10", () => {
    const emails = Array.from({ length: 11 }, (_, i) => `u${i}@example.test`);
    expect(createInvitesInputSchema.safeParse({ teamId: "t1", emails }).success).toBe(false);
  });
});

describe("labels and comments", () => {
  it("accepts palette colours only", () => {
    expect(labelSchema.safeParse({ id: "l", teamId: "t", name: "Bug", color: "red" }).success).toBe(true);
    expect(labelSchema.safeParse({ id: "l", teamId: "t", name: "Bug", color: "#ff0000" }).success).toBe(false);
  });

  it("trims comment bodies and rejects blank ones", () => {
    expect(createCommentInputSchema.parse({ taskId: "t", body: "  hi  " })).toEqual({ taskId: "t", body: "hi" });
    expect(createCommentInputSchema.safeParse({ taskId: "t", body: "   " }).success).toBe(false);
  });
});

describe("profile, team and label inputs", () => {
  it("accepts a profile with an optional avatar URL and a theme", () => {
    expect(updateProfileInputSchema.parse({ name: " Ada ", avatarUrl: null, theme: "light" })).toEqual({
      name: "Ada",
      avatarUrl: null,
      theme: "light",
    });
    expect(updateProfileInputSchema.safeParse({ name: "Ada", avatarUrl: "not a url", theme: "dark" }).success).toBe(false);
    expect(updateProfileInputSchema.safeParse({ name: "Ada", avatarUrl: null, theme: "sepia" }).success).toBe(false);
  });

  it("validates label names and colours", () => {
    expect(labelInputSchema.parse({ name: " Ops ", color: "green" })).toEqual({ name: "Ops", color: "green" });
    expect(labelInputSchema.safeParse({ name: "", color: "green" }).success).toBe(false);
    expect(updateLabelInputSchema.parse({ color: "pink" })).toEqual({ color: "pink" });
  });

  it("renames teams", () => {
    expect(updateTeamInputSchema.parse({ name: " Acme 2 " })).toEqual({ name: "Acme 2" });
  });

  it("defaults invites to the member role and never invites owners", () => {
    expect(createInvitesInputSchema.parse({ teamId: "t", emails: ["a@b.test"] }).role).toBe("member");
    expect(createInvitesInputSchema.parse({ teamId: "t", emails: ["a@b.test"], role: "admin" }).role).toBe("admin");
    expect(createInvitesInputSchema.safeParse({ teamId: "t", emails: ["a@b.test"], role: "owner" }).success).toBe(false);
  });
});
