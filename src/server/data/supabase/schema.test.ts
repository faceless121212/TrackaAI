// @vitest-environment node
import type { PGlite, Transaction } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";
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

/** A user with their own team, workspace, board (2 columns), label and one task. */
async function makeTeam(db: PGlite, slug: string) {
  const owner = await createUser(db, `${slug}-owner@example.test`, `${slug} owner`);
  return asUser(db, owner, async (tx) => {
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
    ).rejects.toThrow(/row-level security/);
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
