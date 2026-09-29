import { randomBytes, randomUUID } from "node:crypto";
import { generateNKeysBetween } from "fractional-indexing";
import {
  DEFAULT_COLUMNS,
  DEFAULT_LABELS,
  INVITE_TTL_DAYS,
  byPosition,
  formatTaskKey,
  positionAt,
  type Column,
  type Comment,
  type Invite,
  type Task,
  type User,
} from "@/lib/domain";
import { ConflictError, NotFoundError } from "../errors";
import type { Repositories } from "../types";
import type { MockDb } from "./db";
import { hashPassword, verifyPassword } from "./password";
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
  for (const task of db.tasks) {
    if (task.parentId && taskIds.has(task.parentId)) task.parentId = null;
  }
}

function deleteBoards(db: MockDb, boardIds: Set<string>) {
  deleteTasks(db, new Set(db.tasks.filter((t) => boardIds.has(t.boardId)).map((t) => t.id)));
  db.columns = db.columns.filter((c) => !boardIds.has(c.boardId));
  db.boards = db.boards.filter((b) => !boardIds.has(b.id));
}

export function createMockRepositories(store: MockStore): Repositories {
  return {
    auth: {
      async signUp({ name, email, password }) {
        const normalized = email.toLowerCase();
        const passwordHash = await hashPassword(password);
        return store.write((db) => {
          if (db.users.some((u) => u.email === normalized)) {
            throw new ConflictError("email", "An account with this email already exists");
          }
          const user: User = { id: newId(), email: normalized, name, avatarUrl: null, createdAt: now() };
          db.users.push(user);
          db.credentials.push({ userId: user.id, passwordHash });
          return user;
        });
      },

      async signIn({ email, password }) {
        const found = await store.read((db) => {
          const user = db.users.find((u) => u.email === email.toLowerCase());
          const credentials = user && db.credentials.find((c) => c.userId === user.id);
          return user && credentials ? { user, passwordHash: credentials.passwordHash } : null;
        });
        if (!found || !(await verifyPassword(password, found.passwordHash))) return null;
        return found.user;
      },
    },

    users: {
      getById: (id) => store.read((db) => db.users.find((u) => u.id === id) ?? null),
      getByEmail: (email) =>
        store.read((db) => db.users.find((u) => u.email === email.toLowerCase()) ?? null),
    },

    teams: {
      create: ({ name, slug, ownerId }) =>
        store.write((db) => {
          if (db.teams.some((t) => t.slug === slug)) {
            throw new ConflictError("slug", "This URL is already taken");
          }
          const team = { id: newId(), name, slug, plan: "lite" as const, createdAt: now() };
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
      create: ({ teamId, emails, invitedBy }) =>
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
          const expiresAt = new Date(createdAt.getTime() + INVITE_TTL_DAYS * DAY_MS);
          const created: Invite[] = [];
          for (const email of new Set(emails.map((e) => e.toLowerCase()))) {
            if (taken.has(email)) continue;
            created.push({
              id: newId(),
              teamId,
              email,
              role: "member",
              token: randomBytes(24).toString("base64url"),
              invitedBy,
              expiresAt: expiresAt.toISOString(),
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
    },
  };
}
