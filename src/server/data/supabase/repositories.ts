import { randomBytes } from "node:crypto";
import type { AuthError, EmailOtpType, PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import { generateNKeysBetween } from "fractional-indexing";
import {
  DEFAULT_COLUMNS,
  DEFAULT_LABELS,
  INVITE_TTL_DAYS,
  planSchema,
  positionAt,
  type Assignee,
  type Board,
  type Column,
  type Comment,
  type Invite,
  type Label,
  type Membership,
  type PlanResource,
  type Task,
  type Team,
  type Theme,
  type UpdateTaskInput,
  type User,
  type Workspace,
} from "@/lib/domain";
import { ConflictError, NotFoundError, PlanLimitError } from "../errors";
import type { Repositories } from "../types";
import type { Database } from "./database.types";

type Client = SupabaseClient<Database>;
type Row<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];

const DAY_MS = 86_400_000;

// ---------------------------------------------------------------------------
// Row ⇄ domain mapping (snake_case columns, ISO timestamps)
// ---------------------------------------------------------------------------

const iso = (value: string) => new Date(value).toISOString();

const toUser = (r: Row<"profiles">): User => ({
  id: r.id,
  email: r.email,
  name: r.name,
  avatarUrl: r.avatar_url,
  theme: (r.theme ?? undefined) as Theme | undefined,
  createdAt: iso(r.created_at),
});

const toTeam = (r: Row<"teams">): Team => ({
  id: r.id,
  name: r.name,
  slug: r.slug,
  plan: r.plan as Team["plan"],
  createdAt: iso(r.created_at),
});

const toMembership = (r: Row<"memberships">): Membership => ({
  teamId: r.team_id,
  userId: r.user_id,
  role: r.role as Membership["role"],
  joinedAt: iso(r.joined_at),
});

const toWorkspace = (r: Row<"workspaces">): Workspace => ({
  id: r.id,
  teamId: r.team_id,
  name: r.name,
  keyPrefix: r.key_prefix,
  nextTaskNumber: r.next_task_number,
  createdAt: iso(r.created_at),
});

const toBoard = (r: Row<"boards">): Board => ({
  id: r.id,
  workspaceId: r.workspace_id,
  name: r.name,
  description: r.description,
  createdAt: iso(r.created_at),
});

const toColumn = (r: Row<"columns">): Column => ({ id: r.id, boardId: r.board_id, name: r.name, position: r.position });

const toLabel = (r: Row<"labels">): Label => ({
  id: r.id,
  teamId: r.team_id,
  name: r.name,
  color: r.color as Label["color"],
});

function toAssignee(userId: string | null, agentId: string | null): Assignee {
  if (userId) return { kind: "user", userId };
  if (agentId) return { kind: "agent", agentId };
  return null;
}

const toTask = (r: Row<"tasks">, labelIds: string[]): Task => ({
  id: r.id,
  boardId: r.board_id,
  columnId: r.column_id,
  number: r.number,
  key: r.key,
  title: r.title,
  description: r.description,
  priority: r.priority as Task["priority"],
  assignee: toAssignee(r.assignee_user_id, r.assignee_agent_id),
  labelIds,
  dueDate: r.due_date,
  position: r.position,
  parentId: r.parent_id,
  createdBy: r.created_by,
  createdAt: iso(r.created_at),
  updatedAt: iso(r.updated_at),
});

const toComment = (r: Row<"comments">): Comment => ({
  id: r.id,
  taskId: r.task_id,
  author: r.author_user_id
    ? { kind: "user", userId: r.author_user_id }
    : { kind: "agent", agentId: r.author_agent_id ?? "unknown" },
  body: r.body,
  createdAt: iso(r.created_at),
});

const toInvite = (r: Row<"invites">): Invite => ({
  id: r.id,
  teamId: r.team_id,
  email: r.email,
  role: r.role as Invite["role"],
  token: r.token,
  invitedBy: r.invited_by,
  expiresAt: iso(r.expires_at),
  acceptedAt: r.accepted_at ? iso(r.accepted_at) : null,
  createdAt: iso(r.created_at),
});

