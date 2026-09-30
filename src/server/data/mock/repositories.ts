import { randomBytes, randomUUID } from "node:crypto";
import { generateNKeysBetween } from "fractional-indexing";
import {
  canAdd,
  monthStart,
  DEFAULT_COLUMNS,
  DEFAULT_LABELS,
  INVITE_TTL_DAYS,
  byPosition,
  formatTaskKey,
  positionAt,
  type Column,
  type Comment,
  type Invite,
  type Membership,
  type Task,
  type User,
  isActiveRun,
  type AgentRun,
} from "@/lib/domain";
import { AGENT_BUSY, AGENT_DAILY_LIMIT, AGENT_NOT_ASSIGNED, ConflictError, NotFoundError, PlanLimitError } from "../errors";
import type { Repositories } from "../types";
import type { MockDb } from "./db";
import { hashPassword, verifyPassword } from "./password";
import { createMemorySession, type SessionStore } from "./session";
import type { MockStore } from "./store";

const DAY_MS = 86_400_000;

const newId = () => randomUUID();
const now = () => new Date().toISOString();

function byCreatedAt(a: { createdAt: string }, b: { createdAt: string }) {
  return a.createdAt.localeCompare(b.createdAt);
}

function find<T>(items: T[], predicate: (item: T) => boolean, entity: string, id: string): T {
  const item = items.find(predicate);
  if (!item) throw new NotFoundError(entity, id);
  return item;
}

function findColumn(db: MockDb, boardId: string, columnId: string): Column {
  return find(db.columns, (c) => c.id === columnId && c.boardId === boardId, "Column", columnId);
}

/** Sorted positions of a column's tasks, optionally leaving one task out (the one being moved). */
function taskPositions(db: MockDb, columnId: string, excludeId?: string): string[] {
  return db.tasks
    .filter((t) => t.columnId === columnId && t.id !== excludeId)
    .sort(byPosition)
    .map((t) => t.position);
}

function deleteTasks(db: MockDb, taskIds: Set<string>) {
  db.tasks = db.tasks.filter((t) => !taskIds.has(t.id));
  db.comments = db.comments.filter((c) => !taskIds.has(c.taskId));
  db.agentRuns = db.agentRuns.filter((r) => !taskIds.has(r.taskId));
  for (const task of db.tasks) {
    if (task.parentId && taskIds.has(task.parentId)) task.parentId = null;
  }
}

function inviteExpiry(from: Date) {
  return new Date(from.getTime() + INVITE_TTL_DAYS * DAY_MS).toISOString();
}

function assertUniqueLabelName(db: MockDb, teamId: string, name: string, exceptId?: string) {
  const taken = db.labels.some(
    (l) => l.teamId === teamId && l.id !== exceptId && l.name.toLowerCase() === name.toLowerCase(),
  );
  if (taken) throw new ConflictError("name", "A label with this name already exists");
}

function deleteBoards(db: MockDb, boardIds: Set<string>) {
  deleteTasks(db, new Set(db.tasks.filter((t) => boardIds.has(t.boardId)).map((t) => t.id)));
  db.columns = db.columns.filter((c) => !boardIds.has(c.boardId));
  db.boards = db.boards.filter((b) => !boardIds.has(b.id));
}

