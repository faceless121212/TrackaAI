import { randomBytes, randomUUID } from "node:crypto";
import { generateKeyBetween, generateNKeysBetween } from "fractional-indexing";
import {
  DEFAULT_COLUMNS,
  INVITE_TTL_DAYS,
  formatTaskKey,
  type Column,
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

// fractional-indexing keys compare by code unit, not locale.
function byPosition(a: { position: string }, b: { position: string }) {
  return a.position < b.position ? -1 : a.position > b.position ? 1 : 0;
}

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
          return team;
        }),
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
      listColumns: (boardId) =>
        store.read((db) => db.columns.filter((c) => c.boardId === boardId).sort(byPosition)),
    },

    tasks: {
      create: (input) =>
        store.write((db) => {
          const board = find(db.boards, (b) => b.id === input.boardId, "Board", input.boardId);
          const workspace = find(db.workspaces, (w) => w.id === board.workspaceId, "Workspace", board.workspaceId);
          findColumn(db, board.id, input.columnId);
          const last = db.tasks.filter((t) => t.columnId === input.columnId).sort(byPosition).at(-1);
          const number = workspace.nextTaskNumber++;
          const timestamp = now();
          const task: Task = {
            ...input,
            id: newId(),
            number,
            key: formatTaskKey(workspace.keyPrefix, number),
            position: generateKeyBetween(last?.position ?? null, null),
            createdAt: timestamp,
            updatedAt: timestamp,
          };
          db.tasks.push(task);
          return task;
        }),
      getByKey: (workspaceId, key) =>
        store.read((db) => {
          const boardIds = new Set(db.boards.filter((b) => b.workspaceId === workspaceId).map((b) => b.id));
          const wanted = key.trim().toUpperCase();
          return db.tasks.find((t) => boardIds.has(t.boardId) && t.key === wanted) ?? null;
        }),
      listForBoard: (boardId) =>
        store.read((db) => db.tasks.filter((t) => t.boardId === boardId).sort(byPosition)),
      update: (id, patch) =>
        store.write((db) => {
          const task = find(db.tasks, (t) => t.id === id, "Task", id);
          Object.assign(task, patch, { updatedAt: now() });
          return task;
        }),
      move: (id, { columnId, position }) =>
        store.write((db) => {
          const task = find(db.tasks, (t) => t.id === id, "Task", id);
          findColumn(db, task.boardId, columnId);
          Object.assign(task, { columnId, position, updatedAt: now() });
          return task;
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
