// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";
import { createTaskInputSchema, type User } from "@/lib/domain";
import { emptyDb } from "@/server/data/mock/db";
import { createMockRepositories } from "@/server/data/mock/repositories";
import { createMemoryStore } from "@/server/data/mock/store";
import type { Repositories } from "@/server/data/types";
import { createAskTools } from "./tools";

let repos: Repositories;
let owner: User;
let mate: User;
let tools: ReturnType<typeof createAskTools>;

const call = { toolCallId: "t", messages: [] } as never;
type Tools = typeof tools;
type Output<K extends keyof Tools> = Exclude<Awaited<ReturnType<NonNullable<Tools[K]["execute"]>>>, AsyncIterable<unknown>>;
const run = <K extends keyof Tools>(name: K, input: Parameters<NonNullable<Tools[K]["execute"]>>[0]) =>
  tools[name].execute!(input as never, call) as Promise<Output<K>>;
const keys = (result: { issues: { key: string }[] }) => result.issues.map((i) => i.key);

// Team "acme": boards Eng (ENG) and Ops (OPS). Another team's board must never show up.
beforeEach(async () => {
  repos = createMockRepositories(createMemoryStore(emptyDb()));
  ({ user: owner } = await repos.auth.signUp({ name: "Owner Person", email: "owner@example.test", password: "password1" }));
  const team = await repos.teams.setPlan((await repos.teams.create({ name: "Acme", slug: "acme", ownerId: owner.id })).id, "pro");
  const [invite] = await repos.invites.create({ teamId: team.id, emails: ["ann@example.test"], invitedBy: owner.id });
  ({ user: mate } = await repos.auth.signUp({ name: "Ann Lee", email: "ann@example.test", password: "password1" }));
  await repos.invites.accept(invite.token, mate.id);

  const eng = await repos.workspaces.create({ teamId: team.id, name: "Eng", keyPrefix: "ENG" });
  const ops = await repos.workspaces.create({ teamId: team.id, name: "Ops", keyPrefix: "OPS" });
  const engBoard = await repos.boards.create({ workspaceId: eng.id, name: "Engineering", description: null });
  const opsBoard = await repos.boards.create({ workspaceId: ops.id, name: "Operations", description: null });
  const [, todo, doing, review, done] = await repos.boards.listColumns(engBoard.id);
  const [opsBacklog] = await repos.boards.listColumns(opsBoard.id);
  const [bug] = await repos.labels.listForTeam(team.id);
  const agent = await repos.agents.create(team.id, { name: "Spec writer", specialty: "Specs", createdBy: owner.id });
  const add = (boardId: string, columnId: string, title: string, extra: Record<string, unknown> = {}) =>
    repos.tasks.create({ ...createTaskInputSchema.parse({ boardId, columnId, title, ...extra }), createdBy: owner.id });

  await add(engBoard.id, todo.id, "Fix login bug", { priority: "urgent", labelIds: [bug.id], assignee: { kind: "user", userId: mate.id }, description: "Users get logged out" }); // ENG-1
  await add(engBoard.id, doing.id, "Write docs", { priority: "low", dueDate: "2020-01-01", assignee: { kind: "user", userId: owner.id } }); // ENG-2 overdue
  await add(engBoard.id, review.id, "Review API", { priority: "high", dueDate: "2020-01-01" }); // ENG-3 overdue, unassigned
  await add(engBoard.id, done.id, "Old work", { priority: "urgent", dueDate: "2020-01-01" }); // ENG-4 done: never overdue or open
  await add(engBoard.id, todo.id, "Draft spec", { assignee: { kind: "agent", agentId: agent.id } }); // ENG-5
  await add(opsBoard.id, opsBacklog.id, "Rotate keys", { priority: "high", assignee: { kind: "user", userId: mate.id } }); // OPS-1

  const rivalOwner = (await repos.auth.signUp({ name: "Rival", email: "rival@example.test", password: "password1" })).user;
  const rival = await repos.teams.create({ name: "Rival", slug: "rival", ownerId: rivalOwner.id });
  const rivalWs = await repos.workspaces.create({ teamId: rival.id, name: "R", keyPrefix: "RIV" });
  const rivalBoard = await repos.boards.create({ workspaceId: rivalWs.id, name: "Rival board", description: null });
  await repos.tasks.create({
    ...createTaskInputSchema.parse({ boardId: rivalBoard.id, columnId: (await repos.boards.listColumns(rivalBoard.id))[0].id, title: "Secret", priority: "urgent" }),
    createdBy: rivalOwner.id,
  });

  tools = createAskTools({ repos, teamId: team.id, teamSlug: "acme", userId: owner.id, today: "2026-10-02" });
});

