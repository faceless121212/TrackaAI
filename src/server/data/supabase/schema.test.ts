// @vitest-environment node
import type { PGlite, Transaction } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";
import { AI_RATE_LIMIT, PLAN_CATALOG, PLANS } from "@/lib/domain";
import { asUser, createTestDb, createUser } from "./pglite-harness";

type Db = PGlite | Transaction;

const LABELS = JSON.stringify([
  { name: "Bug", color: "red" },
  { name: "Feature", color: "purple" },
]);
const COLUMNS = JSON.stringify([
  { name: "Todo", position: "a0" },
  { name: "Done", position: "a1" },
]);

async function one<T>(db: Db, sql: string, params: unknown[] = []): Promise<T> {
  const result = await db.query<T>(sql, params);
  return result.rows[0];
}

async function count(db: Db, table: string): Promise<number> {
  return (await one<{ n: number }>(db, `select count(*)::int as n from ${table}`)).n;
}

/**
 * A user with their own team, workspace, board (2 columns), label and one task.
 * On Pro unless `plan` says otherwise, so limits only matter where tested.
 */
async function makeTeam(db: PGlite, slug: string, plan = "pro") {
  const owner = await createUser(db, `${slug}-owner@example.test`, `${slug} owner`);
  const created = await asUser(db, owner, async (tx) => {
    const team = await one<{ id: string }>(tx, "select * from create_team($1, $2, $3)", [slug, slug, LABELS]);
    const workspace = await one<{ id: string }>(
      tx,
      "insert into workspaces (team_id, name, key_prefix) values ($1, 'Eng', 'ENG') returning id",
      [team.id],
    );
    const board = await one<{ id: string }>(tx, "select * from create_board($1, 'Eng', null, $2)", [
      workspace.id,
      COLUMNS,
    ]);
    const column = await one<{ id: string }>(tx, "select id from columns where board_id = $1 order by position", [
      board.id,
    ]);
    const label = await one<{ id: string }>(tx, "select id from labels where team_id = $1 and name = 'Bug'", [team.id]);
    const task = await one<{ id: string; key: string }>(
      tx,
      "select * from create_task($1, $2, 'First', '', 'none', null, $3, null, null, 'a0')",
      [board.id, column.id, [label.id]],
    );
    return { owner, team: team.id, workspace: workspace.id, board: board.id, column: column.id, label: label.id, task };
  });
  await db.query("update teams set plan = $1 where id = $2", [plan, created.team]);
  return created;
}

async function invite(db: PGlite, team: Awaited<ReturnType<typeof makeTeam>>, email: string, role = "member") {
  const token = `token-${email}-${Math.random().toString(36).slice(2)}`;
  await asUser(db, team.owner, (tx) =>
    tx.query(
      "insert into invites (team_id, email, role, token, invited_by, expires_at) values ($1, $2, $3, $4, $5, now() + interval '7 days')",
      [team.team, email, role, token, team.owner],
    ),
  );
  return token;
}

describe("schema functions", () => {
  let db: PGlite;
  beforeAll(async () => {
    db = await createTestDb();
  });

  it("creates a profile for every auth user", async () => {
    const id = await createUser(db, "Ada@Example.test", "Ada");
    expect(await one(db, "select email, name from profiles where id = $1", [id])).toEqual({
      email: "ada@example.test",
      name: "Ada",
    });
  });

  it("create_team makes the caller the only owner and seeds labels", async () => {
    const acme = await makeTeam(db, "acme");
    expect(await one(db, "select role from memberships where team_id = $1", [acme.team])).toEqual({ role: "owner" });
    expect(await count(db, `labels where team_id = '${acme.team}'`)).toBe(2);
  });

  it("create_task numbers tasks per workspace and stores labels", async () => {
    const t = await makeTeam(db, "numbers");
    expect(t.task.key).toBe("ENG-1");
    const second = await asUser(db, t.owner, (tx) =>
      one<{ key: string; number: number }>(
        tx,
        "select * from create_task($1, $2, 'Second', '', 'high', null, '{}', null, null, 'a1')",
        [t.board, t.column],
      ),
    );
    expect(second).toMatchObject({ key: "ENG-2", number: 2 });
    expect(await count(db, `task_labels where task_id = '${t.task.id}'`)).toBe(1);
  });

  it("create_task refuses labels from another team and columns from another board", async () => {
    const a = await makeTeam(db, "refuse-a");
    const b = await makeTeam(db, "refuse-b");
    await expect(
      asUser(db, a.owner, (tx) =>
        tx.query("select * from create_task($1, $2, 'X', '', 'none', null, $3, null, null, 'a2')", [
          a.board,
          a.column,
          [b.label],
        ]),
      ),
    ).rejects.toThrow(/label_not_in_team/);
    await expect(
      asUser(db, a.owner, (tx) =>
        tx.query("select * from create_task($1, $2, 'X', '', 'none', null, '{}', null, null, 'a2')", [a.board, b.column]),
      ),
    ).rejects.toThrow(/column_not_found/);
  });

  it("positions sort by code unit", async () => {
    const t = await makeTeam(db, "collation");
    await asUser(db, t.owner, async (tx) => {
      for (const [title, position] of [["upper", "Zz"], ["lower", "a"], ["digit", "a0"]]) {
        await tx.query("select * from create_task($1, $2, $3, '', 'none', null, '{}', null, null, $4)", [
          t.board,
          t.column,
          title,
          position,
        ]);
      }
    });
    const titles = await db.query<{ title: string }>(
      "select title from tasks where board_id = $1 and title in ('upper', 'lower', 'digit') order by position",
      [t.board],
    );
    expect(titles.rows.map((r) => r.title)).toEqual(["upper", "lower", "digit"]);
  });

  it("accept_invite checks email, expiry and reuse", async () => {
    const t = await makeTeam(db, "invites");
    const token = await invite(db, t, "joiner@example.test", "admin");
    const stranger = await createUser(db, "stranger@example.test");
    await expect(asUser(db, stranger, (tx) => tx.query("select * from accept_invite($1)", [token]))).rejects.toThrow(
      /invite_email_mismatch/,
    );

    const joiner = await createUser(db, "joiner@example.test");
    const membership = await asUser(db, joiner, (tx) => one(tx, "select * from accept_invite($1)", [token]));
    expect(membership).toMatchObject({ team_id: t.team, user_id: joiner, role: "admin" });
    await expect(asUser(db, joiner, (tx) => tx.query("select * from accept_invite($1)", [token]))).rejects.toThrow(
      /invite_used/,
    );

    const late = await invite(db, t, "late@example.test");
    await db.query("update invites set expires_at = now() - interval '1 day' where token = $1", [late]);
    const lateUser = await createUser(db, "late@example.test");
    await expect(asUser(db, lateUser, (tx) => tx.query("select * from accept_invite($1)", [late]))).rejects.toThrow(
      /invite_expired/,
    );
  });

  it("invite_preview shows team and inviter to a signed-in invitee who isn't a member yet", async () => {
    const t = await makeTeam(db, "preview");
    const token = await invite(db, t, "curious@example.test");
    const curious = await createUser(db, "curious@example.test");
    const preview = await asUser(db, curious, (tx) =>
      one<{ team_name: string; inviter_name: string }>(tx, "select * from invite_preview($1)", [token]),
    );
    expect(preview).toMatchObject({ team_name: "preview", inviter_name: "preview owner" });
  });

  it("transfer_ownership keeps exactly one owner", async () => {
    const t = await makeTeam(db, "transfer");
    const token = await invite(db, t, "heir@example.test");
    const heir = await createUser(db, "heir@example.test");
    await asUser(db, heir, (tx) => tx.query("select * from accept_invite($1)", [token]));

    await expect(
      asUser(db, heir, (tx) => tx.query("select transfer_ownership($1, $2)", [t.team, heir])),
    ).rejects.toThrow(/not_owner/);
    await asUser(db, t.owner, (tx) => tx.query("select transfer_ownership($1, $2)", [t.team, heir]));
    const roles = await db.query<{ user_id: string; role: string }>(
      "select user_id, role from memberships where team_id = $1",
      [t.team],
    );
    expect(Object.fromEntries(roles.rows.map((r) => [r.user_id, r.role]))).toEqual({
      [t.owner]: "admin",
      [heir]: "owner",
    });
    await expect(
      db.query("update memberships set role = 'owner' where team_id = $1 and user_id = $2", [t.team, t.owner]),
    ).rejects.toThrow(/memberships_one_owner/);
  });

  it("a user can only act as themselves", async () => {
    const t = await makeTeam(db, "impostor");
    const other = await createUser(db, "other@example.test");
    await expect(
      asUser(db, t.owner, (tx) => tx.query("select * from create_team('X', 'x-team', '[]', $1)", [other])),
    ).rejects.toThrow(/forbidden/);
  });

  it("deleting a team cascades to everything in it", async () => {
    const t = await makeTeam(db, "doomed");
    await asUser(db, t.owner, (tx) => tx.query("delete from teams where id = $1", [t.team]));
    for (const [table, column, id] of [
      ["workspaces", "team_id", t.team],
      ["boards", "id", t.board],
      ["columns", "board_id", t.board],
      ["tasks", "board_id", t.board],
      ["labels", "team_id", t.team],
      ["memberships", "team_id", t.team],
    ]) {
      expect(await count(db, `${table} where ${column} = '${id}'`)).toBe(0);
    }
  });

  it("a column with tasks can't be deleted, but its board can", async () => {
    const t = await makeTeam(db, "columns");
    await expect(
      asUser(db, t.owner, (tx) => tx.query("delete from columns where id = $1", [t.column])),
    ).rejects.toThrow(/foreign key/);
    await asUser(db, t.owner, (tx) => tx.query("delete from boards where id = $1", [t.board]));
    expect(await count(db, `tasks where board_id = '${t.board}'`)).toBe(0);
  });
});