// ---------------------------------------------------------------------------
// Errors: Postgres/PostgREST → the same ConflictError/NotFoundError as the mock
// ---------------------------------------------------------------------------

const UNIQUE_FIELDS: [constraint: string, field: string, message: string][] = [
  ["teams_slug_key", "slug", "This URL is already taken"],
  ["workspaces_team_id_key_prefix_key", "keyPrefix", "Another workspace already uses this prefix"],
  ["labels_team_name", "name", "A label with this name already exists"],
];

const RAISED: Record<string, () => Error> = {
  invite_not_found: () => new NotFoundError("Invite", "token"),
  invite_used: () => new ConflictError("token", "This invite has already been used"),
  invite_expired: () => new ConflictError("token", "This invite has expired"),
  board_not_found: () => new NotFoundError("Board", "id"),
  column_not_found: () => new NotFoundError("Column", "id"),
  membership_not_found: () => new NotFoundError("Membership", "id"),
  label_not_in_team: () => new ConflictError("labelIds", "Unknown label"),
  parent_not_found: () => new NotFoundError("Task", "parentId"),
  assignee_not_member: () => new ConflictError("assignee", "That person isn't a member of this team"),
  not_owner: () => new ConflictError("owner", "Only the owner can transfer ownership"),
};

function toError(error: PostgrestError): Error {
  if (error.code === "23505") {
    const match = UNIQUE_FIELDS.find(([constraint]) => error.message.includes(constraint));
    if (match) return new ConflictError(match[1], match[2]);
  }
  if (error.code === "23503" && error.message.includes("tasks_column_id_fkey")) {
    return new ConflictError("column", "Move or delete this column's tasks first");
  }
  if (error.message === "invite_email_mismatch") {
    return new ConflictError("email", `This invite was sent to ${error.details}`);
  }
  if (error.message === "plan_limit_reached") {
    return new PlanLimitError(planSchema.parse(error.hint), error.details as PlanResource);
  }
  if (RAISED[error.message]) return RAISED[error.message]();
  // PGRST116: .single() found no row — RLS hid it or it doesn't exist.
  if (error.code === "PGRST116") return new NotFoundError("Row", "id");
  return new Error(`Supabase error ${error.code}: ${error.message}`);
}

type Result<T> = { data: T; error: PostgrestError | null };

/** Unwraps a result that must have data; a missing row (hidden by RLS or gone) is NotFoundError. */
function data<T>(result: Result<T>): NonNullable<T> {
  if (result.error) throw toError(result.error);
  if (result.data === null || result.data === undefined) throw new NotFoundError("Row", "id");
  return result.data as NonNullable<T>;
}

/** For writes that return no rows (delete/insert without .select()). */
function check(result: { error: PostgrestError | null }): void {
  if (result.error) throw toError(result.error);
}

/** Unwraps a `.maybeSingle()` lookup where "no row" is a normal answer. */
function maybe<T>(result: Result<T>): T | null {
  if (result.error) throw toError(result.error);
  return result.data ?? null;
}

function authConflict(error: AuthError): Error {
  if (error.code === "user_already_exists" || error.code === "email_exists") {
    return new ConflictError("email", "An account with this email already exists");
  }
  if (error.code === "weak_password") return new ConflictError("password", error.message);
  if (error.code === "over_email_send_rate_limit") {
    return new ConflictError("email", "Too many sign-ups right now — please try again in a few minutes.");
  }
  return new Error(`Supabase auth error ${error.code ?? error.status}: ${error.message}`);
}

// ---------------------------------------------------------------------------
// Repositories
// ---------------------------------------------------------------------------

/**
 * Supabase implementation of the repository contract. `client` returns a
 * client carrying the caller's session, so RLS applies to every query.
 */
