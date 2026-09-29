import { beforeEach, describe, expect, it } from "vitest";
import type { Team, User } from "@/lib/domain";
import { PlanLimitError } from "@/server/data/errors";
import { emptyDb } from "@/server/data/mock/db";
import { createMockRepositories } from "@/server/data/mock/repositories";
import { createMemoryStore } from "@/server/data/mock/store";
import type { Repositories } from "@/server/data/types";
import { monthStart } from "@/lib/domain";
import { assertSeatToJoin, assertWithinPlan, countNewInvitees } from "./limits";

let repos: Repositories;
let owner: User;
let team: Team;

beforeEach(async () => {
  repos = createMockRepositories(createMemoryStore(emptyDb()));
  ({ user: owner } = await repos.auth.signUp({ name: "Owner", email: "owner@example.test", password: "password1" }));
  team = await repos.teams.create({ name: "Acme", slug: "acme", ownerId: owner.id });
});

const onPlan = async (plan: Team["plan"]) => (team = await repos.teams.setPlan(team.id, plan));

describe("assertWithinPlan", () => {
  it("allows one project on Free, then names the plan to upgrade to", async () => {
    await assertWithinPlan(repos, team, "workspaces");
    await repos.workspaces.create({ teamId: team.id, name: "Eng", keyPrefix: "ENG" });
    const error = await assertWithinPlan(repos, team, "workspaces").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(PlanLimitError);
    expect(error).toMatchObject({ plan: "free", resource: "workspaces", message: expect.stringContaining("Lite") });
  });

  it("counts pending invites toward team size", async () => {
    await expect(assertWithinPlan(repos, team, "members")).rejects.toBeInstanceOf(PlanLimitError);
    await onPlan("lite");
    await assertWithinPlan(repos, team, "members", 2);
    await repos.invites.create({ teamId: team.id, emails: ["a@example.test"], invitedBy: owner.id });
    await assertWithinPlan(repos, team, "members", 1);
    await expect(assertWithinPlan(repos, team, "members", 2)).rejects.toBeInstanceOf(PlanLimitError);
  });

  it("never limits Pro", async () => {
    await onPlan("pro");
    await assertWithinPlan(repos, team, "members", 500);
    await assertWithinPlan(repos, team, "workspaces", 500);
  });
});

describe("AI runs", () => {
  it("allows the plan's runs this month, then asks to upgrade", async () => {
    const run = { teamId: team.id, userId: owner.id, feature: "task_writer" as const, model: "m" };
    for (let i = 0; i < 9; i++) await repos.aiUsage.startRun(run);
    await assertWithinPlan(repos, team, "aiRuns");
    await repos.aiUsage.startRun(run);
    const error = await assertWithinPlan(repos, team, "aiRuns").catch((e: unknown) => e);
    expect(error).toMatchObject({ plan: "free", resource: "aiRuns", message: expect.stringContaining("Lite") });
    await onPlan("pro");
    await assertWithinPlan(repos, team, "aiRuns");
  });

  it("counts from the first of the month (UTC)", () => {
    expect(monthStart(new Date("2026-09-29T18:00:00Z")).toISOString()).toBe("2026-09-01T00:00:00.000Z");
    expect(monthStart(new Date("2027-01-01T00:00:00Z")).toISOString()).toBe("2027-01-01T00:00:00.000Z");
  });
});

describe("assertSeatToJoin", () => {
  it("lets an invitee take the seat their invite holds, unless the team shrank below it", async () => {
    await onPlan("lite");
    await repos.invites.create({ teamId: team.id, emails: ["a@example.test", "b@example.test"], invitedBy: owner.id });
    await assertSeatToJoin(repos, team.id);
    await onPlan("free");
    await expect(assertSeatToJoin(repos, team.id)).rejects.toBeInstanceOf(PlanLimitError);
  });
});

describe("countNewInvitees", () => {
  it("ignores members, pending invitees and repeats, case-insensitively", async () => {
    await onPlan("lite");
    await repos.invites.create({ teamId: team.id, emails: ["pending@example.test"], invitedBy: owner.id });
    const emails = ["OWNER@example.test", "Pending@example.test", "new@example.test", "NEW@example.test"];
    expect(await countNewInvitees(repos, team.id, emails)).toBe(1);
  });
});
