import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_COLUMNS, DEFAULT_LABELS, createTaskInputSchema, type User } from "@/lib/domain";
import { ConflictError, NotFoundError, PlanLimitError } from "../errors";
import type { Repositories } from "../types";
import { emptyDb } from "./db";
import { createMockRepositories } from "./repositories";
import { createMemoryStore } from "./store";

let repos: Repositories;
let store: ReturnType<typeof createMemoryStore>;
let owner: User;

beforeEach(async () => {
  store = createMemoryStore(emptyDb());
  repos = createMockRepositories(store);
  ({ user: owner } = await repos.auth.signUp({ name: "Owner", email: "owner@example.test", password: "password1" }));
});

async function setupBoard() {
  const team = await repos.teams.create({ name: "Acme", slug: "acme", ownerId: owner.id });
  const workspace = await repos.workspaces.create({ teamId: team.id, name: "Eng", keyPrefix: "ENG" });
  const board = await repos.boards.create({ workspaceId: workspace.id, name: "Eng", description: null });
  const columns = await repos.boards.listColumns(board.id);
  return { team, workspace, board, columns };
}

/** Signs a user up and adds them to the team through an accepted invite. */
async function joinTeam(teamId: string, email: string) {
  const [invite] = await repos.invites.create({ teamId, emails: [email], invitedBy: owner.id });
  const { user } = await repos.auth.signUp({ name: email, email, password: "password1" });
  await repos.invites.accept(invite.token, user.id);
  return user;
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

  it("tracks the session through sign-up, sign-in and sign-out", async () => {
    expect(await repos.auth.currentUserId()).toBe(owner.id); // beforeEach signed up
    await repos.auth.signOut();
    expect(await repos.auth.currentUserId()).toBeNull();
    expect(await repos.auth.signIn({ email: "owner@example.test", password: "nope" })).toBeNull();
    expect(await repos.auth.currentUserId()).toBeNull();
    await repos.auth.signIn({ email: "owner@example.test", password: "password1" });
    expect(await repos.auth.currentUserId()).toBe(owner.id);
  });

  it("signs up without an email confirmation step and ignores confirmation links", async () => {
    const result = await repos.auth.signUp({ name: "New", email: "new-user@example.test", password: "password1" });
    expect(result.needsConfirmation).toBe(false);
    expect(await repos.auth.confirmEmail({ code: "anything" })).toBe(false);
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
    expect(team.plan).toBe("free");
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

describe("plans", () => {
  it("starts teams on Free and switches plans", async () => {
    const team = await repos.teams.create({ name: "Acme", slug: "acme", ownerId: owner.id });
    expect(team.plan).toBe("free");
    expect((await repos.teams.setPlan(team.id, "pro")).plan).toBe("pro");
    expect((await repos.teams.get(team.id))?.plan).toBe("pro");
  });

  it("counts members, live pending invites and workspaces", async () => {
    const { team } = await setupBoard();
    await repos.workspaces.create({ teamId: team.id, name: "Ops", keyPrefix: "OPS" });
    await joinTeam(team.id, "mate@example.test");
    await repos.invites.create({ teamId: team.id, emails: ["a@example.test", "b@example.test"], invitedBy: owner.id });
    const [expired] = await repos.invites.create({ teamId: team.id, emails: ["old@example.test"], invitedBy: owner.id });
    await store.write((db) => {
      db.invites.find((i) => i.id === expired.id)!.expiresAt = new Date(Date.now() - 1000).toISOString();
    });
    expect(await repos.teams.usage(team.id)).toEqual({ members: 2, pendingInvites: 2, workspaces: 2 });
  });
});

describe("AI usage", () => {
  it("reserves runs, counts a team's runs since a date and records tokens once", async () => {
    const team = await repos.teams.create({ name: "Acme", slug: "acme", ownerId: owner.id });
    const other = await repos.teams.create({ name: "Other", slug: "other", ownerId: owner.id });
    const run = { userId: owner.id, feature: "task_writer" as const, model: "m" };
    const id = await repos.aiUsage.startRun({ ...run, teamId: team.id });
    await repos.aiUsage.startRun({ ...run, teamId: team.id, feature: "breakdown" });
    await repos.aiUsage.startRun({ ...run, teamId: other.id });
    expect(await repos.aiUsage.countSince(team.id, new Date(Date.now() - 60_000))).toBe(2);
    expect(await repos.aiUsage.countSince(team.id, new Date(Date.now() + 60_000))).toBe(0);

    await repos.aiUsage.finishRun(id, { inputTokens: 10, outputTokens: 20 });
    await repos.aiUsage.finishRun(id, { inputTokens: 1, outputTokens: 1 });
    expect((await store.read((db) => db.aiUsage.find((u) => u.id === id)))?.inputTokens).toBe(10);
  });

  it("refuses a run past the plan's monthly limit", async () => {
    const team = await repos.teams.create({ name: "Acme", slug: "acme", ownerId: owner.id });
    const run = { teamId: team.id, userId: owner.id, feature: "task_writer" as const, model: "m" };
    for (let i = 0; i < 10; i++) await repos.aiUsage.startRun(run);
    await expect(repos.aiUsage.startRun(run)).rejects.toBeInstanceOf(PlanLimitError);
  });
});

describe("AI teammates", () => {
  async function proBoard() {
    const setup = await setupBoard();
    await repos.teams.setPlan(setup.team.id, "pro");
    const task = await repos.tasks.create(taskInput(setup.board.id, setup.columns[0].id, "Write spec"));
    const agent = await repos.agents.create(setup.team.id, { name: "Spec writer", specialty: "Specs", createdBy: owner.id });
    return { ...setup, task, agent };
  }

  it("keeps agent names unique per team and unassigns tasks when an agent is deleted", async () => {
    const { team, task, agent } = await proBoard();
    await expect(
      repos.agents.create(team.id, { name: "SPEC writer", specialty: "", createdBy: owner.id }),
    ).rejects.toBeInstanceOf(ConflictError);
    await repos.tasks.update(task.id, { assignee: { kind: "agent", agentId: agent.id } });
    await repos.agents.delete(agent.id);
    expect((await repos.tasks.get(task.id))?.assignee).toBeNull();
    expect(await repos.agents.listForTeam(team.id)).toEqual([]);
  });

  it("runs a task once at a time, only for the requester, and posts as the agent", async () => {
    const { team, task, agent } = await proBoard();
    const mate = await joinTeam(team.id, "mate@example.test");
    const run = await repos.agentRuns.start(task.id, agent.id, owner.id);
    expect(run.status).toBe("queued");
    await expect(repos.agentRuns.start(task.id, agent.id, owner.id)).rejects.toBeInstanceOf(ConflictError);
    expect(await repos.agentRuns.claim(run.id, mate.id)).toBe(false);
    expect(await repos.agentRuns.claim(run.id, owner.id)).toBe(true);
    const commentId = await repos.agentRuns.finish(run.id, owner.id, "The spec.");
    expect(await repos.comments.get(commentId)).toMatchObject({ body: "The spec.", author: { kind: "agent", agentId: agent.id } });
    expect(await repos.agentRuns.get(run.id)).toMatchObject({ status: "succeeded", commentId });

    const retry = await repos.agentRuns.start(task.id, agent.id, owner.id);
    await repos.agentRuns.fail(retry.id, owner.id, "overloaded");
    expect((await repos.agentRuns.listForTask(task.id)).map((r) => r.status)).toEqual(["failed", "succeeded"]);
  });

  it("requires Pro and the team's own agent", async () => {
    const { team, task, agent } = await proBoard();
    await repos.teams.setPlan(team.id, "lite");
    await expect(repos.agentRuns.start(task.id, agent.id, owner.id)).rejects.toThrow(/Pro plan/);
    await repos.teams.setPlan(team.id, "pro");
    const other = await repos.teams.create({ name: "Other", slug: "other", ownerId: owner.id });
    const stranger = await repos.agents.create(other.id, { name: "Bot", specialty: "", createdBy: owner.id });
    await expect(repos.agentRuns.start(task.id, stranger.id, owner.id)).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("memberships", () => {
  it("changes roles and removes members", async () => {
    const { team } = await setupBoard();
    expect(await repos.memberships.setRole(team.id, owner.id, "admin")).toMatchObject({ role: "admin" });
    const { user: stranger } = await repos.auth.signUp({ name: "S", email: "s@example.test", password: "password1" });
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

describe("profiles", () => {
  it("updates name, avatar and theme", async () => {
    const updated = await repos.users.update(owner.id, {
      name: "Owner Two",
      avatarUrl: "https://example.test/a.png",
      theme: "light",
    });
    expect(updated).toMatchObject({ name: "Owner Two", avatarUrl: "https://example.test/a.png", theme: "light" });
    expect(await repos.users.getById(owner.id)).toEqual(updated);
  });
});

describe("team administration", () => {
  it("renames a team", async () => {
    const { team } = await setupBoard();
    expect(await repos.teams.update(team.id, { name: "Acme Corp" })).toMatchObject({ name: "Acme Corp", slug: "acme" });
  });

  it("deleting a team removes everything in it", async () => {
    const { team, workspace, board, columns } = await setupBoard();
    const task = await repos.tasks.create(taskInput(board.id, columns[0].id, "Gone"));
    await repos.invites.create({ teamId: team.id, emails: ["x@example.test"], invitedBy: owner.id });
    await repos.teams.delete(team.id);
    expect(await repos.teams.get(team.id)).toBeNull();
    expect(await repos.workspaces.get(workspace.id)).toBeNull();
    expect(await repos.tasks.get(task.id)).toBeNull();
    expect(await repos.memberships.list(team.id)).toEqual([]);
    expect(await repos.labels.listForTeam(team.id)).toEqual([]);
    expect(await repos.invites.listPending(team.id)).toEqual([]);
    expect(await repos.teams.listForUser(owner.id)).toEqual([]);
  });

  it("transfers ownership so there is always exactly one owner", async () => {
    const { team } = await setupBoard();
    const member = await joinTeam(team.id, "m@example.test");
    await repos.memberships.transferOwnership(team.id, owner.id, member.id);
    const roles = Object.fromEntries((await repos.memberships.list(team.id)).map((m) => [m.userId, m.role]));
    expect(roles).toEqual({ [owner.id]: "admin", [member.id]: "owner" });
  });

  it("refuses to transfer ownership to a non-member", async () => {
    const { team } = await setupBoard();
    const { user: stranger } = await repos.auth.signUp({ name: "S", email: "s@example.test", password: "password1" });
    await expect(repos.memberships.transferOwnership(team.id, owner.id, stranger.id)).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});

describe("invite lifecycle", () => {
  it("creates invites with a role and finds them by token", async () => {
    const { team } = await setupBoard();
    const [invite] = await repos.invites.create({
      teamId: team.id,
      emails: ["lead@example.test"],
      role: "admin",
      invitedBy: owner.id,
    });
    expect(invite.role).toBe("admin");
    expect(await repos.invites.getByToken(invite.token)).toEqual(invite);
    expect(await repos.invites.get(invite.id)).toEqual(invite);
  });

  it("accepts an invite for the invited email only, once", async () => {
    const { team } = await setupBoard();
    const [invite] = await repos.invites.create({ teamId: team.id, emails: ["new@example.test"], invitedBy: owner.id });
    const { user: other } = await repos.auth.signUp({ name: "O", email: "other@example.test", password: "password1" });
    await expect(repos.invites.accept(invite.token, other.id)).rejects.toBeInstanceOf(ConflictError);

    const { user: invitee } = await repos.auth.signUp({ name: "N", email: "new@example.test", password: "password1" });
    const membership = await repos.invites.accept(invite.token, invitee.id);
    expect(membership).toMatchObject({ teamId: team.id, userId: invitee.id, role: "member" });
    expect(await repos.invites.listPending(team.id)).toEqual([]);
    await expect(repos.invites.accept(invite.token, invitee.id)).rejects.toBeInstanceOf(ConflictError);
  });

  it("previews an invite with its team and inviter for someone not in the team yet", async () => {
    const { team } = await setupBoard();
    const [invite] = await repos.invites.create({ teamId: team.id, emails: ["guest@example.test"], invitedBy: owner.id });
    expect(await repos.invites.preview(invite.token)).toEqual({
      invite,
      teamName: "Acme",
      teamSlug: "acme",
      inviterName: "Owner",
    });
    expect(await repos.invites.preview("no-such-token")).toBeNull();
  });

  it("resends with a fresh token and expiry, and revokes", async () => {
    const { team } = await setupBoard();
    const [invite] = await repos.invites.create({ teamId: team.id, emails: ["r@example.test"], invitedBy: owner.id });
    const resent = await repos.invites.resend(invite.id);
    expect(resent.token).not.toBe(invite.token);
    expect(await repos.invites.getByToken(invite.token)).toBeNull();
    expect(resent.expiresAt >= invite.expiresAt).toBe(true);
    await repos.invites.revoke(invite.id);
    expect(await repos.invites.listPending(team.id)).toEqual([]);
  });

  it("rejects expired invites", async () => {
    const store = createMemoryStore(emptyDb());
    const local = createMockRepositories(store);
    const { user: boss } = await local.auth.signUp({ name: "B", email: "b@example.test", password: "password1" });
    const team = await local.teams.create({ name: "T", slug: "t-team", ownerId: boss.id });
    const [invite] = await local.invites.create({ teamId: team.id, emails: ["late@example.test"], invitedBy: boss.id });
    await store.write((db) => {
      db.invites[0].expiresAt = "2000-01-01T00:00:00.000Z";
    });
    const { user: late } = await local.auth.signUp({ name: "L", email: "late@example.test", password: "password1" });
    await expect(local.invites.accept(invite.token, late.id)).rejects.toThrow(/expired/);
  });
});

describe("label management", () => {
  it("creates, renames, recolours and deletes labels, removing them from tasks", async () => {
    const { team, board, columns } = await setupBoard();
    const label = await repos.labels.create(team.id, { name: "Ops", color: "green" });
    expect(await repos.labels.get(label.id)).toEqual(label);
    await expect(repos.labels.create(team.id, { name: "ops", color: "red" })).rejects.toBeInstanceOf(ConflictError);

    expect(await repos.labels.update(label.id, { name: "Infra", color: "orange" })).toMatchObject({
      name: "Infra",
      color: "orange",
    });
    const task = await repos.tasks.create({ ...taskInput(board.id, columns[0].id, "Tagged"), labelIds: [label.id] });
    await repos.labels.delete(label.id);
    expect(await repos.labels.get(label.id)).toBeNull();
    expect((await repos.tasks.get(task.id))?.labelIds).toEqual([]);
  });

  it("refuses to rename a label onto another label's name", async () => {
    const { team } = await setupBoard();
    const [bug, feature] = await repos.labels.listForTeam(team.id);
    await expect(repos.labels.update(feature.id, { name: bug.name.toUpperCase() })).rejects.toBeInstanceOf(
      ConflictError,
    );
  });
});