export function createMockRepositories(store: MockStore, session: SessionStore = createMemorySession()): Repositories {
  return {
    auth: {
      async signUp({ name, email, password }) {
        const normalized = email.toLowerCase();
        const passwordHash = await hashPassword(password);
        const user = await store.write((db) => {
          if (db.users.some((u) => u.email === normalized)) {
            throw new ConflictError("email", "An account with this email already exists");
          }
          const user: User = { id: newId(), email: normalized, name, avatarUrl: null, createdAt: now() };
          db.users.push(user);
          db.credentials.push({ userId: user.id, passwordHash });
          return user;
        });
        await session.set(user.id);
        return { user, needsConfirmation: false };
      },

      async signIn({ email, password }) {
        const found = await store.read((db) => {
          const user = db.users.find((u) => u.email === email.toLowerCase());
          const credentials = user && db.credentials.find((c) => c.userId === user.id);
          return user && credentials ? { user, passwordHash: credentials.passwordHash } : null;
        });
        if (!found || !(await verifyPassword(password, found.passwordHash))) return null;
        await session.set(found.user.id);
        return found.user;
      },

      signOut: () => session.clear(),
      currentUserId: () => session.get(),
      // The mock has no email step, so there are never links to confirm.
      confirmEmail: async () => false,
    },

    users: {
      getById: (id) => store.read((db) => db.users.find((u) => u.id === id) ?? null),
      getByEmail: (email) =>
        store.read((db) => db.users.find((u) => u.email === email.toLowerCase()) ?? null),
      update: (id, patch) =>
        store.write((db) => {
          const user = find(db.users, (u) => u.id === id, "User", id);
          Object.assign(user, patch);
          return user;
        }),
    },

    teams: {
      create: ({ name, slug, ownerId }) =>
        store.write((db) => {
          if (db.teams.some((t) => t.slug === slug)) {
            throw new ConflictError("slug", "This URL is already taken");
          }
          const team = { id: newId(), name, slug, plan: "free" as const, createdAt: now() };
          db.teams.push(team);
          db.memberships.push({ teamId: team.id, userId: ownerId, role: "owner", joinedAt: now() });
          for (const label of DEFAULT_LABELS) db.labels.push({ id: newId(), teamId: team.id, ...label });
          return team;
        }),
      get: (id) => store.read((db) => db.teams.find((t) => t.id === id) ?? null),
      getBySlug: (slug) => store.read((db) => db.teams.find((t) => t.slug === slug) ?? null),
      listForUser: (userId) =>
        store.read((db) => {
          const teamIds = new Set(db.memberships.filter((m) => m.userId === userId).map((m) => m.teamId));
          return db.teams.filter((t) => teamIds.has(t.id)).sort((a, b) => a.name.localeCompare(b.name));
        }),
      update: (id, patch) =>
        store.write((db) => {
          const team = find(db.teams, (t) => t.id === id, "Team", id);
          Object.assign(team, patch);
          return team;
        }),
      setPlan: (id, plan) =>
        store.write((db) => {
          const team = find(db.teams, (t) => t.id === id, "Team", id);
          team.plan = plan;
          return team;
        }),
      usage: (id) =>
        store.read((db) => {
          const now = new Date().toISOString();
          return {
            members: db.memberships.filter((m) => m.teamId === id).length,
            pendingInvites: db.invites.filter((i) => i.teamId === id && i.acceptedAt === null && i.expiresAt > now)
              .length,
            workspaces: db.workspaces.filter((w) => w.teamId === id).length,
          };
        }),
      delete: (id) =>
        store.write((db) => {
          const workspaceIds = new Set(db.workspaces.filter((w) => w.teamId === id).map((w) => w.id));
          deleteBoards(db, new Set(db.boards.filter((b) => workspaceIds.has(b.workspaceId)).map((b) => b.id)));
          db.workspaces = db.workspaces.filter((w) => w.teamId !== id);
          db.labels = db.labels.filter((l) => l.teamId !== id);
          db.invites = db.invites.filter((i) => i.teamId !== id);
          db.memberships = db.memberships.filter((m) => m.teamId !== id);
          db.aiUsage = db.aiUsage.filter((u) => u.teamId !== id);
          db.agentRuns = db.agentRuns.filter((r) => r.teamId !== id);
          db.agents = db.agents.filter((a) => a.teamId !== id);
          db.teams = db.teams.filter((t) => t.id !== id);
        }),
    },

    memberships: {
      list: (teamId) => store.read((db) => db.memberships.filter((m) => m.teamId === teamId)),
      get: (teamId, userId) =>
        store.read((db) => db.memberships.find((m) => m.teamId === teamId && m.userId === userId) ?? null),
      listMembers: (teamId) =>
        store.read((db) =>
          db.memberships
            .filter((m) => m.teamId === teamId)
            .flatMap((m) => {
              const user = db.users.find((u) => u.id === m.userId);
              return user ? [{ ...m, user }] : [];
            })
            .sort((a, b) => a.user.name.localeCompare(b.user.name)),
        ),
      setRole: (teamId, userId, role) =>
        store.write((db) => {
          const membership = find(
            db.memberships,
            (m) => m.teamId === teamId && m.userId === userId,
            "Membership",
            `${teamId}/${userId}`,
          );
          membership.role = role;
          return membership;
        }),
      remove: (teamId, userId) =>
        store.write((db) => {
          db.memberships = db.memberships.filter((m) => !(m.teamId === teamId && m.userId === userId));
        }),
      transferOwnership: (teamId, fromUserId, toUserId) =>
        store.write((db) => {
          const member = (userId: string) =>
            find(db.memberships, (m) => m.teamId === teamId && m.userId === userId, "Membership", `${teamId}/${userId}`);
          const from = member(fromUserId);
          const to = member(toUserId);
          if (from.role !== "owner") throw new ConflictError("owner", "Only the owner can transfer ownership");
          from.role = "admin";
          to.role = "owner";
        }),
    },

    workspaces: {
      create: ({ teamId, name, keyPrefix }) =>
        store.write((db) => {
          find(db.teams, (t) => t.id === teamId, "Team", teamId);
          if (db.workspaces.some((w) => w.teamId === teamId && w.keyPrefix === keyPrefix)) {
            throw new ConflictError("keyPrefix", "Another workspace already uses this prefix");
          }
          const workspace = { id: newId(), teamId, name, keyPrefix, nextTaskNumber: 1, createdAt: now() };
          db.workspaces.push(workspace);
          return workspace;
        }),
      get: (id) => store.read((db) => db.workspaces.find((w) => w.id === id) ?? null),
      listForTeam: (teamId) =>
        store.read((db) => db.workspaces.filter((w) => w.teamId === teamId).sort(byCreatedAt)),
      listWithBoards: (teamId) =>
        store.read((db) =>
          db.workspaces
            .filter((w) => w.teamId === teamId)
            .sort(byCreatedAt)
            .map((w) => ({ ...w, boards: db.boards.filter((b) => b.workspaceId === w.id).sort(byCreatedAt) })),
        ),
      update: (id, patch) =>
        store.write((db) => {
          const workspace = find(db.workspaces, (w) => w.id === id, "Workspace", id);
          Object.assign(workspace, patch);
          return workspace;
        }),
      delete: (id) =>
        store.write((db) => {
          deleteBoards(db, new Set(db.boards.filter((b) => b.workspaceId === id).map((b) => b.id)));
          db.workspaces = db.workspaces.filter((w) => w.id !== id);
        }),
    },

    boards: {
      create: ({ workspaceId, name, description }) =>
        store.write((db) => {
          find(db.workspaces, (w) => w.id === workspaceId, "Workspace", workspaceId);
          const board = { id: newId(), workspaceId, name, description, createdAt: now() };
          db.boards.push(board);
          const positions = generateNKeysBetween(null, null, DEFAULT_COLUMNS.length);
          DEFAULT_COLUMNS.forEach((columnName, i) => {
            db.columns.push({ id: newId(), boardId: board.id, name: columnName, position: positions[i] });
          });
          return board;
        }),
      get: (id) => store.read((db) => db.boards.find((b) => b.id === id) ?? null),
      listColumnsForBoards: (boardIds) =>
        store.read((db) =>
          db.columns
            .filter((c) => boardIds.includes(c.boardId))
            .sort((a, b) => boardIds.indexOf(a.boardId) - boardIds.indexOf(b.boardId) || byPosition(a, b)),
        ),
      listForWorkspace: (workspaceId) =>
        store.read((db) => db.boards.filter((b) => b.workspaceId === workspaceId).sort(byCreatedAt)),
      update: (id, patch) =>
        store.write((db) => {
          const board = find(db.boards, (b) => b.id === id, "Board", id);
          Object.assign(board, patch);
          return board;
        }),
      delete: (id) => store.write((db) => deleteBoards(db, new Set([id]))),
      listColumns: (boardId) =>
        store.read((db) => db.columns.filter((c) => c.boardId === boardId).sort(byPosition)),
      getColumn: (id) => store.read((db) => db.columns.find((c) => c.id === id) ?? null),
      createColumn: (boardId, name) =>
        store.write((db) => {
          find(db.boards, (b) => b.id === boardId, "Board", boardId);
          const positions = db.columns.filter((c) => c.boardId === boardId).sort(byPosition).map((c) => c.position);
          const column = { id: newId(), boardId, name, position: positionAt(positions, positions.length) };
          db.columns.push(column);
          return column;
        }),
      renameColumn: (id, name) =>
        store.write((db) => {
          const column = find(db.columns, (c) => c.id === id, "Column", id);
          column.name = name;
          return column;
        }),
      moveColumn: (id, index) =>
        store.write((db) => {
          const column = find(db.columns, (c) => c.id === id, "Column", id);
          const others = db.columns
            .filter((c) => c.boardId === column.boardId && c.id !== id)
            .sort(byPosition)
            .map((c) => c.position);
          column.position = positionAt(others, index);
          return column;
        }),
      deleteColumn: (id) =>
        store.write((db) => {
          const column = find(db.columns, (c) => c.id === id, "Column", id);
          if (db.tasks.some((t) => t.columnId === id)) {
            throw new ConflictError("column", "Move or delete this column's tasks first");
          }
          if (db.columns.filter((c) => c.boardId === column.boardId).length === 1) {
            throw new ConflictError("column", "A board needs at least one column");
          }
          db.columns = db.columns.filter((c) => c.id !== id);
        }),
    },

    tasks: {
      create: ({ placement = "end", ...input }) =>
        store.write((db) => {
          const board = find(db.boards, (b) => b.id === input.boardId, "Board", input.boardId);
          const workspace = find(db.workspaces, (w) => w.id === board.workspaceId, "Workspace", board.workspaceId);
          findColumn(db, board.id, input.columnId);
          const positions = taskPositions(db, input.columnId);
          const number = workspace.nextTaskNumber++;
          const timestamp = now();
          const task: Task = {
            ...input,
            id: newId(),
            number,
            key: formatTaskKey(workspace.keyPrefix, number),
            position: positionAt(positions, placement === "start" ? 0 : positions.length),
            createdAt: timestamp,
            updatedAt: timestamp,
          };
          db.tasks.push(task);
          return task;
        }),
      get: (id) => store.read((db) => db.tasks.find((t) => t.id === id) ?? null),
      getByKey: (workspaceId, key) =>
        store.read((db) => {
          const boardIds = new Set(db.boards.filter((b) => b.workspaceId === workspaceId).map((b) => b.id));
          const wanted = key.trim().toUpperCase();
          return db.tasks.find((t) => boardIds.has(t.boardId) && t.key === wanted) ?? null;
        }),
      listForBoard: (boardId) =>
        store.read((db) => db.tasks.filter((t) => t.boardId === boardId).sort(byPosition)),
      listAssignedTo: (teamId, userId) =>
        store.read((db) => {
          const workspaceIds = new Set(db.workspaces.filter((w) => w.teamId === teamId).map((w) => w.id));
          const boardIds = new Set(db.boards.filter((b) => workspaceIds.has(b.workspaceId)).map((b) => b.id));
          return db.tasks
            .filter((t) => boardIds.has(t.boardId) && t.assignee?.kind === "user" && t.assignee.userId === userId)
            .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
        }),
      update: (id, patch) =>
        store.write((db) => {
          const task = find(db.tasks, (t) => t.id === id, "Task", id);
          Object.assign(task, patch, { updatedAt: now() });
          return task;
        }),
      move: (id, { columnId, index }) =>
        store.write((db) => {
          const task = find(db.tasks, (t) => t.id === id, "Task", id);
          findColumn(db, task.boardId, columnId);
          const position = positionAt(taskPositions(db, columnId, id), index);
          Object.assign(task, { columnId, position, updatedAt: now() });
          return task;
        }),
      delete: (id) => store.write((db) => deleteTasks(db, new Set([id]))),
    },

    labels: {
      listForTeam: (teamId) => store.read((db) => db.labels.filter((l) => l.teamId === teamId)),
      get: (id) => store.read((db) => db.labels.find((l) => l.id === id) ?? null),
      create: (teamId, { name, color }) =>
        store.write((db) => {
          find(db.teams, (t) => t.id === teamId, "Team", teamId);
          assertUniqueLabelName(db, teamId, name);
          const label = { id: newId(), teamId, name, color };
          db.labels.push(label);
          return label;
        }),
      update: (id, patch) =>
        store.write((db) => {
          const label = find(db.labels, (l) => l.id === id, "Label", id);
          if (patch.name) assertUniqueLabelName(db, label.teamId, patch.name, id);
          Object.assign(label, patch);
          return label;
        }),
      delete: (id) =>
        store.write((db) => {
          db.labels = db.labels.filter((l) => l.id !== id);
          for (const task of db.tasks) {
            if (task.labelIds.includes(id)) task.labelIds = task.labelIds.filter((labelId) => labelId !== id);
          }
        }),
    },

    comments: {
      listForTask: (taskId) =>
        store.read((db) => db.comments.filter((c) => c.taskId === taskId).sort(byCreatedAt)),
      get: (id) => store.read((db) => db.comments.find((c) => c.id === id) ?? null),
      create: ({ taskId, body, author }) =>
        store.write((db) => {
          find(db.tasks, (t) => t.id === taskId, "Task", taskId);
          const comment: Comment = { id: newId(), taskId, body, author, createdAt: now() };
          db.comments.push(comment);
          return comment;
        }),
      delete: (id) =>
        store.write((db) => {
          db.comments = db.comments.filter((c) => c.id !== id);
        }),
    },

    invites: {
      create: ({ teamId, emails, invitedBy, role = "member" }) =>
        store.write((db) => {
          find(db.teams, (t) => t.id === teamId, "Team", teamId);
          const memberIds = new Set(db.memberships.filter((m) => m.teamId === teamId).map((m) => m.userId));
          const createdAt = new Date();
          const pending = db.invites.filter(
            (i) => i.teamId === teamId && i.acceptedAt === null && i.expiresAt > createdAt.toISOString(),
          );
          const taken = new Set([
            ...db.users.filter((u) => memberIds.has(u.id)).map((u) => u.email),
            ...pending.map((i) => i.email),
          ]);
          const created: Invite[] = [];
          for (const email of new Set(emails.map((e) => e.toLowerCase()))) {
            if (taken.has(email)) continue;
            created.push({
              id: newId(),
              teamId,
              email,
              role,
              token: randomBytes(24).toString("base64url"),
              invitedBy,
              expiresAt: inviteExpiry(createdAt),
              acceptedAt: null,
              createdAt: createdAt.toISOString(),
            });
          }
          db.invites.push(...created);
          return created;
        }),
      listPending: (teamId) =>
        store.read((db) => {
          const current = now();
          return db.invites.filter(
            (i) => i.teamId === teamId && i.acceptedAt === null && i.expiresAt > current,
          );
        }),
      get: (id) => store.read((db) => db.invites.find((i) => i.id === id) ?? null),
      getByToken: (token) => store.read((db) => db.invites.find((i) => i.token === token) ?? null),
      preview: (token) =>
        store.read((db) => {
          const invite = db.invites.find((i) => i.token === token);
          const team = invite && db.teams.find((t) => t.id === invite.teamId);
          if (!invite || !team) return null;
          const inviter = db.users.find((u) => u.id === invite.invitedBy);
          return { invite, teamName: team.name, teamSlug: team.slug, inviterName: inviter?.name ?? null };
        }),
      resend: (id) =>
        store.write((db) => {
          const invite = find(db.invites, (i) => i.id === id, "Invite", id);
          if (invite.acceptedAt) throw new ConflictError("token", "This invite was already accepted");
          invite.token = randomBytes(24).toString("base64url");
          invite.expiresAt = inviteExpiry(new Date());
          return invite;
        }),
      revoke: (id) =>
        store.write((db) => {
          db.invites = db.invites.filter((i) => i.id !== id);
        }),
      accept: (token, userId) =>
        store.write((db) => {
          const invite = find(db.invites, (i) => i.token === token, "Invite", "token");
          const user = find(db.users, (u) => u.id === userId, "User", userId);
          if (invite.acceptedAt) throw new ConflictError("token", "This invite has already been used");
          if (invite.expiresAt <= now()) throw new ConflictError("token", "This invite has expired");
          if (invite.email !== user.email) {
            throw new ConflictError("email", `This invite was sent to ${invite.email}`);
          }
          invite.acceptedAt = now();
          const existing = db.memberships.find((m) => m.teamId === invite.teamId && m.userId === userId);
          if (existing) return existing;
          const membership: Membership = { teamId: invite.teamId, userId, role: invite.role, joinedAt: now() };
          db.memberships.push(membership);
          return membership;
        }),
    },

    aiUsage: {
      startRun: (input) =>
        store.write((db) => {
          const team = find(db.teams, (t) => t.id === input.teamId, "Team", input.teamId);
          const since = monthStart().toISOString();
          const used = db.aiUsage.filter((u) => u.teamId === team.id && u.createdAt >= since).length;
          if (!canAdd(team.plan, "aiRuns", used)) throw new PlanLimitError(team.plan, "aiRuns");
          const run = { ...input, id: newId(), inputTokens: 0, outputTokens: 0, createdAt: now() };
          db.aiUsage.push(run);
          return run.id;
        }),
      finishRun: (runId, usage) =>
        store.write((db) => {
          const run = db.aiUsage.find((u) => u.id === runId);
          if (run && run.inputTokens === 0 && run.outputTokens === 0) Object.assign(run, usage);
        }),
      countSince: (teamId, since) =>
        store.read(
          (db) => db.aiUsage.filter((u) => u.teamId === teamId && u.createdAt >= since.toISOString()).length,
        ),
    },

    agents: {
      listForTeam: (teamId) =>
        store.read((db) => db.agents.filter((a) => a.teamId === teamId).sort((a, b) => a.name.localeCompare(b.name))),
      get: (id) => store.read((db) => db.agents.find((a) => a.id === id) ?? null),
      create: (teamId, { name, specialty }) =>
        store.write((db) => {
          assertUniqueAgentName(db, teamId, name);
          const agent = { id: newId(), teamId, name, specialty, createdAt: now() };
          db.agents.push(agent);
          return agent;
        }),
      update: (id, { name, specialty }) =>
        store.write((db) => {
          const agent = find(db.agents, (a) => a.id === id, "Agent", id);
          assertUniqueAgentName(db, agent.teamId, name, id);
          Object.assign(agent, { name, specialty });
          return agent;
        }),
      delete: (id) =>
        store.write((db) => {
          for (const task of db.tasks) if (task.assignee?.kind === "agent" && task.assignee.agentId === id) task.assignee = null;
          db.agentRuns = db.agentRuns.filter((r) => r.agentId !== id);
          db.agents = db.agents.filter((a) => a.id !== id);
        }),
    },

    agentRuns: {
      start: (taskId, agentId, userId) =>
        store.write((db) => {
          const task = find(db.tasks, (t) => t.id === taskId, "Task", taskId);
          const board = find(db.boards, (b) => b.id === task.boardId, "Board", task.boardId);
          const workspace = find(db.workspaces, (w) => w.id === board.workspaceId, "Workspace", board.workspaceId);
          const team = find(db.teams, (t) => t.id === workspace.teamId, "Team", workspace.teamId);
          const agent = db.agents.find((a) => a.id === agentId && a.teamId === team.id);
          if (!agent) throw new NotFoundError("Agent", agentId);
          if (team.plan !== "pro") throw new ConflictError("plan", AGENTS_NEED_PRO);
          if (task.assignee?.kind !== "agent" || task.assignee.agentId !== agentId) {
            throw new ConflictError("agent", AGENT_NOT_ASSIGNED);
          }
          // Same rules as start_agent_run: stale runs time out, then the caps apply.
          const staleBefore = new Date(Date.now() - 10 * 60_000).toISOString();
          for (const r of db.agentRuns) {
            if (r.teamId === team.id && isActiveRun(r) && r.createdAt < staleBefore) {
              Object.assign(r, { status: "failed", finishedAt: now(), error: "Timed out" });
            }
          }
          const teamRuns = db.agentRuns.filter((r) => r.teamId === team.id);
          if (teamRuns.some((r) => r.taskId === taskId && isActiveRun(r))) throw new ConflictError("agent", ALREADY_WORKING);
          if (teamRuns.filter(isActiveRun).length >= 3) throw new ConflictError("agent", AGENT_BUSY);
          const dayAgo = new Date(Date.now() - DAY_MS).toISOString();
          if (teamRuns.filter((r) => r.createdAt > dayAgo).length >= 50) throw new ConflictError("agent", AGENT_DAILY_LIMIT);
          const run: AgentRun = {
            id: newId(),
            teamId: team.id,
            taskId,
            agentId,
            requestedBy: userId,
            status: "queued",
            error: null,
            commentId: null,
            createdAt: now(),
            startedAt: null,
            finishedAt: null,
          };
          db.agentRuns.push(run);
          return run;
        }),
      claim: (runId, userId) =>
        store.write((db) => {
          const run = db.agentRuns.find((r) => r.id === runId && r.requestedBy === userId && r.status === "queued");
          if (!run) return false;
          Object.assign(run, { status: "running", startedAt: now() });
          return true;
        }),
      finish: (runId, userId, body) =>
        store.write((db) => {
          const run = db.agentRuns.find((r) => r.id === runId && r.requestedBy === userId && r.status === "running");
          if (!run || !db.tasks.some((t) => t.id === run.taskId)) throw new NotFoundError("Run", runId);
          const comment: Comment = {
            id: newId(),
            taskId: run.taskId,
            author: { kind: "agent", agentId: run.agentId },
            body: body.slice(0, 10_000),
            createdAt: now(),
          };
          db.comments.push(comment);
          Object.assign(run, { status: "succeeded", finishedAt: now(), commentId: comment.id });
          return comment.id;
        }),
      fail: (runId, userId, error) =>
        store.write((db) => {
          const run = db.agentRuns.find((r) => r.id === runId && r.requestedBy === userId && isActiveRun(r));
          if (run) Object.assign(run, { status: "failed", finishedAt: now(), error: error.slice(0, 500) });
        }),
      get: (id) => store.read((db) => db.agentRuns.find((r) => r.id === id) ?? null),
      listForTask: (taskId) =>
        store.read((db) =>
          // Reversed first so runs from the same millisecond keep newest-first order.
          db.agentRuns
            .filter((r) => r.taskId === taskId)
            .reverse()
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
        ),
    },

    access: {
      team: (slug, userId) =>
        store.read((db) => {
          const team = db.teams.find((t) => t.slug === slug);
          return team ? teamAccess(db, team.id, userId) : null;
        }),
      workspace: (id, userId) => store.read((db) => workspaceAccess(db, id, userId)),
      board: (id, userId) => store.read((db) => boardAccess(db, id, userId)),
      column: (id, userId) =>
        store.read((db) => {
          const column = db.columns.find((c) => c.id === id);
          const access = column && boardAccess(db, column.boardId, userId);
          return access ? { ...access, column: column! } : null;
        }),
      task: (id, userId) =>
        store.read((db) => {
          const task = db.tasks.find((t) => t.id === id);
          const access = task && boardAccess(db, task.boardId, userId);
          return access ? { ...access, task: task! } : null;
        }),
    },
  };
}

const AGENTS_NEED_PRO = "AI teammates are part of the Pro plan.";
const ALREADY_WORKING = "This AI teammate is already working on this task.";

function assertUniqueAgentName(db: MockDb, teamId: string, name: string, exceptId?: string) {
  const taken = db.agents.some((a) => a.teamId === teamId && a.id !== exceptId && a.name.toLowerCase() === name.toLowerCase());
  if (taken) throw new ConflictError("name", "An AI teammate with this name already exists");
}

function teamAccess(db: MockDb, teamId: string, userId: string) {
  const team = db.teams.find((t) => t.id === teamId);
  const membership = db.memberships.find((m) => m.teamId === teamId && m.userId === userId);
  return team && membership ? { team, membership } : null;
}

function workspaceAccess(db: MockDb, workspaceId: string, userId: string) {
  const workspace = db.workspaces.find((w) => w.id === workspaceId);
  const access = workspace && teamAccess(db, workspace.teamId, userId);
  return access ? { ...access, workspace: workspace! } : null;
}

function boardAccess(db: MockDb, boardId: string, userId: string) {
  const board = db.boards.find((b) => b.id === boardId);
  const access = board && workspaceAccess(db, board.workspaceId, userId);
  return access ? { ...access, board: board! } : null;
}
