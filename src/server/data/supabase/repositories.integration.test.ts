// @vitest-environment node
// Runs the Supabase repositories against the real project as the two seeded
// accounts (supabase/seed.sql), each with its own session, so RLS applies just
// as in the app. `pnpm test:supabase` (reads NEXT_PUBLIC_SUPABASE_* from .env.local).
import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AI_RATE_LIMIT, DEFAULT_COLUMNS, DEFAULT_LABELS, createTaskInputSchema } from "@/lib/domain";
import { ConflictError, NotFoundError, PlanLimitError, RateLimitError } from "../errors";
import type { Database } from "./database.types";
import { createSupabaseRepositories } from "./repositories";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
// supabase/seed.sql sets "demo-password"; a project that's public changes it and
// keeps the new one in .env.local as DEMO_PASSWORD.
const PASSWORD = process.env.DEMO_PASSWORD || "demo-password";

async function signedIn(email: string) {
  const client = createClient<Database>(url!, key!, { auth: { persistSession: false, autoRefreshToken: false } });
  const repos = createSupabaseRepositories(async () => client);
  const user = await repos.auth.signIn({ email, password: PASSWORD });
  if (!user) throw new Error(`Seeded account ${email} can't sign in — run supabase/seed.sql`);
  return { repos, user, client };
}

