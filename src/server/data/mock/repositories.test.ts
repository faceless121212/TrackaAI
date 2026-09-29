import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_COLUMNS, DEFAULT_LABELS, createTaskInputSchema, type User } from "@/lib/domain";
import { ConflictError, NotFoundError } from "../errors";
import type { Repositories } from "../types";
import { emptyDb } from "./db";
import { createMockRepositories } from "./repositories";
import { createMemoryStore } from "./store";

let repos: Repositories;
let owner: User;

beforeEach(async () => {
  repos = createMockRepositories(createMemoryStore(emptyDb()));
  owner = await repos.auth.signUp({ name: "Owner", email: "owner@example.test", password: "password1" });
});

async function setupBoard() {
  const team = await repos.teams.create({ name: "Acme", slug: "acme", ownerId: owner.id });
  const workspace = await repos.workspaces.create({ teamId: team.id, name: "Eng", keyPrefix: "ENG" });
  const board = await repos.boards.create({ workspaceId: workspace.id, name: "Eng", description: null });
  const columns = await repos.boards.listColumns(board.id);
  return { team, workspace, board, columns };
}

function taskInput(boardId: string, columnId: string, title: string) {
  return { ...createTaskInputSchema.parse({ boardId, columnId, title }), createdBy: owner.id };
}