describe("search_issues", () => {
  it("searches every board of the team, open and most urgent first, and never another team's", async () => {
    const all = await run("search_issues", {});
    expect(all.total).toBe(6);
    // Priority, then due date; resolved issues (ENG-4) last whatever their priority.
    expect(keys(all)).toEqual(["ENG-1", "ENG-3", "OPS-1", "ENG-2", "ENG-5", "ENG-4"]);
    expect(keys(all)).not.toContain("RIV-1");
  });

  it("describes each issue with a link to it on its board", async () => {
    const [issue] = (await run("search_issues", { text: "login" })).issues;
    expect(issue).toMatchObject({
      key: "ENG-1",
      board: "Engineering",
      column: "Todo",
      state: "todo",
      priority: "urgent",
      assignee: "Ann Lee",
      labels: ["Bug"],
      overdue: false,
    });
    expect(issue.url).toMatch(/^\/acme\/board\/[^/]+\?task=ENG-1$/);
  });

  it("filters by open state, priority, overdue and due date", async () => {
    expect(keys(await run("search_issues", { state: "open", priority: ["urgent", "high"] }))).toEqual(["ENG-1", "ENG-3", "OPS-1"]);
    expect(keys(await run("search_issues", { overdue: true }))).toEqual(["ENG-3", "ENG-2"]);
    expect(keys(await run("search_issues", { state: "done" }))).toEqual(["ENG-4"]);
    expect(keys(await run("search_issues", { state: "review" }))).toEqual(["ENG-3"]);
    expect(keys(await run("search_issues", { dueBefore: "2021-01-01", state: "open" }))).toEqual(["ENG-3", "ENG-2"]);
  });

  it("filters by assignee: me, a name, unassigned or an AI teammate", async () => {
    expect(keys(await run("search_issues", { assignee: "me" }))).toEqual(["ENG-2"]);
    expect(keys(await run("search_issues", { assignee: "Ann" }))).toEqual(["ENG-1", "OPS-1"]);
    expect(keys(await run("search_issues", { assignee: "unassigned" }))).toEqual(["ENG-3", "ENG-4"]);
    expect((await run("search_issues", { assignee: "Spec writer" })).issues[0]).toMatchObject({ key: "ENG-5", assignee: "Spec writer (AI teammate)" });
  });

  it("filters by board and label, and explains unknown names", async () => {
    expect(keys(await run("search_issues", { board: "operations" }))).toEqual(["OPS-1"]);
    expect(keys(await run("search_issues", { label: "bug" }))).toEqual(["ENG-1"]);
    await expect(run("search_issues", { board: "Rival board" })).rejects.toThrow(/No board named "Rival board". Boards: Engineering, Operations/);
    await expect(run("search_issues", { assignee: "Zed" })).rejects.toThrow(/No one on the team matches "Zed"/);
    await expect(run("search_issues", { label: "Nope" })).rejects.toThrow(/No label named/);
  });

  it("caps the results but reports the total", async () => {
    const result = await run("search_issues", { limit: 2 });
    expect(result).toMatchObject({ total: 6, showing: 2 });
    expect(result.issues).toHaveLength(2);
  });
});

describe("get_issue", () => {
  it("returns one issue in full with its comments", async () => {
    const [login] = (await run("search_issues", { text: "login" })).issues;
    const task = (await repos.tasks.listForTeam((await repos.teams.getBySlug("acme"))!.id)).find((t) => t.key === "ENG-1")!;
    await repos.comments.create({ taskId: task.id, body: "Seen on Safari", author: { kind: "user", userId: mate.id } });
    const issue = await run("get_issue", { key: "eng-1" });
    expect(issue).toMatchObject({ key: "ENG-1", url: login.url, description: "Users get logged out", subtasks: [] });
    expect(issue.comments).toEqual([expect.objectContaining({ author: "Ann Lee", body: "Seen on Safari" })]);
  });

  it("can't reach another team's issue", async () => {
    await expect(run("get_issue", { key: "RIV-1" })).rejects.toThrow(/No issue RIV-1 in this team/);
  });
});

describe("team_overview", () => {
  it("counts open, overdue, unassigned and urgent work per board and person", async () => {
    const overview = await run("team_overview", {});
    expect(overview.totals).toEqual({ issues: 6, open: 5, overdue: 2, unassigned: 1, urgentOrHigh: 3 });
    expect(overview.boards.map((b) => b.board)).toEqual(["Engineering", "Operations"]);
    expect(overview.boards[0].columns.find((c) => c.column === "Done")).toEqual({ column: "Done", state: "done", issues: 1 });
    expect(overview.openByAssignee[0]).toEqual({ assignee: "Ann Lee", open: 2, urgentOrHigh: 2, overdue: 0 });
    expect(overview.openByAssignee).toContainEqual({ assignee: "Unassigned", open: 1, urgentOrHigh: 1, overdue: 1 });
  });
});