export function createSupabaseRepositories(client: () => Promise<Client>): Repositories {
  async function labelIdsFor(db: Client, taskIds: string[]): Promise<Map<string, string[]>> {
    const byTask = new Map(taskIds.map((id) => [id, [] as string[]]));
    if (taskIds.length === 0) return byTask;
    const rows = data(await db.from("task_labels").select("task_id, label_id").in("task_id", taskIds));
    for (const row of rows) byTask.get(row.task_id)?.push(row.label_id);
    return byTask;
  }

  async function withLabels(db: Client, rows: Row<"tasks">[]): Promise<Task[]> {
    const labels = await labelIdsFor(db, rows.map((r) => r.id));
    return rows.map((r) => toTask(r, labels.get(r.id) ?? []));
  }

  async function columnTaskPositions(db: Client, columnId: string, excludeId?: string): Promise<string[]> {
    let query = db.from("tasks").select("id, position").eq("column_id", columnId).order("position");
    if (excludeId) query = query.neq("id", excludeId);
    return data(await query).map((r) => r.position);
  }

  async function boardIdsForTeam(db: Client, teamId: string): Promise<string[]> {
    const workspaces = data(await db.from("workspaces").select("id").eq("team_id", teamId));
    if (workspaces.length === 0) return [];
    const boards = data(
      await db
        .from("boards")
        .select("id")
        .in(
          "workspace_id",
          workspaces.map((w) => w.id),
        ),
    );
    return boards.map((b) => b.id);
  }

  async function getProfile(db: Client, id: string): Promise<User | null> {
    const row = maybe(await db.from("profiles").select("*").eq("id", id).maybeSingle());
    return row ? toUser(row) : null;
  }

  return {
    auth: {
      async signUp({ name, email, password, redirectTo }) {
        const db = await client();
        const { data: result, error } = await db.auth.signUp({
          email,
          password,
          options: { data: { name }, emailRedirectTo: redirectTo },
        });
        if (error) throw authConflict(error);
        const authUser = result.user;
        // With "Confirm email" on, an existing address comes back as a user
        // without identities (Supabase hides that it exists).
        if (!authUser || authUser.identities?.length === 0) {
          throw new ConflictError("email", "An account with this email already exists");
        }
        const user: User = {
          id: authUser.id,
          email: (authUser.email ?? email).toLowerCase(),
          name,
          avatarUrl: null,
          createdAt: iso(authUser.created_at),
        };
        return { user, needsConfirmation: result.session === null };
      },

      async signIn({ email, password }) {
        const db = await client();
        const { data: result, error } = await db.auth.signInWithPassword({ email, password });
        if (error?.code === "email_not_confirmed") {
          throw new ConflictError("email", "Confirm your email first: we sent you a link when you signed up.");
        }
        if (error || !result.user) return null;
        return getProfile(db, result.user.id);
      },

      async signOut() {
        const db = await client();
        // "local": only this browser. The default ("global") would end every
        // device's session, and /sign-out is reachable by a plain link.
        await db.auth.signOut({ scope: "local" });
      },

      async currentUserId() {
        const db = await client();
        const { data: result } = await db.auth.getUser();
        return result.user?.id ?? null;
      },

      async confirmEmail({ code, tokenHash, type }) {
        const db = await client();
        if (code) return !(await db.auth.exchangeCodeForSession(code)).error;
        if (tokenHash) {
          const otpType = (type ?? "email") as EmailOtpType;
          return !(await db.auth.verifyOtp({ token_hash: tokenHash, type: otpType })).error;
        }
        return false;
      },
    },

    users: {
      getById: async (id) => getProfile(await client(), id),
      async getByEmail(email) {
        const db = await client();
        const row = maybe(await db.from("profiles").select("*").eq("email", email.toLowerCase()).maybeSingle());
        return row ? toUser(row) : null;
      },
      async update(id, patch) {
        const db = await client();
        const row = data(
          await db
            .from("profiles")
            .update({ name: patch.name, avatar_url: patch.avatarUrl, theme: patch.theme })
            .eq("id", id)
            .select("*")
            .single(),
        );
        return toUser(row);
      },
    },

    teams: {
      async create({ name, slug, ownerId }) {
        const db = await client();
        const row = data(
          await db.rpc("create_team", { p_name: name, p_slug: slug, p_labels: [...DEFAULT_LABELS], p_actor: ownerId }),
        );
        return toTeam(row);
      },
      async get(id) {
        const db = await client();
        const row = maybe(await db.from("teams").select("*").eq("id", id).maybeSingle());
        return row ? toTeam(row) : null;
      },
      async getBySlug(slug) {
        const db = await client();
        const row = maybe(await db.from("teams").select("*").eq("slug", slug).maybeSingle());
        return row ? toTeam(row) : null;
      },
      async listForUser(userId) {
        const db = await client();
        const memberships = data(await db.from("memberships").select("team_id").eq("user_id", userId));
        if (memberships.length === 0) return [];
        const rows = data(
          await db
            .from("teams")
            .select("*")
            .in(
              "id",
              memberships.map((m) => m.team_id),
            )
            .order("name"),
        );
        return rows.map(toTeam);
      },
      async update(id, patch) {
        const db = await client();
        return toTeam(data(await db.from("teams").update({ name: patch.name }).eq("id", id).select("*").single()));
      },
      async setPlan(id, plan) {
        const db = await client();
        return toTeam(data(await db.rpc("set_team_plan", { p_team: id, p_plan: plan }).single()));
      },
      async usage(id) {
        const db = await client();
        const row = data(await db.rpc("team_usage", { p_team: id }).single());
        return { members: row.members, pendingInvites: row.pending_invites, workspaces: row.workspaces };
      },
      async delete(id) {
        const db = await client();
        check(await db.from("teams").delete().eq("id", id));
      },
    },

    memberships: {
      async list(teamId) {
        const db = await client();
        return data(await db.from("memberships").select("*").eq("team_id", teamId)).map(toMembership);
      },
      async get(teamId, userId) {
        const db = await client();
        const row = maybe(
          await db.from("memberships").select("*").eq("team_id", teamId).eq("user_id", userId).maybeSingle(),
        );
        return row ? toMembership(row) : null;
      },
      async listMembers(teamId) {
        const db = await client();
        const memberships = data(await db.from("memberships").select("*").eq("team_id", teamId));
        if (memberships.length === 0) return [];
        const profiles = data(
          await db
            .from("profiles")
            .select("*")
            .in(
              "id",
              memberships.map((m) => m.user_id),
            ),
        );
        const byId = new Map(profiles.map((p) => [p.id, toUser(p)]));
        return memberships
          .flatMap((m) => {
            const user = byId.get(m.user_id);
            return user ? [{ ...toMembership(m), user }] : [];
          })
          .sort((a, b) => a.user.name.localeCompare(b.user.name));
      },
      async setRole(teamId, userId, role) {
        const db = await client();
        const row = data(
          await db
            .from("memberships")
            .update({ role })
            .eq("team_id", teamId)
            .eq("user_id", userId)
            .select("*")
            .single(),
        );
        return toMembership(row);
      },
      async remove(teamId, userId) {
        const db = await client();
        check(await db.from("memberships").delete().eq("team_id", teamId).eq("user_id", userId));
      },
      async transferOwnership(teamId, fromUserId, toUserId) {
        const db = await client();
        check(await db.rpc("transfer_ownership", { p_team: teamId, p_to: toUserId, p_actor: fromUserId }));
      },
    },

    workspaces: {
      async create({ teamId, name, keyPrefix }) {
        const db = await client();
        const row = data(
          await db.from("workspaces").insert({ team_id: teamId, name, key_prefix: keyPrefix }).select("*").single(),
        );
        return toWorkspace(row);
      },
      async get(id) {
        const db = await client();
        const row = maybe(await db.from("workspaces").select("*").eq("id", id).maybeSingle());
        return row ? toWorkspace(row) : null;
      },
      async listForTeam(teamId) {
        const db = await client();
        return data(await db.from("workspaces").select("*").eq("team_id", teamId).order("created_at")).map(toWorkspace);
      },
      async update(id, patch) {
        const db = await client();
        return toWorkspace(
          data(await db.from("workspaces").update({ name: patch.name }).eq("id", id).select("*").single()),
        );
      },
      async delete(id) {
        const db = await client();
        check(await db.from("workspaces").delete().eq("id", id));
      },
    },

    boards: {
      async create({ workspaceId, name, description }) {
        const db = await client();
        const positions = generateNKeysBetween(null, null, DEFAULT_COLUMNS.length);
        const columns = DEFAULT_COLUMNS.map((columnName, i) => ({ name: columnName, position: positions[i] }));
        const row = data(
          await db.rpc("create_board", {
            p_workspace: workspaceId,
            p_name: name,
            p_description: description,
            p_columns: columns,
          }),
        );
        return toBoard(row);
      },
      async get(id) {
        const db = await client();
        const row = maybe(await db.from("boards").select("*").eq("id", id).maybeSingle());
        return row ? toBoard(row) : null;
      },
      async listForWorkspace(workspaceId) {
        const db = await client();
        return data(await db.from("boards").select("*").eq("workspace_id", workspaceId).order("created_at")).map(
          toBoard,
        );
      },
      async update(id, patch) {
        const db = await client();
        const row = data(
          await db
            .from("boards")
            .update({ name: patch.name, description: patch.description })
            .eq("id", id)
            .select("*")
            .single(),
        );
        return toBoard(row);
      },
      async delete(id) {
        const db = await client();
        check(await db.from("boards").delete().eq("id", id));
      },
      async listColumns(boardId) {
        const db = await client();
        return data(await db.from("columns").select("*").eq("board_id", boardId).order("position")).map(toColumn);
      },
      async getColumn(id) {
        const db = await client();
        const row = maybe(await db.from("columns").select("*").eq("id", id).maybeSingle());
        return row ? toColumn(row) : null;
      },
      async createColumn(boardId, name) {
        const db = await client();
        const positions = data(await db.from("columns").select("position").eq("board_id", boardId).order("position"));
        const position = positionAt(
          positions.map((p) => p.position),
          positions.length,
        );
        return toColumn(
          data(await db.from("columns").insert({ board_id: boardId, name, position }).select("*").single()),
        );
      },
      async renameColumn(id, name) {
        const db = await client();
        return toColumn(data(await db.from("columns").update({ name }).eq("id", id).select("*").single()));
      },
      async moveColumn(id, index) {
        const db = await client();
        const column = data(await db.from("columns").select("*").eq("id", id).single());
        const others = data(
          await db.from("columns").select("position").eq("board_id", column.board_id).neq("id", id).order("position"),
        );
        const position = positionAt(
          others.map((c) => c.position),
          index,
        );
        return toColumn(data(await db.from("columns").update({ position }).eq("id", id).select("*").single()));
      },
      async deleteColumn(id) {
        const db = await client();
        const column = data(await db.from("columns").select("*").eq("id", id).single());
        const { count } = await db
          .from("columns")
          .select("id", { count: "exact", head: true })
          .eq("board_id", column.board_id);
        if ((count ?? 0) <= 1) throw new ConflictError("column", "A board needs at least one column");
        check(await db.from("columns").delete().eq("id", id));
      },
    },

    tasks: {
      async create({ placement = "end", createdBy, ...input }) {
        const db = await client();
        const positions = await columnTaskPositions(db, input.columnId);
        const position = positionAt(positions, placement === "start" ? 0 : positions.length);
        const row = data(
          await db.rpc("create_task", {
            p_board: input.boardId,
            p_column: input.columnId,
            p_title: input.title,
            p_description: input.description,
            p_priority: input.priority,
            p_assignee_user: input.assignee?.kind === "user" ? input.assignee.userId : null,
            p_label_ids: input.labelIds,
            p_due_date: input.dueDate,
            p_parent: input.parentId,
            p_position: position,
            p_actor: createdBy,
          }),
        );
        return toTask(row, input.labelIds);
      },
      async get(id) {
        const db = await client();
        const row = maybe(await db.from("tasks").select("*").eq("id", id).maybeSingle());
        return row ? (await withLabels(db, [row]))[0] : null;
      },
      async getByKey(workspaceId, key) {
        const db = await client();
        const boards = data(await db.from("boards").select("id").eq("workspace_id", workspaceId));
        if (boards.length === 0) return null;
        const row = maybe(
          await db
            .from("tasks")
            .select("*")
            .in(
              "board_id",
              boards.map((b) => b.id),
            )
            .eq("key", key.trim().toUpperCase())
            .maybeSingle(),
        );
        return row ? (await withLabels(db, [row]))[0] : null;
      },
      async listForBoard(boardId) {
        const db = await client();
        return withLabels(db, data(await db.from("tasks").select("*").eq("board_id", boardId).order("position")));
      },
      async listAssignedTo(teamId, userId) {
        const db = await client();
        const boardIds = await boardIdsForTeam(db, teamId);
        if (boardIds.length === 0) return [];
        const rows = data(
          await db
            .from("tasks")
            .select("*")
            .in("board_id", boardIds)
            .eq("assignee_user_id", userId)
            .order("updated_at", { ascending: false }),
        );
        return withLabels(db, rows);
      },
      async update(id, patch: UpdateTaskInput) {
        const db = await client();
        const changes: Database["public"]["Tables"]["tasks"]["Update"] = {};
        if (patch.title !== undefined) changes.title = patch.title;
        if (patch.description !== undefined) changes.description = patch.description;
        if (patch.priority !== undefined) changes.priority = patch.priority;
        if (patch.dueDate !== undefined) changes.due_date = patch.dueDate;
        if (patch.parentId !== undefined) changes.parent_id = patch.parentId;
        if (patch.assignee !== undefined) {
          changes.assignee_user_id = patch.assignee?.kind === "user" ? patch.assignee.userId : null;
          changes.assignee_agent_id = patch.assignee?.kind === "agent" ? patch.assignee.agentId : null;
        }
        // Always write the row (even for label-only edits) so updated_at moves and RLS is checked.
        const row = data(await db.from("tasks").update(changes).eq("id", id).select("*").single());
        if (patch.labelIds !== undefined) {
          check(await db.from("task_labels").delete().eq("task_id", id));
          if (patch.labelIds.length > 0) {
            check(await db.from("task_labels").insert(patch.labelIds.map((labelId) => ({ task_id: id, label_id: labelId }))));
          }
        }
        return (await withLabels(db, [row]))[0];
      },
      async move(id, { columnId, index }) {
        const db = await client();
        const task = data(await db.from("tasks").select("board_id").eq("id", id).single());
        const column = maybe(
          await db.from("columns").select("id").eq("id", columnId).eq("board_id", task.board_id).maybeSingle(),
        );
        if (!column) throw new NotFoundError("Column", columnId);
        const position = positionAt(await columnTaskPositions(db, columnId, id), index);
        const row = data(
          await db.from("tasks").update({ column_id: columnId, position }).eq("id", id).select("*").single(),
        );
        return (await withLabels(db, [row]))[0];
      },
      async delete(id) {
        const db = await client();
        check(await db.from("tasks").delete().eq("id", id));
      },
    },

    labels: {
      async listForTeam(teamId) {
        const db = await client();
        return data(await db.from("labels").select("*").eq("team_id", teamId).order("name")).map(toLabel);
      },
      async get(id) {
        const db = await client();
        const row = maybe(await db.from("labels").select("*").eq("id", id).maybeSingle());
        return row ? toLabel(row) : null;
      },
      async create(teamId, { name, color }) {
        const db = await client();
        return toLabel(data(await db.from("labels").insert({ team_id: teamId, name, color }).select("*").single()));
      },
      async update(id, patch) {
        const db = await client();
        return toLabel(data(await db.from("labels").update(patch).eq("id", id).select("*").single()));
      },
      async delete(id) {
        const db = await client();
        check(await db.from("labels").delete().eq("id", id));
      },
    },

    comments: {
      async listForTask(taskId) {
        const db = await client();
        return data(await db.from("comments").select("*").eq("task_id", taskId).order("created_at")).map(toComment);
      },
      async get(id) {
        const db = await client();
        const row = maybe(await db.from("comments").select("*").eq("id", id).maybeSingle());
        return row ? toComment(row) : null;
      },
      async create({ taskId, body, author }) {
        const db = await client();
        const row = data(
          await db
            .from("comments")
            .insert({
              task_id: taskId,
              body,
              author_user_id: author.kind === "user" ? author.userId : null,
              author_agent_id: author.kind === "agent" ? author.agentId : null,
            })
            .select("*")
            .single(),
        );
        return toComment(row);
      },
      async delete(id) {
        const db = await client();
        check(await db.from("comments").delete().eq("id", id));
      },
    },

    invites: {
      async create({ teamId, emails, invitedBy, role = "member" }) {
        const db = await client();
        const now = new Date();
        const members = data(await db.from("memberships").select("user_id").eq("team_id", teamId));
        const memberEmails = members.length
          ? data(
              await db
                .from("profiles")
                .select("email")
                .in(
                  "id",
                  members.map((m) => m.user_id),
                ),
            ).map((p) => p.email)
          : [];
        const pending = data(
          await db
            .from("invites")
            .select("email")
            .eq("team_id", teamId)
            .is("accepted_at", null)
            .gt("expires_at", now.toISOString()),
        ).map((i) => i.email);
        const taken = new Set([...memberEmails, ...pending]);
        const fresh = [...new Set(emails.map((e) => e.toLowerCase()))].filter((e) => !taken.has(e));
        if (fresh.length === 0) return [];
        const expiresAt = new Date(now.getTime() + INVITE_TTL_DAYS * DAY_MS).toISOString();
        const rows = data(
          await db
            .from("invites")
            .insert(
              fresh.map((email) => ({
                team_id: teamId,
                email,
                role,
                token: randomBytes(24).toString("base64url"),
                invited_by: invitedBy,
                expires_at: expiresAt,
              })),
            )
            .select("*"),
        );
        return rows.map(toInvite);
      },
      async listPending(teamId) {
        const db = await client();
        const rows = data(
          await db
            .from("invites")
            .select("*")
            .eq("team_id", teamId)
            .is("accepted_at", null)
            .gt("expires_at", new Date().toISOString())
            .order("created_at"),
        );
        return rows.map(toInvite);
      },
      async get(id) {
        const db = await client();
        const row = maybe(await db.from("invites").select("*").eq("id", id).maybeSingle());
        return row ? toInvite(row) : null;
      },
      async getByToken(token) {
        const db = await client();
        const row = maybe(await db.from("invites").select("*").eq("token", token).maybeSingle());
        return row ? toInvite(row) : null;
      },
      async preview(token) {
        const db = await client();
        const [row] = data(await db.rpc("invite_preview", { p_token: token }));
        if (!row) return null;
        return {
          invite: toInvite(row.invite as unknown as Row<"invites">),
          teamName: row.team_name,
          teamSlug: row.team_slug,
          inviterName: row.inviter_name,
        };
      },
      async resend(id) {
        const db = await client();
        const invite = data(await db.from("invites").select("*").eq("id", id).single());
        if (invite.accepted_at) throw new ConflictError("token", "This invite was already accepted");
        const row = data(
          await db
            .from("invites")
            .update({
              token: randomBytes(24).toString("base64url"),
              expires_at: new Date(Date.now() + INVITE_TTL_DAYS * DAY_MS).toISOString(),
            })
            .eq("id", id)
            .select("*")
            .single(),
        );
        return toInvite(row);
      },
      async revoke(id) {
        const db = await client();
        check(await db.from("invites").delete().eq("id", id));
      },
      async accept(token, userId) {
        const db = await client();
        return toMembership(data(await db.rpc("accept_invite", { p_token: token, p_actor: userId })));
      },
    },
  };
}