describe("auth", () => {
  it("signs in with the right password only", async () => {
    expect(await repos.auth.signIn({ email: "owner@example.test", password: "password1" })).toEqual(owner);
    expect(await repos.auth.signIn({ email: "owner@example.test", password: "nope" })).toBeNull();
    expect(await repos.auth.signIn({ email: "ghost@example.test", password: "password1" })).toBeNull();
  });

  it("rejects a duplicate email, case-insensitively", async () => {
    await expect(
      repos.auth.signUp({ name: "Dup", email: "OWNER@example.test", password: "password1" }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("exposes users by id and email", async () => {
    expect(await repos.users.getById(owner.id)).toEqual(owner);
    expect(await repos.users.getByEmail("Owner@Example.test")).toEqual(owner);
  });
});

describe("teams", () => {
  it("makes the creator the owner", async () => {
    const team = await repos.teams.create({ name: "Acme", slug: "acme", ownerId: owner.id });
    expect(team.plan).toBe("lite");
    expect(await repos.memberships.get(team.id, owner.id)).toMatchObject({ role: "owner" });
    expect(await repos.teams.listForUser(owner.id)).toEqual([team]);
    expect(await repos.teams.getBySlug("acme")).toEqual(team);
  });

  it("rejects a taken slug", async () => {
    await repos.teams.create({ name: "Acme", slug: "acme", ownerId: owner.id });
    const error = await repos.teams
      .create({ name: "Other", slug: "acme", ownerId: owner.id })
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ConflictError);
    expect((error as ConflictError).field).toBe("slug");
  });
});

describe("memberships", () => {
  it("changes roles and removes members", async () => {
    const { team } = await setupBoard();
    expect(await repos.memberships.setRole(team.id, owner.id, "admin")).toMatchObject({ role: "admin" });
    const stranger = await repos.auth.signUp({ name: "S", email: "s@example.test", password: "password1" });
    await expect(repos.memberships.setRole(team.id, stranger.id, "admin")).rejects.toBeInstanceOf(
      NotFoundError,
    );
    await repos.memberships.remove(team.id, owner.id);
    expect(await repos.memberships.list(team.id)).toEqual([]);
  });
});

describe("workspaces", () => {
  it("starts task numbering at 1 and rejects a duplicate prefix in the team", async () => {
    const { team, workspace } = await setupBoard();
    expect(workspace.nextTaskNumber).toBe(1);
    expect(await repos.workspaces.listForTeam(team.id)).toEqual([workspace]);
    await expect(
      repos.workspaces.create({ teamId: team.id, name: "Again", keyPrefix: "ENG" }),
    ).rejects.toBeInstanceOf(ConflictError);
  });
});

describe("boards", () => {
  it("seeds the default columns in order", async () => {
    const { board, columns } = await setupBoard();
    expect(columns.map((c) => c.name)).toEqual([...DEFAULT_COLUMNS]);
    expect(columns.every((c) => c.boardId === board.id)).toBe(true);
    const positions = columns.map((c) => c.position);
    expect([...positions].sort()).toEqual(positions);
  });

  it("fails for an unknown workspace", async () => {
    await expect(
      repos.boards.create({ workspaceId: "nope", name: "X", description: null }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("tasks", () => {
  it("allocates sequential keys per workspace and appends to the column", async () => {
    const { workspace, board, columns } = await setupBoard();
    const first = await repos.tasks.create(taskInput(board.id, columns[0].id, "One"));
    const second = await repos.tasks.create(taskInput(board.id, columns[0].id, "Two"));
    expect([first.key, second.key]).toEqual(["ENG-1", "ENG-2"]);
    expect(first.position < second.position).toBe(true);
    expect((await repos.workspaces.get(workspace.id))?.nextTaskNumber).toBe(3);
    expect((await repos.tasks.listForBoard(board.id)).map((t) => t.title)).toEqual(["One", "Two"]);
    expect(await repos.tasks.getByKey(workspace.id, "eng-2")).toEqual(second);
  });

  it("rejects a column from another board", async () => {
    const { workspace, board } = await setupBoard();
    const other = await repos.boards.create({ workspaceId: workspace.id, name: "Other", description: null });
    const [otherColumn] = await repos.boards.listColumns(other.id);
    await expect(repos.tasks.create(taskInput(board.id, otherColumn.id, "X"))).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("updates fields and moves between columns", async () => {
    const { board, columns } = await setupBoard();
    const task = await repos.tasks.create(taskInput(board.id, columns[0].id, "One"));
    const updated = await repos.tasks.update(task.id, { priority: "high" });
    expect(updated).toMatchObject({ priority: "high", title: "One" });
    const moved = await repos.tasks.move(task.id, { columnId: columns[2].id, index: 0 });
    expect(moved.columnId).toBe(columns[2].id);
    expect(await repos.tasks.get(task.id)).toEqual(moved);
  });

  it("inserts quick-added tasks at the start and moves by index", async () => {
    const { board, columns } = await setupBoard();
    const [todo] = columns;
    const a = await repos.tasks.create(taskInput(board.id, todo.id, "A"));
    const b = await repos.tasks.create(taskInput(board.id, todo.id, "B"));
    const top = await repos.tasks.create({ ...taskInput(board.id, todo.id, "Top"), placement: "start" });
    const titles = async () => (await repos.tasks.listForBoard(board.id)).map((t) => t.title);
    expect(await titles()).toEqual(["Top", "A", "B"]);

    await repos.tasks.move(top.id, { columnId: todo.id, index: 2 }); // index among the others
    expect(await titles()).toEqual(["A", "B", "Top"]);
    await repos.tasks.move(b.id, { columnId: todo.id, index: 0 });
    expect(await titles()).toEqual(["B", "A", "Top"]);
    expect(a.key).toBe("ENG-1");
  });

  it("deletes a task with its comments and detaches sub-tasks", async () => {
    const { board, columns } = await setupBoard();
    const parent = await repos.tasks.create(taskInput(board.id, columns[0].id, "Parent"));
    const child = await repos.tasks.create({
      ...taskInput(board.id, columns[0].id, "Child"),
      parentId: parent.id,
    });
    await repos.comments.create({ taskId: parent.id, body: "hi", author: { kind: "user", userId: owner.id } });
    await repos.tasks.delete(parent.id);
    expect(await repos.tasks.get(parent.id)).toBeNull();
    expect((await repos.tasks.get(child.id))?.parentId).toBeNull();
    expect(await repos.comments.listForTask(parent.id)).toEqual([]);
  });

  it("lists tasks assigned to a user across the team's boards", async () => {
    const { team, board, columns } = await setupBoard();
    const mine = await repos.tasks.create({
      ...taskInput(board.id, columns[0].id, "Mine"),
      assignee: { kind: "user", userId: owner.id },
    });
    await repos.tasks.create(taskInput(board.id, columns[0].id, "Nobody's"));
    expect((await repos.tasks.listAssignedTo(team.id, owner.id)).map((t) => t.id)).toEqual([mine.id]);
  });
});

describe("columns", () => {
  it("adds, renames and reorders columns", async () => {
    const { board } = await setupBoard();
    const added = await repos.boards.createColumn(board.id, "QA");
    await repos.boards.renameColumn(added.id, "Testing");
    await repos.boards.moveColumn(added.id, 0);
    const names = (await repos.boards.listColumns(board.id)).map((c) => c.name);
    expect(names).toEqual(["Testing", ...DEFAULT_COLUMNS]);
    expect(await repos.boards.getColumn(added.id)).toMatchObject({ name: "Testing" });
  });

  it("refuses to delete a column that still has tasks, or the last column", async () => {
    const { board, columns } = await setupBoard();
    await repos.tasks.create(taskInput(board.id, columns[0].id, "Busy"));
    await expect(repos.boards.deleteColumn(columns[0].id)).rejects.toBeInstanceOf(ConflictError);
    for (const column of columns.slice(1, -1)) await repos.boards.deleteColumn(column.id);
    await repos.tasks.delete((await repos.tasks.listForBoard(board.id))[0].id);
    await repos.boards.deleteColumn(columns[0].id);
    const [last] = await repos.boards.listColumns(board.id);
    await expect(repos.boards.deleteColumn(last.id)).rejects.toBeInstanceOf(ConflictError);
  });
});

describe("updates and cascading deletes", () => {
  it("renames workspaces and boards", async () => {
    const { workspace, board } = await setupBoard();
    expect(await repos.workspaces.update(workspace.id, { name: "Platform" })).toMatchObject({ name: "Platform" });
    expect(await repos.boards.update(board.id, { description: "Sprint work" })).toMatchObject({
      name: "Eng",
      description: "Sprint work",
    });
  });

  it("deleting a workspace removes its boards, columns and tasks", async () => {
    const { workspace, board, columns } = await setupBoard();
    const task = await repos.tasks.create(taskInput(board.id, columns[0].id, "Gone"));
    await repos.workspaces.delete(workspace.id);
    expect(await repos.workspaces.get(workspace.id)).toBeNull();
    expect(await repos.boards.get(board.id)).toBeNull();
    expect(await repos.boards.listColumns(board.id)).toEqual([]);
    expect(await repos.tasks.get(task.id)).toBeNull();
  });

  it("deleting a board keeps its workspace", async () => {
    const { workspace, board } = await setupBoard();
    await repos.boards.delete(board.id);
    expect(await repos.boards.listForWorkspace(workspace.id)).toEqual([]);
    expect(await repos.workspaces.get(workspace.id)).not.toBeNull();
  });
});

describe("labels, comments and members", () => {
  it("seeds the default labels on team creation", async () => {
    const { team } = await setupBoard();
    const labels = await repos.labels.listForTeam(team.id);
    expect(labels.map((l) => l.name)).toEqual(DEFAULT_LABELS.map((l) => l.name));
  });

  it("stores comments oldest first", async () => {
    const { board, columns } = await setupBoard();
    const task = await repos.tasks.create(taskInput(board.id, columns[0].id, "Talk"));
    const author = { kind: "user" as const, userId: owner.id };
    const first = await repos.comments.create({ taskId: task.id, body: "first", author });
    await repos.comments.create({ taskId: task.id, body: "second", author });
    expect((await repos.comments.listForTask(task.id)).map((c) => c.body)).toEqual(["first", "second"]);
    expect(await repos.comments.get(first.id)).toEqual(first);
    await repos.comments.delete(first.id);
    expect((await repos.comments.listForTask(task.id)).map((c) => c.body)).toEqual(["second"]);
  });

  it("lists members with their user records", async () => {
    const { team } = await setupBoard();
    expect(await repos.teams.get(team.id)).toEqual(team);
    const [member] = await repos.memberships.listMembers(team.id);
    expect(member).toMatchObject({ role: "owner", user: { id: owner.id, name: "Owner" } });
  });
});

describe("invites", () => {
  it("creates pending invites with a token and 7-day expiry, skipping duplicates and members", async () => {
    const { team } = await setupBoard();
    const created = await repos.invites.create({
      teamId: team.id,
      emails: ["a@example.test", "owner@example.test"],
      invitedBy: owner.id,
    });
    expect(created.map((i) => i.email)).toEqual(["a@example.test"]);
    const [invite] = created;
    expect(invite.role).toBe("member");
    expect(invite.token.length).toBeGreaterThanOrEqual(16);
    const days = (Date.parse(invite.expiresAt) - Date.parse(invite.createdAt)) / 86_400_000;
    expect(days).toBe(7);

    const again = await repos.invites.create({ teamId: team.id, emails: ["a@example.test"], invitedBy: owner.id });
    expect(again).toEqual([]);
    expect(await repos.invites.listPending(team.id)).toEqual([invite]);
  });
});