describe("row-level security: cross-team isolation", () => {
  let db: PGlite;
  let a: Awaited<ReturnType<typeof makeTeam>>;
  let b: Awaited<ReturnType<typeof makeTeam>>;

  beforeAll(async () => {
    db = await createTestDb();
    a = await makeTeam(db, "alpha");
    b = await makeTeam(db, "beta");
    await invite(db, a, "pending@example.test");
    await asUser(db, a.owner, (tx) =>
      tx.query("insert into comments (task_id, author_user_id, body) values ($1, $2, 'secret')", [a.task.id, a.owner]),
    );
  });

  it.each([
    ["teams", "id"],
    ["memberships", "team_id"],
    ["workspaces", "team_id"],
    ["labels", "team_id"],
    ["invites", "team_id"],
  ])("hides team A's %s from team B", async (table, column) => {
    const rows = await asUser(db, b.owner, (tx) => count(tx, `${table} where ${column} = '${a.team}'`));
    expect(rows).toBe(0);
  });

  it("hides team A's boards, columns, tasks, task labels, comments and owner profile", async () => {
    await asUser(db, b.owner, async (tx) => {
      expect(await count(tx, `boards where id = '${a.board}'`)).toBe(0);
      expect(await count(tx, `columns where board_id = '${a.board}'`)).toBe(0);
      expect(await count(tx, `tasks where board_id = '${a.board}'`)).toBe(0);
      expect(await count(tx, `task_labels where task_id = '${a.task.id}'`)).toBe(0);
      expect(await count(tx, `comments where task_id = '${a.task.id}'`)).toBe(0);
      expect(await count(tx, `profiles where id = '${a.owner}'`)).toBe(0);
    });
  });

  it("silently changes nothing when team B updates or deletes team A's rows", async () => {
    await asUser(db, b.owner, async (tx) => {
      await tx.query("update tasks set title = 'hacked' where id = $1", [a.task.id]);
      await tx.query("update teams set name = 'hacked' where id = $1", [a.team]);
      await tx.query("delete from boards where id = $1", [a.board]);
      await tx.query("delete from memberships where team_id = $1", [a.team]);
    });
    expect(await one(db, "select title from tasks where id = $1", [a.task.id])).toEqual({ title: "First" });
    expect(await one(db, "select name from teams where id = $1", [a.team])).toEqual({ name: "alpha" });
    expect(await count(db, `boards where id = '${a.board}'`)).toBe(1);
    expect(await count(db, `memberships where team_id = '${a.team}'`)).toBe(1);
  });

  it("rejects team B's inserts into team A", async () => {
    const attempts = [
      ["insert into workspaces (team_id, name, key_prefix) values ($1, 'X', 'XX')", [a.team]],
      ["insert into labels (team_id, name, color) values ($1, 'X', 'red')", [a.team]],
      ["insert into columns (board_id, name, position) values ($1, 'X', 'b0')", [a.board]],
      ["insert into comments (task_id, author_user_id, body) values ($1, $2, 'x')", [a.task.id, b.owner]],
      ["insert into task_labels (task_id, label_id) values ($1, $2)", [a.task.id, b.label]],
      [
        "insert into invites (team_id, email, role, token, invited_by, expires_at) values ($1, 'x@example.test', 'member', 'xxxxxxxxxxxxxxxxxxxx', $2, now())",
        [a.team, b.owner],
      ],
    ] as const;
    for (const [sql, params] of attempts) {
      await expect(asUser(db, b.owner, (tx) => tx.query(sql, [...params]))).rejects.toThrow(/row-level security/);
    }
    await expect(
      asUser(db, b.owner, (tx) =>
        tx.query("select * from create_task($1, $2, 'X', '', 'none', null, '{}', null, null, 'b0')", [a.board, a.column]),
      ),
    ).rejects.toThrow(/forbidden/);
  });

  it("doesn't let team B move its task onto team A's board", async () => {
    const bTask = b.task.id;
    await expect(
      asUser(db, b.owner, (tx) =>
        tx.query("update tasks set board_id = $1, column_id = $2 where id = $3", [a.board, a.column, bTask]),
      ),
    ).rejects.toThrow(/permission denied/);
  });

  it("shows anonymous visitors nothing", async () => {
    // One transaction per table: a failed statement would abort the rest.
    for (const table of ["teams", "tasks", "profiles", "invites"]) {
      const rows = await db
        .transaction(async (tx) => {
          await tx.exec("set local role anon");
          return (await tx.query(`select * from ${table}`)).rows.length;
        })
        .catch(() => 0);
      expect(rows).toBe(0);
    }
  });
});

