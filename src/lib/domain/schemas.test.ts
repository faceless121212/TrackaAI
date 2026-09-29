import { describe, expect, it } from "vitest";
import {
  assigneeSchema,
  createInvitesInputSchema,
  createTaskInputSchema,
  keyPrefixSchema,
  signUpInputSchema,
  slugSchema,
  updateTaskInputSchema,
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