describe.skipIf(!url || !key)("Supabase repositories (live project)", () => {
  let demo: Awaited<ReturnType<typeof signedIn>>;
  let mate: Awaited<ReturnType<typeof signedIn>>;
  const suffix = Date.now().toString(36);
  const slug = `it-${suffix}`;
  let teamId: string;

  const taskInput = (boardId: string, columnId: string, title: string) => ({
    ...createTaskInputSchema.parse({ boardId, columnId, title }),
    createdBy: demo.user.id,
  });

  beforeAll(async () => {
    demo = await signedIn("demo@trackaai.test");
    mate = await signedIn("mate@trackaai.test");
    teamId = (await demo.repos.teams.create({ name: `Integration ${suffix}`, slug, ownerId: demo.user.id })).id;
  });

  afterAll(async () => {
    if (teamId) await demo.repos.teams.delete(teamId);
  });

  it("knows who is signed in and rejects a wrong password", async () => {
    expect(await demo.repos.auth.currentUserId()).toBe(demo.user.id);
    const client = createClient<Database>(url!, key!, { auth: { persistSession: false } });
    const anon = createSupabaseRepositories(async () => client);
    expect(await anon.auth.signIn({ email: "demo@trackaai.test", password: "wrong-password" })).toBeNull();
  });

  it("reads the seeded demo board", async () => {
    const acme = await demo.repos.teams.getBySlug("acme");
    expect(acme?.name).toBe("Acme");
    const [workspace] = await demo.repos.workspaces.listForTeam(acme!.id);
    const [board] = await demo.repos.boards.listForWorkspace(workspace.id);
    const keys = (await demo.repos.tasks.listForBoard(board.id)).map((t) => t.key);
    expect(keys).toEqual(expect.arrayContaining(["ENG-1", "ENG-5"]));
  });

  it("creates a team with its owner and default labels", async () => {
    expect(await demo.repos.memberships.get(teamId, demo.user.id)).toMatchObject({ role: "owner" });
    expect((await demo.repos.labels.listForTeam(teamId)).map((l) => l.name).sort()).toEqual(
      DEFAULT_LABELS.map((l) => l.name).sort(),
    );
    await expect(
      demo.repos.teams.create({ name: "Dup", slug, ownerId: demo.user.id }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("starts on Free, enforces its limits and lets the owner change plans", async () => {
    expect((await demo.repos.teams.get(teamId))?.plan).toBe("free");
    await expect(
      demo.repos.invites.create({ teamId, emails: [`solo-${suffix}@example.test`], invitedBy: demo.user.id }),
    ).rejects.toBeInstanceOf(PlanLimitError);
    expect((await demo.repos.teams.setPlan(teamId, "lite")).plan).toBe("lite");
    expect(await demo.repos.teams.usage(teamId)).toMatchObject({ members: 1, pendingInvites: 0 });
    // Pro for the rest of the suite, so limits don't mask the checks below.
    await demo.repos.teams.setPlan(teamId, "pro");
  });

  it("rate-limits a burst of AI runs (the runs go with the team in afterAll)", async () => {
    const run = { teamId, userId: demo.user.id, feature: "task_writer" as const, model: "m" };
    for (let i = 0; i < AI_RATE_LIMIT.runs; i++) await demo.repos.aiUsage.startRun(run);
    const refused = demo.repos.aiUsage.startRun(run);
    await expect(refused).rejects.toBeInstanceOf(RateLimitError);
    await expect(refused).rejects.toMatchObject({ retryAfter: AI_RATE_LIMIT.windowSeconds });
  });

  it("runs the whole board lifecycle", async () => {
    const r = demo.repos;
    const workspace = await r.workspaces.create({ teamId, name: "Lifecycle", keyPrefix: "LC" });
    await expect(r.workspaces.create({ teamId, name: "Again", keyPrefix: "LC" })).rejects.toBeInstanceOf(ConflictError);
    const board = await r.boards.create({ workspaceId: workspace.id, name: "Lifecycle", description: null });
    const columns = await r.boards.listColumns(board.id);
    expect(columns.map((c) => c.name)).toEqual([...DEFAULT_COLUMNS]);
    const [todo, , done] = columns;

    const a = await r.tasks.create(taskInput(board.id, todo.id, "A"));
    const b = await r.tasks.create(taskInput(board.id, todo.id, "B"));
    const top = await r.tasks.create({ ...taskInput(board.id, todo.id, "Top"), placement: "start" });
    expect([a.key, b.key, top.key]).toEqual(["LC-1", "LC-2", "LC-3"]);
    const titles = async () => (await r.tasks.listForBoard(board.id)).map((t) => t.title);
    expect(await titles()).toEqual(["Top", "A", "B"]);

    await r.tasks.move(top.id, { columnId: todo.id, index: 2 });
    expect(await titles()).toEqual(["A", "B", "Top"]);
    const moved = await r.tasks.move(b.id, { columnId: done.id, index: 0 });
    expect(moved.columnId).toBe(done.id);

    const [bug] = await r.labels.listForTeam(teamId);
    const updated = await r.tasks.update(a.id, {
      priority: "high",
      labelIds: [bug.id],
      assignee: { kind: "user", userId: demo.user.id },
      dueDate: "2026-12-01",
    });
    expect(updated).toMatchObject({ priority: "high", labelIds: [bug.id], dueDate: "2026-12-01" });
    expect(await r.tasks.getByKey(workspace.id, "lc-1")).toMatchObject({ id: a.id, labelIds: [bug.id] });
    expect((await r.tasks.listAssignedTo(teamId, demo.user.id)).map((t) => t.id)).toEqual([a.id]);
    const teamTasks = await r.tasks.listForTeam(teamId);
    expect(teamTasks.map((t) => t.id)).toEqual(expect.arrayContaining([a.id, b.id, top.id]));
    expect(teamTasks.find((t) => t.id === a.id)?.labelIds).toEqual([bug.id]);
    expect(await mate.repos.tasks.listForTeam(teamId)).toEqual([]); // not a member: RLS hides it all

    const comment = await r.comments.create({ taskId: a.id, body: "Looks good", author: { kind: "user", userId: demo.user.id } });
    expect((await r.comments.listForTask(a.id)).map((c) => c.body)).toEqual(["Looks good"]);
    await r.comments.delete(comment.id);

    const qa = await r.boards.createColumn(board.id, "QA");
    await r.boards.renameColumn(qa.id, "Testing");
    await r.boards.moveColumn(qa.id, 0);
    expect((await r.boards.listColumns(board.id))[0].name).toBe("Testing");
    await r.boards.deleteColumn(qa.id);
    await expect(r.boards.deleteColumn(todo.id)).rejects.toBeInstanceOf(ConflictError); // still has tasks

    await r.tasks.delete(top.id);
    expect(await r.tasks.get(top.id)).toBeNull();
  });

  it("runs an AI teammate on a task and posts its result as the agent", async () => {
    const r = demo.repos;
    const [workspace] = await r.workspaces.listForTeam(teamId);
    const [board] = await r.boards.listForWorkspace(workspace.id);
    const [column] = await r.boards.listColumns(board.id);
    const agent = await r.agents.create(teamId, { name: "Spec writer", specialty: "Specs", createdBy: demo.user.id });
    // Created already assigned (the create dialog's path).
    const task = await r.tasks.create({ ...taskInput(board.id, column.id, "Needs a spec"), assignee: { kind: "agent", agentId: agent.id } });
    expect(task.assignee).toEqual({ kind: "agent", agentId: agent.id });

    const run = await r.agentRuns.start(task.id, agent.id, demo.user.id);
    await expect(r.agentRuns.start(task.id, agent.id, demo.user.id)).rejects.toBeInstanceOf(ConflictError);
    // The requester's own browser session can't drive the run: no worker token.
    for (const token of ["", "guessed-token"]) {
      const claim = await demo.client.rpc("claim_agent_run", { p_run: run.id, p_worker_token: token });
      expect(claim.error?.message).toBe("forbidden");
    }
    // Unreachable from a browser (here `private` isn't even an exposed API
    // schema; the grants themselves are tested in schema.test.ts).
    const { error: secretsError } = await demo.client.schema("private" as "public").from("worker_secrets" as never).select("*");
    expect(secretsError).not.toBeNull();
    expect(await r.agentRuns.claim(run.id, demo.user.id)).toBe(true);
    const commentId = await r.agentRuns.finish(run.id, demo.user.id, "Here is the spec.");
    expect(await r.comments.get(commentId)).toMatchObject({ author: { kind: "agent", agentId: agent.id } });
    expect((await r.agentRuns.listForTask(task.id))[0]).toMatchObject({ status: "succeeded", commentId });
    expect(await mate.repos.agents.listForTeam(teamId)).toEqual([]); // not a member (yet)
  });

  it("resolves access in one lookup, and only for members", async () => {
    const r = demo.repos;
    const [workspace] = await r.workspaces.listForTeam(teamId);
    const [board] = await r.boards.listForWorkspace(workspace.id);
    const [column] = await r.boards.listColumns(board.id);
    const [bug] = await r.labels.listForTeam(teamId);
    const task = await r.tasks.create({ ...taskInput(board.id, column.id, "Access check"), labelIds: [bug.id] });

    expect(await r.access.team(slug, demo.user.id)).toMatchObject({ team: { id: teamId }, membership: { role: "owner" } });
    expect(await r.access.workspace(workspace.id, demo.user.id)).toMatchObject({ workspace: { id: workspace.id } });
    expect(await r.access.board(board.id, demo.user.id)).toMatchObject({ board: { id: board.id }, team: { id: teamId } });
    expect(await r.access.column(column.id, demo.user.id)).toMatchObject({ column: { id: column.id } });
    expect(await r.access.task(task.id, demo.user.id)).toMatchObject({ task: { id: task.id, labelIds: [bug.id] } });
    expect((await r.tasks.listForBoard(board.id)).find((t) => t.id === task.id)?.labelIds).toEqual([bug.id]);
    expect((await r.workspaces.listWithBoards(teamId)).find((w) => w.id === workspace.id)?.boards.map((b) => b.id)).toContain(board.id);

    expect(await mate.repos.access.team(slug, mate.user.id)).toBeNull();
    expect(await mate.repos.access.task(task.id, mate.user.id)).toBeNull();
    expect(await mate.repos.access.board(board.id, demo.user.id)).toBeNull(); // RLS hides it from mate's session
    // With a session that can see the rows, a non-member id still gets nothing (the filter, not RLS).
    expect(await r.access.team(slug, mate.user.id)).toBeNull();
    expect(await r.access.board(board.id, mate.user.id)).toBeNull();
    expect(await r.access.task(task.id, mate.user.id)).toBeNull();
  });

  it("keeps other teams' data invisible and untouchable", async () => {
    const r = demo.repos;
    const [workspace] = await r.workspaces.listForTeam(teamId);
    const [board] = await r.boards.listForWorkspace(workspace.id);
    const [column] = await r.boards.listColumns(board.id);
    const task = await r.tasks.create(taskInput(board.id, column.id, "Private"));

    expect(await mate.repos.teams.getBySlug(slug)).toBeNull();
    expect(await mate.repos.tasks.listForBoard(board.id)).toEqual([]);
    expect(await mate.repos.tasks.get(task.id)).toBeNull();
    await expect(mate.repos.tasks.update(task.id, { title: "hacked" })).rejects.toBeInstanceOf(NotFoundError);
    await expect(
      mate.repos.tasks.create({ ...taskInput(board.id, column.id, "Intruder"), createdBy: mate.user.id }),
    ).rejects.toThrow();
    expect((await r.tasks.get(task.id))?.title).toBe("Private");
  });

  it("invites a teammate who previews, accepts, gets a role and can be removed", async () => {
    const wrong = await demo.repos.invites.create({ teamId, emails: [`someone-${suffix}@example.test`], invitedBy: demo.user.id });
    await expect(mate.repos.invites.accept(wrong[0].token, mate.user.id)).rejects.toBeInstanceOf(ConflictError);

    const [invite] = await demo.repos.invites.create({ teamId, emails: ["mate@trackaai.test"], invitedBy: demo.user.id });
    const preview = await mate.repos.invites.preview(invite.token);
    expect(preview).toMatchObject({ teamSlug: slug, inviterName: "Demo User", invite: { email: "mate@trackaai.test" } });

    const resent = await demo.repos.invites.resend(invite.id);
    expect(await mate.repos.invites.preview(invite.token)).toBeNull(); // old link is dead
    const membership = await mate.repos.invites.accept(resent.token, mate.user.id);
    expect(membership).toMatchObject({ teamId, userId: mate.user.id, role: "member" });
    await expect(mate.repos.invites.accept(resent.token, mate.user.id)).rejects.toBeInstanceOf(ConflictError);

    expect((await mate.repos.teams.listForUser(mate.user.id)).map((t) => t.slug)).toContain(slug);
    expect((await demo.repos.memberships.listMembers(teamId)).map((m) => m.user.email).sort()).toEqual([
      "demo@trackaai.test",
      "mate@trackaai.test",
    ]);
    expect(await demo.repos.memberships.setRole(teamId, mate.user.id, "admin")).toMatchObject({ role: "admin" });
    // Nobody edits the owner row directly (RLS hides it from updates).
    await expect(mate.repos.memberships.setRole(teamId, demo.user.id, "member")).rejects.toBeInstanceOf(NotFoundError);

    await demo.repos.memberships.remove(teamId, mate.user.id);
    expect(await mate.repos.teams.getBySlug(slug)).toBeNull();
  });
});