describe("row-level security: roles inside a team", () => {
  let db: PGlite;
  let t: Awaited<ReturnType<typeof makeTeam>>;
  let member: string;
  let admin: string;

  beforeAll(async () => {
    db = await createTestDb();
    t = await makeTeam(db, "roles");
    member = await createUser(db, "member@example.test");
    admin = await createUser(db, "admin@example.test");
    const memberToken = await invite(db, t, "member@example.test");
    const adminToken = await invite(db, t, "admin@example.test", "admin");
    await asUser(db, member, (tx) => tx.query("select * from accept_invite($1)", [memberToken]));
    await asUser(db, admin, (tx) => tx.query("select * from accept_invite($1)", [adminToken]));
  });

  it("lets members read the team and work on tasks and comments", async () => {
    await asUser(db, member, async (tx) => {
      expect(await count(tx, `tasks where board_id = '${t.board}'`)).toBe(1);
      await tx.query("update tasks set priority = 'high' where id = $1", [t.task.id]);
      await tx.query("insert into comments (task_id, author_user_id, body) values ($1, $2, 'hi')", [t.task.id, member]);
      await tx.query("select * from create_task($1, $2, 'By member', '', 'none', null, '{}', null, null, 'a5')", [
        t.board,
        t.column,
      ]);
    });
    expect(await one(db, "select priority from tasks where id = $1", [t.task.id])).toEqual({ priority: "high" });
  });

  it("doesn't let members manage structure, labels or invites", async () => {
    const attempts = [
      ["insert into workspaces (team_id, name, key_prefix) values ($1, 'X', 'XX')", [t.team]],
      ["insert into labels (team_id, name, color) values ($1, 'X', 'red')", [t.team]],
      ["insert into columns (board_id, name, position) values ($1, 'X', 'b0')", [t.board]],
    ] as const;
    for (const [sql, params] of attempts) {
      await expect(asUser(db, member, (tx) => tx.query(sql, [...params]))).rejects.toThrow(/row-level security/);
    }
    expect(await asUser(db, member, (tx) => count(tx, `invites where team_id = '${t.team}'`))).toBe(0);
    await asUser(db, member, (tx) => tx.query("update teams set name = 'renamed' where id = $1", [t.team]));
    expect(await one(db, "select name from teams where id = $1", [t.team])).toEqual({ name: "roles" });
  });

  it("doesn't let anyone comment as someone else", async () => {
    await expect(
      asUser(db, member, (tx) =>
        tx.query("insert into comments (task_id, author_user_id, body) values ($1, $2, 'forged')", [t.task.id, t.owner]),
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it("lets admins manage structure but never touch the owner row", async () => {
    await asUser(db, admin, async (tx) => {
      await tx.query("insert into labels (team_id, name, color) values ($1, 'Ops', 'green')", [t.team]);
      await tx.query("update memberships set role = 'owner' where team_id = $1 and user_id = $2", [t.team, t.owner]);
      await tx.query("delete from memberships where team_id = $1 and user_id = $2", [t.team, t.owner]);
    });
    expect(await one(db, "select role from memberships where team_id = $1 and user_id = $2", [t.team, t.owner])).toEqual({
      role: "owner",
    });
    await expect(
      asUser(db, admin, (tx) =>
        tx.query("update memberships set role = 'owner' where team_id = $1 and user_id = $2", [t.team, member]),
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it("lets members leave, but not the owner", async () => {
    await asUser(db, t.owner, (tx) =>
      tx.query("delete from memberships where team_id = $1 and user_id = $2", [t.team, t.owner]),
    );
    expect(await count(db, `memberships where team_id = '${t.team}' and user_id = '${t.owner}'`)).toBe(1);
    await asUser(db, member, (tx) =>
      tx.query("delete from memberships where team_id = $1 and user_id = $2", [t.team, member]),
    );
    expect(await count(db, `memberships where team_id = '${t.team}' and user_id = '${member}'`)).toBe(0);
  });
});

describe("row-level security: write boundaries", () => {
  let db: PGlite;
  let a: Awaited<ReturnType<typeof makeTeam>>;
  let b: Awaited<ReturnType<typeof makeTeam>>;
  let adminA: string;
  let adminB: string;
  let memberB: string;

  beforeAll(async () => {
    db = await createTestDb();
    a = await makeTeam(db, "gamma");
    b = await makeTeam(db, "delta");
    adminA = await createUser(db, "admin-a@example.test");
    adminB = await createUser(db, "admin-b@example.test");
    memberB = await createUser(db, "member-b@example.test");
    for (const [team, user, email, role] of [
      [a, adminA, "admin-a@example.test", "admin"],
      [b, adminB, "admin-b@example.test", "admin"],
      [b, memberB, "member-b@example.test", "member"],
    ] as const) {
      const token = await invite(db, team, email, role);
      await asUser(db, user, (tx) => tx.query("select * from accept_invite($1)", [token]));
    }
  });

  it("doesn't let a manager move memberships into another team", async () => {
    // Unfiltered: RLS would only check the new row against the update policy.
    await expect(
      asUser(db, a.owner, (tx) => tx.query("update memberships set team_id = $1", [b.team])),
    ).rejects.toThrow(/permission denied/);
    await expect(
      asUser(db, a.owner, (tx) => tx.query("update memberships set user_id = $1 where user_id = $2", [a.owner, adminA])),
    ).rejects.toThrow(/permission denied/);
    expect(await count(db, `memberships where team_id = '${b.team}' and user_id = '${adminA}'`)).toBe(0);
  });

  it("lets admins manage members but not other admins", async () => {
    const other = await createUser(db, "admin-b2@example.test");
    const token = await invite(db, b, "admin-b2@example.test", "admin");
    await asUser(db, other, (tx) => tx.query("select * from accept_invite($1)", [token]));

    await asUser(db, adminB, async (tx) => {
      await tx.query("update memberships set role = 'member' where team_id = $1 and user_id = $2", [b.team, other]);
      await tx.query("delete from memberships where team_id = $1 and user_id = $2", [b.team, other]);
    });
    expect(await one(db, "select role from memberships where team_id = $1 and user_id = $2", [b.team, other])).toEqual({
      role: "admin",
    });

    await asUser(db, adminB, (tx) =>
      tx.query("update memberships set role = 'admin' where team_id = $1 and user_id = $2", [b.team, memberB]),
    );
    expect(await one(db, "select role from memberships where team_id = $1 and user_id = $2", [b.team, memberB])).toEqual({
      role: "admin",
    });
    await asUser(db, b.owner, async (tx) => {
      await tx.query("update memberships set role = 'member' where team_id = $1 and user_id = $2", [b.team, memberB]);
      await tx.query("delete from memberships where team_id = $1 and user_id = $2", [b.team, other]);
    });
    expect(await count(db, `memberships where team_id = '${b.team}' and user_id = '${other}'`)).toBe(0);
  });

  it("lets users edit their profile but not its email", async () => {
    await asUser(db, memberB, (tx) => tx.query("update profiles set name = 'Renamed' where id = $1", [memberB]));
    expect(await one(db, "select name from profiles where id = $1", [memberB])).toEqual({ name: "Renamed" });
    await expect(
      asUser(db, memberB, (tx) => tx.query("update profiles set email = 'admin-a@example.test' where id = $1", [memberB])),
    ).rejects.toThrow(/permission denied/);
  });

  it("checks the invitee's sign-in email, not their profile", async () => {
    const token = await invite(db, a, "not-yet@example.test");
    await db.query("update profiles set email = 'not-yet@example.test' where id = $1", [memberB]);
    await expect(
      asUser(db, memberB, (tx) => tx.query("select * from accept_invite($1)", [token])),
    ).rejects.toThrow(/invite_email_mismatch/);
    await db.query("update profiles set email = 'member-b@example.test' where id = $1", [memberB]);
  });

  it("lets managers rename the team but not change its plan", async () => {
    await asUser(db, b.owner, (tx) => tx.query("update teams set name = 'Delta' where id = $1", [b.team]));
    await expect(
      asUser(db, b.owner, (tx) => tx.query("update teams set plan = 'free' where id = $1", [b.team])),
    ).rejects.toThrow(/permission denied/);
    expect(await one(db, "select name, plan from teams where id = $1", [b.team])).toEqual({ name: "Delta", plan: "pro" });
  });

  it("keeps task numbers, keys and authors fixed", async () => {
    for (const set of ["key = 'HACK-1'", "number = 99", `created_by = '${memberB}'`, `board_id = '${b.board}'`]) {
      await expect(
        asUser(db, memberB, (tx) => tx.query(`update tasks set ${set} where id = $1`, [b.task.id])),
      ).rejects.toThrow(/permission denied/);
    }
  });

  it("keeps a task's column, parent and assignee inside its board and team", async () => {
    const attempts = [
      ["update tasks set column_id = $1 where id = $2", [a.column, b.task.id], /column_not_found/],
      ["update tasks set parent_id = $1 where id = $2", [a.task.id, b.task.id], /parent_not_found/],
      ["update tasks set assignee_user_id = $1 where id = $2", [a.owner, b.task.id], /assignee_not_member/],
      [
        "select * from create_task($1, $2, 'X', '', 'none', null, '{}', null, $3, 'b0')",
        [b.board, b.column, a.task.id],
        /parent_not_found/,
      ],
      [
        "select * from create_task($1, $2, 'X', '', 'none', $3, '{}', null, null, 'b0')",
        [b.board, b.column, a.owner],
        /assignee_not_member/,
      ],
    ] as const;
    for (const [sql, params, error] of attempts) {
      await expect(asUser(db, memberB, (tx) => tx.query(sql, [...params]))).rejects.toThrow(error);
    }
    // Still fine: assigning a teammate, and editing a task whose assignee has since left.
    await asUser(db, memberB, (tx) =>
      tx.query("update tasks set assignee_user_id = $1 where id = $2", [adminB, b.task.id]),
    );
    await db.query("delete from memberships where team_id = $1 and user_id = $2", [b.team, adminB]);
    await asUser(db, memberB, (tx) => tx.query("update tasks set title = 'Still editable' where id = $1", [b.task.id]));
    expect(await one(db, "select title from tasks where id = $1", [b.task.id])).toEqual({ title: "Still editable" });
  });
});

describe("plans and limits", () => {
  let db: PGlite;
  beforeAll(async () => {
    db = await createTestDb();
  });

  const setPlan = (team: Awaited<ReturnType<typeof makeTeam>>, plan: string) =>
    asUser(db, team.owner, (tx) => tx.query("select * from set_team_plan($1, $2)", [team.team, plan]));
  const addWorkspace = (team: Awaited<ReturnType<typeof makeTeam>>, prefix: string) =>
    asUser(db, team.owner, (tx) =>
      tx.query("insert into workspaces (team_id, name, key_prefix) values ($1, $2, $2)", [team.team, prefix]),
    );

  it("matches the plan catalog in src/lib/domain/plans.ts", async () => {
    for (const plan of PLANS) {
      for (const [resource, limit] of Object.entries(PLAN_CATALOG[plan].limits)) {
        const row = await one<{ limit: number | null }>(db, "select private.plan_limit($1, $2) as limit", [plan, resource]);
        expect({ plan, resource, limit: row.limit }).toEqual({ plan, resource, limit });
      }
    }
  });

  it("starts teams on Free and lets only the owner change the plan", async () => {
    const t = await makeTeam(db, "planned", "free");
    expect(await one(db, "select plan from teams where id = $1", [t.team])).toEqual({ plan: "free" });
    const admin = await createUser(db, "planned-admin@example.test");
    await setPlan(t, "lite");
    const token = await invite(db, t, "planned-admin@example.test", "admin");
    await asUser(db, admin, (tx) => tx.query("select * from accept_invite($1)", [token]));
    await expect(
      asUser(db, admin, (tx) => tx.query("select * from set_team_plan($1, 'pro')", [t.team])),
    ).rejects.toThrow(/not_owner/);
    await expect(setPlan(t, "enterprise")).rejects.toThrow(/check constraint/);
    expect(await one(db, "select plan from teams where id = $1", [t.team])).toEqual({ plan: "lite" });
  });

  it("keeps a Free team to one project and one person", async () => {
    const t = await makeTeam(db, "solo", "free");
    await expect(addWorkspace(t, "OPS")).rejects.toThrow(/plan_limit_reached/);
    await expect(invite(db, t, "friend@example.test")).rejects.toThrow(/plan_limit_reached/);
  });

  it("lets a Lite team hold three people, counting live invites", async () => {
    const t = await makeTeam(db, "trio", "free");
    await setPlan(t, "lite");
    const mate = await createUser(db, "trio-mate@example.test");
    const token = await invite(db, t, "trio-mate@example.test");
    await invite(db, t, "trio-pending@example.test");
    await asUser(db, mate, (tx) => tx.query("select * from accept_invite($1)", [token]));
    await expect(invite(db, t, "trio-fourth@example.test")).rejects.toThrow(/plan_limit_reached/);

    // An expired invite frees its seat.
    await db.query("update invites set expires_at = now() - interval '1 day' where email = 'trio-pending@example.test'");
    await invite(db, t, "trio-fourth@example.test");
    for (const prefix of ["AA", "AB", "AC", "AD", "AE", "AF", "AG", "AH", "AI"]) await addWorkspace(t, prefix);
    await expect(addWorkspace(t, "AJ")).rejects.toThrow(/plan_limit_reached/);
  });

  it("keeps data after a downgrade but blocks new invites, joins and projects", async () => {
    const t = await makeTeam(db, "shrunk", "free");
    await setPlan(t, "pro");
    const late = await createUser(db, "shrunk-late@example.test");
    const token = await invite(db, t, "shrunk-late@example.test");
    await addWorkspace(t, "OPS");
    await setPlan(t, "free");
    expect(await count(db, `workspaces where team_id = '${t.team}'`)).toBe(2);
    await expect(
      asUser(db, late, (tx) => tx.query("select * from accept_invite($1)", [token])),
    ).rejects.toThrow(/plan_limit_reached/);
    await expect(addWorkspace(t, "MKT")).rejects.toThrow(/plan_limit_reached/);
  });

  it("counts every invite in a batch, and re-checks an expired invite that is resent", async () => {
    const t = await makeTeam(db, "batched", "free");
    await setPlan(t, "lite");
    await invite(db, t, "batched-a@example.test");
    await expect(
      asUser(db, t.owner, (tx) =>
        tx.query(
          `insert into invites (team_id, email, role, token, invited_by, expires_at) values
             ($1, 'batched-b@example.test', 'member', 'batched-token-b-xxxxxxxx', $2, now() + interval '7 days'),
             ($1, 'batched-c@example.test', 'member', 'batched-token-c-xxxxxxxx', $2, now() + interval '7 days')`,
          [t.team, t.owner],
        ),
      ),
    ).rejects.toThrow(/plan_limit_reached/);

    // a expires, and b and c fill the team (owner + 2); resending a would make four.
    await db.query("update invites set expires_at = now() - interval '1 day' where email = 'batched-a@example.test'");
    await invite(db, t, "batched-b@example.test");
    await invite(db, t, "batched-c@example.test");
    await expect(
      asUser(db, t.owner, (tx) =>
        tx.query("update invites set expires_at = now() + interval '7 days' where email = 'batched-a@example.test'"),
      ),
    ).rejects.toThrow(/plan_limit_reached/);
    // A live invite can still get a fresh link.
    await asUser(db, t.owner, (tx) =>
      tx.query("update invites set token = 'batched-new-token-xxxxxxx', expires_at = now() + interval '7 days' where email = 'batched-b@example.test'"),
    );
  });

  it("doesn't let managers move invites to another team or edit their email or role", async () => {
    const t = await makeTeam(db, "moved", "free");
    const other = await asUser(db, t.owner, (tx) =>
      one<{ id: string }>(tx, "select id from create_team('Moved 2', 'moved-two', '[]')"),
    );
    await setPlan(t, "pro");
    await invite(db, t, "moved-a@example.test");
    for (const set of [`team_id = '${other.id}'`, "email = 'someone@example.test'", "role = 'admin'"]) {
      await expect(
        asUser(db, t.owner, (tx) => tx.query(`update invites set ${set} where team_id = $1`, [t.team])),
      ).rejects.toThrow(/permission denied/);
    }
  });

  it("shows usage to members and invitees only", async () => {
    const t = await makeTeam(db, "counted", "free");
    await setPlan(t, "lite");
    const invitee = await createUser(db, "counted-invitee@example.test");
    const stranger = await createUser(db, "counted-stranger@example.test");
    await invite(db, t, "counted-invitee@example.test");
    const expected = { members: 1, pending_invites: 1, workspaces: 1 };
    expect(await asUser(db, t.owner, (tx) => one(tx, "select * from team_usage($1)", [t.team]))).toEqual(expected);
    expect(await asUser(db, invitee, (tx) => one(tx, "select * from team_usage($1)", [t.team]))).toEqual(expected);
    await expect(
      asUser(db, stranger, (tx) => tx.query("select * from team_usage($1)", [t.team])),
    ).rejects.toThrow(/forbidden/);
  });
});

describe("AI usage", () => {
  let db: PGlite;
  let a: Awaited<ReturnType<typeof makeTeam>>;
  let b: Awaited<ReturnType<typeof makeTeam>>;
  beforeAll(async () => {
    db = await createTestDb();
    a = await makeTeam(db, "ai-alpha", "free");
    b = await makeTeam(db, "ai-beta");
  });

  const startRun = (actor: string, teamId: string) =>
    asUser(db, actor, (tx) =>
      one<{ id: string }>(tx, "select start_ai_run($1, 'task_writer', 'm') as id", [teamId]),
    );

  it("reserves runs up to the plan's monthly limit, then refuses", async () => {
    for (let i = 0; i < 10; i++) await startRun(a.owner, a.team);
    await expect(startRun(a.owner, a.team)).rejects.toThrow(/plan_limit_reached/);
    // Last month's runs don't count.
    await db.query("update ai_usage set created_at = now() - interval '40 days' where team_id = $1", [a.team]);
    await startRun(a.owner, a.team);
  });

  it("limits each user to AI_RATE_LIMIT interactive runs a minute, even on Pro", async () => {
    const c = await makeTeam(db, "ai-gamma");
    for (let i = 0; i < AI_RATE_LIMIT.runs; i++) await startRun(c.owner, c.team);
    await expect(startRun(c.owner, c.team)).rejects.toThrow(/rate_limited/);
    // AI teammate runs have their own caps and still go through.
    await asUser(db, c.owner, (tx) => tx.query("select start_ai_run($1, 'agent', 'm')", [c.team]));
    // Other people aren't slowed down by one busy user.
    const d = await makeTeam(db, "ai-delta");
    await startRun(d.owner, d.team);
    await db.query("update ai_usage set created_at = now() - interval '61 seconds' where team_id = $1", [c.team]);
    await startRun(c.owner, c.team);
  });

  it("records tokens once, for the caller's own run", async () => {
    const run = await startRun(b.owner, b.team);
    await asUser(db, b.owner, (tx) => tx.query("select finish_ai_run($1, 120, 45)", [run.id]));
    await asUser(db, b.owner, (tx) => tx.query("select finish_ai_run($1, 1, 1)", [run.id]));
    expect(await one(db, "select input_tokens, output_tokens from ai_usage where id = $1", [run.id])).toEqual({
      input_tokens: 120,
      output_tokens: 45,
    });
    await asUser(db, a.owner, (tx) => tx.query("select finish_ai_run($1, 999, 999)", [run.id]));
    expect(await one(db, "select input_tokens from ai_usage where id = $1", [run.id])).toEqual({ input_tokens: 120 });
  });

  it("accepts copilot and Ask AI runs and rejects unknown features", async () => {
    await asUser(db, b.owner, (tx) => tx.query("select start_ai_run($1, 'copilot', 'm')", [b.team]));
    await asUser(db, b.owner, (tx) => tx.query("select start_ai_run($1, 'ask', 'm')", [b.team]));
    await expect(
      asUser(db, b.owner, (tx) => tx.query("select start_ai_run($1, 'poetry', 'm')", [b.team])),
    ).rejects.toThrow(/check constraint/);
  });

  it("only lets members start runs, and reads stay inside the team", async () => {
    await expect(startRun(a.owner, b.team)).rejects.toThrow(/forbidden/);
    expect(await asUser(db, a.owner, (tx) => count(tx, `ai_usage where team_id = '${b.team}'`))).toBe(0);
    expect(await asUser(db, b.owner, (tx) => count(tx, `ai_usage where team_id = '${b.team}'`))).toBe(3);
  });

  it("never lets anyone write, edit or erase usage directly", async () => {
    await expect(
      asUser(db, b.owner, (tx) =>
        tx.query(
          "insert into ai_usage (team_id, user_id, feature, model) values ($1, $2, 'task_writer', 'm')",
          [b.team, b.owner],
        ),
      ),
    ).rejects.toThrow(/permission denied/);
    for (const sql of ["delete from ai_usage", "update ai_usage set input_tokens = 0"]) {
      await expect(asUser(db, b.owner, (tx) => tx.query(sql))).rejects.toThrow(/permission denied/);
    }
  });
});

describe("AI teammates", () => {
  let db: PGlite;
  let t: Awaited<ReturnType<typeof makeTeam>>;
  let other: Awaited<ReturnType<typeof makeTeam>>;
  let member: string;
  let agent: string;
  let otherAgent: string;
  const WORKER = "worker-token-for-tests-0123456789abcdef";

  beforeAll(async () => {
    db = await createTestDb();
    await db.query(
      "insert into private.worker_secrets (name, token_sha256) values ('agent_worker', sha256(convert_to($1, 'UTF8')))",
      [WORKER],
    );
    t = await makeTeam(db, "bots");
    other = await makeTeam(db, "rivals");
    member = await createUser(db, "bots-member@example.test");
    const token = await invite(db, t, "bots-member@example.test");
    await asUser(db, member, (tx) => tx.query("select * from accept_invite($1)", [token]));
    agent = (
      await asUser(db, t.owner, (tx) =>
        one<{ id: string }>(tx, "insert into ai_agents (team_id, name, specialty, created_by) values ($1, 'Spec writer', 'Writes specs', $2) returning id", [t.team, t.owner]),
      )
    ).id;
    otherAgent = (
      await asUser(db, other.owner, (tx) =>
        one<{ id: string }>(tx, "insert into ai_agents (team_id, name, created_by) values ($1, 'Rival bot', $2) returning id", [other.team, other.owner]),
      )
    ).id;
  });

  it("lets managers manage agents, members see them, and other teams not at all", async () => {
    await expect(
      asUser(db, member, (tx) =>
        tx.query("insert into ai_agents (team_id, name, created_by) values ($1, 'Mine', $2)", [t.team, member]),
      ),
    ).rejects.toThrow(/row-level security/);
    await expect(
      asUser(db, t.owner, (tx) =>
        tx.query("insert into ai_agents (team_id, name, created_by) values ($1, 'spec WRITER', $2)", [t.team, t.owner]),
      ),
    ).rejects.toThrow(/ai_agents_team_name/);
    expect(await asUser(db, member, (tx) => count(tx, `ai_agents where team_id = '${t.team}'`))).toBe(1);
    expect(await asUser(db, other.owner, (tx) => count(tx, `ai_agents where team_id = '${t.team}'`))).toBe(0);
  });

  it("assigns tasks only to the team's own agents", async () => {
    await asUser(db, member, (tx) => tx.query("update tasks set assignee_agent_id = $1 where id = $2", [agent, t.task.id]));
    await expect(
      asUser(db, member, (tx) => tx.query("update tasks set assignee_agent_id = $1 where id = $2", [otherAgent, t.task.id])),
    ).rejects.toThrow(/assignee_not_member/);
  });

  it("runs a task: queued, claimed and finished by the requester, with a comment by the agent", async () => {
    const run = await asUser(db, member, (tx) =>
      one<{ id: string }>(tx, "select start_agent_run($1, $2) as id", [t.task.id, agent]),
    );
    await expect(
      asUser(db, member, (tx) => tx.query("select start_agent_run($1, $2)", [t.task.id, agent])),
    ).rejects.toThrow(/agent_runs_one_active/);
    // Only the requester moves the run along.
    expect(await asUser(db, t.owner, (tx) => one(tx, "select claim_agent_run($1, $2) as ok", [run.id, WORKER]))).toEqual({ ok: false });
    expect(await asUser(db, member, (tx) => one(tx, "select claim_agent_run($1, $2) as ok", [run.id, WORKER]))).toEqual({ ok: true });
    await asUser(db, member, (tx) => tx.query("select finish_agent_run($1, 'Here is the spec.', $2)", [run.id, WORKER]));

    expect(await one(db, "select status, comment_id is not null as commented from agent_runs where id = $1", [run.id])).toEqual({
      status: "succeeded",
      commented: true,
    });
    expect(
      await one(db, "select author_user_id, author_agent_id, body from comments where task_id = $1 and author_agent_id is not null", [t.task.id]),
    ).toEqual({ author_user_id: null, author_agent_id: agent, body: "Here is the spec." });
    expect(await asUser(db, member, (tx) => count(tx, `agent_runs where task_id = '${t.task.id}'`))).toBe(1);
    expect(await asUser(db, other.owner, (tx) => count(tx, `agent_runs where task_id = '${t.task.id}'`))).toBe(0);
  });

  it("only lets the app server's worker claim, finish or fail a run, never the requester's own client", async () => {
    const run = await asUser(db, member, (tx) => one<{ id: string }>(tx, "select start_agent_run($1, $2) as id", [t.task.id, agent]));
    for (const token of [null, "", "guessed-token", WORKER.toUpperCase()]) {
      await expect(asUser(db, member, (tx) => tx.query("select claim_agent_run($1, $2)", [run.id, token]))).rejects.toThrow(/forbidden/);
      await expect(
        asUser(db, member, (tx) => tx.query("select finish_agent_run($1, 'Posing as the teammate', $2)", [run.id, token])),
      ).rejects.toThrow(/forbidden/);
      await expect(asUser(db, member, (tx) => tx.query("select fail_agent_run($1, 'x', $2)", [run.id, token]))).rejects.toThrow(/forbidden/);
    }
    // The token's hash and the check itself are out of reach of API roles.
    await expect(asUser(db, member, (tx) => tx.query("select * from private.worker_secrets"))).rejects.toThrow(/permission denied/);
    await expect(asUser(db, member, (tx) => tx.query("select private.assert_worker($1)", [WORKER]))).rejects.toThrow(/permission denied/);
    expect(await one(db, "select status from agent_runs where id = $1", [run.id])).toEqual({ status: "queued" });

    // Without a configured token, nothing passes.
    await db.query("delete from private.worker_secrets");
    await expect(asUser(db, member, (tx) => tx.query("select claim_agent_run($1, $2)", [run.id, WORKER]))).rejects.toThrow(/worker_not_configured/);
    await db.query(
      "insert into private.worker_secrets (name, token_sha256) values ('agent_worker', sha256(convert_to($1, 'UTF8')))",
      [WORKER],
    );
    await asUser(db, member, (tx) => tx.query("select fail_agent_run($1, 'cleanup', $2)", [run.id, WORKER]));
  });

  it("records failures and allows a retry", async () => {
    const run = await asUser(db, member, (tx) => one<{ id: string }>(tx, "select start_agent_run($1, $2) as id", [t.task.id, agent]));
    await asUser(db, member, (tx) => tx.query("select claim_agent_run($1, $2)", [run.id, WORKER]));
    await asUser(db, member, (tx) => tx.query("select fail_agent_run($1, 'model overloaded', $2)", [run.id, WORKER]));
    expect(await one(db, "select status, error from agent_runs where id = $1", [run.id])).toEqual({ status: "failed", error: "model overloaded" });
    await asUser(db, member, (tx) => tx.query("select start_agent_run($1, $2)", [t.task.id, agent]));
  });

  it("refuses runs for other teams' agents, outsiders and non-Pro teams", async () => {
    await expect(
      asUser(db, member, (tx) => tx.query("select start_agent_run($1, $2)", [t.task.id, otherAgent])),
    ).rejects.toThrow(/agent_not_found/);
    await expect(
      asUser(db, other.owner, (tx) => tx.query("select start_agent_run($1, $2)", [t.task.id, agent])),
    ).rejects.toThrow(/forbidden/);
    const free = await makeTeam(db, "freebots", "free");
    const freeAgent = await one<{ id: string }>(db, "insert into ai_agents (team_id, name) values ($1, 'Bot') returning id", [free.team]);
    await expect(
      asUser(db, free.owner, (tx) => tx.query("select start_agent_run($1, $2)", [free.task.id, freeAgent.id])),
    ).rejects.toThrow(/agents_require_pro/);
  });

  it("creates tasks already assigned to an agent", async () => {
    const created = await asUser(db, member, (tx) =>
      one<{ assignee_agent_id: string }>(
        tx,
        "select * from create_task($1, $2, 'Agent task', '', 'none', null, '{}', null, null, 'c0', $3, $4)",
        [t.board, t.column, member, agent],
      ),
    );
    expect(created.assignee_agent_id).toBe(agent);
    await expect(
      asUser(db, member, (tx) =>
        tx.query("select * from create_task($1, $2, 'X', '', 'none', null, '{}', null, null, 'c1', $3, $4)", [t.board, t.column, member, otherAgent]),
      ),
    ).rejects.toThrow(/assignee_not_member/);
  });

  it("only runs the agent a task is assigned to", async () => {
    const task = await asUser(db, member, (tx) =>
      one<{ id: string }>(tx, "select * from create_task($1, $2, 'Unassigned', '', 'none', null, '{}', null, null, 'c2')", [t.board, t.column]),
    );
    await expect(
      asUser(db, member, (tx) => tx.query("select start_agent_run($1, $2)", [task.id, agent])),
    ).rejects.toThrow(/agent_not_assigned/);
  });

  it("times out stale runs so the task can run again", async () => {
    const task = await asUser(db, member, (tx) =>
      one<{ id: string }>(tx, "select * from create_task($1, $2, 'Stale', '', 'none', null, '{}', null, null, 'c3', $3, $4)", [t.board, t.column, member, agent]),
    );
    const stale = await asUser(db, member, (tx) => one<{ id: string }>(tx, "select start_agent_run($1, $2) as id", [task.id, agent]));
    await db.query("update agent_runs set created_at = now() - interval '11 minutes' where id = $1", [stale.id]);
    await asUser(db, t.owner, (tx) => tx.query("select start_agent_run($1, $2)", [task.id, agent]));
    expect(await one(db, "select status, error from agent_runs where id = $1", [stale.id])).toEqual({
      status: "failed",
      error: "Timed out",
    });
  });

  it("caps a team's concurrent and daily runs", async () => {
    const cap = await makeTeam(db, "capped");
    const capAgent = await one<{ id: string }>(db, "insert into ai_agents (team_id, name) values ($1, 'Bot') returning id", [cap.team]);
    const newTask = (n: number) =>
      asUser(db, cap.owner, (tx) =>
        one<{ id: string }>(tx, `select * from create_task($1, $2, 'T${n}', '', 'none', null, '{}', null, null, 'd${n}', $3, $4)`, [cap.board, cap.column, cap.owner, capAgent.id]),
      );
    for (let n = 0; n < 3; n++) {
      const task = await newTask(n);
      await asUser(db, cap.owner, (tx) => tx.query("select start_agent_run($1, $2)", [task.id, capAgent.id]));
    }
    const fourth = await newTask(3);
    await expect(
      asUser(db, cap.owner, (tx) => tx.query("select start_agent_run($1, $2)", [fourth.id, capAgent.id])),
    ).rejects.toThrow(/agent_busy/);

    await db.query("update agent_runs set status = 'succeeded' where team_id = $1", [cap.team]);
    await db.query(
      `insert into agent_runs (team_id, task_id, agent_id, status) select $1, $2, $3, 'succeeded' from generate_series(1, 47)`,
      [cap.team, fourth.id, capAgent.id],
    );
    await expect(
      asUser(db, cap.owner, (tx) => tx.query("select start_agent_run($1, $2)", [fourth.id, capAgent.id])),
    ).rejects.toThrow(/agent_daily_limit/);
  });

  it("adds agents only on Pro, and a comment has one author", async () => {
    const free = await makeTeam(db, "freeagents", "free");
    await expect(
      asUser(db, free.owner, (tx) =>
        tx.query("insert into ai_agents (team_id, name, created_by) values ($1, 'Bot', $2)", [free.team, free.owner]),
      ),
    ).rejects.toThrow(/row-level security/);
    await expect(
      asUser(db, member, (tx) =>
        tx.query("insert into comments (task_id, author_user_id, author_agent_id, body) values ($1, $2, $3, 'both')", [t.task.id, member, agent]),
      ),
    ).rejects.toThrow(/check constraint|row-level security/);
  });

  it("never lets anyone write runs or agent comments directly", async () => {
    await expect(
      asUser(db, member, (tx) =>
        tx.query("insert into agent_runs (team_id, task_id, agent_id, requested_by) values ($1, $2, $3, $4)", [t.team, t.task.id, agent, member]),
      ),
    ).rejects.toThrow(/permission denied/);
    await expect(
      asUser(db, member, (tx) => tx.query("update agent_runs set status = 'succeeded'")),
    ).rejects.toThrow(/permission denied/);
    await expect(
      asUser(db, member, (tx) =>
        tx.query("insert into comments (task_id, author_agent_id, body) values ($1, $2, 'fake')", [t.task.id, agent]),
      ),
    ).rejects.toThrow(/row-level security/);
  });
});

describe("function grants", () => {
  it("keeps RLS helpers out of the API schema and away from signed-out visitors", async () => {
    const db = await createTestDb();
    const helpers = await db.query<{ proname: string }>(
      `select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public' and p.proname in
         ('team_role', 'is_member', 'is_manager', 'team_of_board', 'team_of_task', 'team_of_label', 'shares_team', 'assert_actor')`,
    );
    expect(helpers.rows).toEqual([]);
    await expect(
      db.transaction(async (tx) => {
        await tx.exec("set local role anon");
        await tx.query("select private.is_member(gen_random_uuid())");
      }),
    ).rejects.toThrow(/permission denied/);
    await expect(
      db.transaction(async (tx) => {
        await tx.exec("set local role authenticated");
        await tx.query("select public.handle_new_user()");
      }),
    ).rejects.toThrow(/permission denied/);
  });
});

describe("API role privileges", () => {
  let db: PGlite;
  beforeAll(async () => {
    db = await createTestDb();
    // A table created after the migrations, like any future one.
    await db.exec("create table public.later_table (id int primary key); alter table public.later_table enable row level security;");
  });

  const tables = async () =>
    (await db.query<{ name: string }>("select tablename as name from pg_tables where schemaname = 'public'")).rows.map((r) => r.name);

  it("gives signed-out visitors no table privileges at all, now or for future tables", async () => {
    const list = await tables();
    expect(list.length).toBeGreaterThanOrEqual(15);
    for (const table of list) {
      for (const privilege of ["SELECT", "INSERT", "UPDATE", "DELETE", "TRUNCATE", "REFERENCES", "TRIGGER"]) {
        const row = await one<{ ok: boolean }>(db, "select has_table_privilege('anon', $1, $2) as ok", [`public.${table}`, privilege]);
        expect(row.ok, `anon ${privilege} on ${table}`).toBe(false);
      }
    }
  });

  it("never lets signed-in users truncate (which skips RLS), maintain (lock, vacuum) or add triggers", async () => {
    for (const table of await tables()) {
      for (const privilege of ["TRUNCATE", "TRIGGER", "REFERENCES", "MAINTAIN"]) {
        const row = await one<{ ok: boolean }>(db, "select has_table_privilege('authenticated', $1, $2) as ok", [`public.${table}`, privilege]);
        expect(row.ok, `authenticated ${privilege} on ${table}`).toBe(false);
      }
    }
    await expect(
      asUser(db, await createUser(db, "truncater@example.test"), (tx) => tx.query("truncate public.tasks")),
    ).rejects.toThrow(/permission denied/);
  });

  it("doesn't let signed-out visitors call functions added later", async () => {
    await db.exec("create function public.later_fn() returns int language sql as 'select 1';");
    // Supabase's default grants anon EXECUTE on new public functions; the
    // migration drops that (RPCs then revoke PUBLIC and grant authenticated).
    const before = await one<{ ok: boolean }>(db, "select has_function_privilege('anon', 'public.later_fn()', 'execute') as ok");
    await db.exec("revoke all on function public.later_fn() from public;");
    const after = await one<{ ok: boolean }>(db, "select has_function_privilege('anon', 'public.later_fn()', 'execute') as ok");
    expect(after.ok).toBe(false);
    // Only PUBLIC's built-in default remained before that revoke, never an anon grant of its own.
    const direct = await db.query("select 1 from pg_proc p, aclexplode(p.proacl) a where p.proname = 'later_fn' and a.grantee = 'anon'::regrole");
    expect(direct.rows).toEqual([]);
    expect(before.ok).toBe(true);
  });

  it("keeps row-level security on for every table", async () => {
    const rows = await db.query<{ name: string; rls: boolean }>(
      "select c.relname as name, c.relrowsecurity as rls from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname in ('public', 'private') and c.relkind = 'r'",
    );
    expect(rows.rows.filter((r) => !r.rls).map((r) => r.name)).toEqual([]);
  });
});
