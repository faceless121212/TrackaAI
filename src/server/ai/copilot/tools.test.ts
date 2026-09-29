// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";
import { createTaskInputSchema, type Board, type User } from "@/lib/domain";
import { emptyDb } from "@/server/data/mock/db";
import { createMockRepositories } from "@/server/data/mock/repositories";
import { createMemoryStore } from "@/server/data/mock/store";
import type { Repositories } from "@/server/data/types";
import { COPILOT_MUTATIONS, createCopilotTools } from "./tools";

let repos: Repositories;
let owner: User;
let mate: User;
let board: Board;
let otherBoard: Board;
let tools: ReturnType<typeof createCopilotTools>;

// Tools are called directly here; the SDK passes these options in production.
const call = { toolCallId: "t", messages: [] } as never;
type Tools = typeof tools;
type Output<K extends keyof Tools> = Exclude<Awaited<ReturnType<NonNullable<Tools[K]["execute"]>>>, AsyncIterable<unknown>>;
const run = <K extends keyof Tools>(name: K, input: Parameters<NonNullable<Tools[K]["execute"]>>[0]) =>
  tools[name].execute!(input as never, call) as Promise<Output<K>>;

beforeEach(async () => {
  repos = createMockRepositories(createMemoryStore(emptyDb()));
  ({ user: owner } = await repos.auth.signUp({ name: "Owner Person", email: "owner@example.test", password: "password1" }));
  const team = await repos.teams.setPlan(
    (await repos.teams.create({ name: "Acme", slug: "acme", ownerId: owner.id })).id,
    "pro",
  );
  const [invite] = await repos.invites.create({ teamId: team.id, emails: ["ann@example.test"], invitedBy: owner.id });
  ({ user: mate } = await repos.auth.signUp({ name: "Ann Lee", email: "ann@example.test", password: "password1" }));
  await repos.invites.accept(invite.token, mate.id);
  const workspace = await repos.workspaces.create({ teamId: team.id, name: "Eng", keyPrefix: "ENG" });
  board = await repos.boards.create({ workspaceId: workspace.id, name: "Eng", description: null });
  otherBoard = await repos.boards.create({ workspaceId: workspace.id, name: "Ops", description: null });
  const [todo, doing] = await repos.boards.listColumns(board.id);
  const [bug] = await repos.labels.listForTeam(team.id);
  const task = (title: string, extra = {}) =>
    repos.tasks.create({ ...createTaskInputSchema.parse({ boardId: board.id, columnId: todo.id, title, ...extra }), createdBy: owner.id });
  await task("Fix login bug", { priority: "urgent", labelIds: [bug.id], assignee: { kind: "user", userId: mate.id } });
  await task("Write docs", { dueDate: "2020-01-01" });
  await repos.tasks.create({
    ...createTaskInputSchema.parse({ boardId: board.id, columnId: doing.id, title: "Ship beta" }),
    createdBy: owner.id,
  });
  await repos.tasks.create({
    ...createTaskInputSchema.parse({ boardId: otherBoard.id, columnId: (await repos.boards.listColumns(otherBoard.id))[0].id, title: "Elsewhere" }),
    createdBy: owner.id,
  });
  tools = createCopilotTools({ repos, userId: owner.id, teamId: team.id, role: "owner", board });
});

describe("copilot tools", () => {
  it("marks exactly the changing tools for approval", () => {
    expect([...COPILOT_MUTATIONS].sort()).toEqual(["assign_task", "create_task", "move_task", "update_task"]);
  });

  it("searches only this board, by text, column, assignee and priority", async () => {
    expect((await run("search_tasks", {})).total).toBe(3);
    expect((await run("search_tasks", { query: "LOGIN" })).tasks).toEqual([
      expect.objectContaining({ key: "ENG-1", column: "Backlog", assignee: "Ann Lee", priority: "urgent", labels: ["Bug"] }),
    ]);
    expect((await run("search_tasks", { column: "todo" })).tasks.map((t) => t.key)).toEqual(["ENG-3"]);
    expect((await run("search_tasks", { assignee: "ann" })).tasks.map((t) => t.key)).toEqual(["ENG-1"]);
    expect((await run("search_tasks", { priority: "urgent" })).total).toBe(1);
  });

  it("summarizes the board", async () => {
    const summary = await run("summarize_board", {});
    expect(summary).toMatchObject({ board: "Eng", total: 3, unassigned: 2, overdue: ["ENG-2"], urgentOrHigh: ["ENG-1"] });
    expect(summary.columns).toContainEqual({ name: "Backlog", tasks: 2 });
  });

  it("creates a task from names the model knows", async () => {
    const created = await run("create_task", {
      title: "Add dark mode",
      column: "todo",
      priority: "high",
      assignee: "me",
      labels: ["feature", "Nope"],
    });
    expect(created).toMatchObject({ key: "ENG-5", column: "Todo", assignee: "Owner Person", labels: ["Feature"] });
    expect(created.ignoredLabels).toEqual(["Nope"]);
  });

  it("updates, moves and assigns tasks by key", async () => {
    await run("update_task", { key: "eng-2", title: "Write the docs", dueDate: null, priority: "low" });
    await run("move_task", { key: "ENG-2", column: "Done" });
    await run("assign_task", { key: "ENG-2", assignee: "ann@example.test" });
    const [task] = (await run("search_tasks", { query: "write the docs" })).tasks;
    expect(task).toMatchObject({ key: "ENG-2", column: "Done", priority: "low", assignee: "Ann Lee", dueDate: null });
    await run("assign_task", { key: "ENG-2", assignee: null });
    expect((await run("search_tasks", { query: "write the docs" })).tasks[0].assignee).toBeNull();
  });

  it("refuses unknown names and tasks on other boards, with a message the model can act on", async () => {
    await expect(run("move_task", { key: "ENG-1", column: "Nowhere" })).rejects.toThrow(
      'No column named "Nowhere". Columns: Backlog, Todo, In Progress, In Review, Done.',
    );
    await expect(run("assign_task", { key: "ENG-1", assignee: "Zed" })).rejects.toThrow(/No team member matches "Zed"/);
    await expect(run("move_task", { key: "ENG-4", column: "Done" })).rejects.toThrow('No task ENG-4 on this board.');
    await expect(run("update_task", { key: "ENG-99", title: "x" })).rejects.toThrow('No task ENG-99 on this board.');
  });
});
