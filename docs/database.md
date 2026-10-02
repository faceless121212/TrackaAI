# TrackaAI database reference

Hosted Supabase project **TrackaAI** (`ddtrhzyvyweexveqycyx`). Everything below is created by `supabase/migrations/*.sql`, applied in order. This is a snapshot from 2026-10-02.

## Schemas

| Schema | Owner | What's in it |
|---|---|---|
| `public` | **ours** | The app's 14 tables, plus the RPC functions the app calls. The only schema the API exposes. |
| `private` | **ours** | Helpers the API can't reach: RLS helper functions (`is_member`, `is_manager`, `team_role`, `team_of_*`, `shares_team`, `assert_actor`, `plan_limit`, `assert_worker`) and the `worker_secrets` table. |
| `auth` | Supabase | Accounts, sessions, identities (27 tables). Managed by Supabase Auth; the app never writes to it directly. |
| `storage` | Supabase | File storage (8 tables). Not used by TrackaAI yet. |
| `realtime` | Supabase | Realtime subscriptions (9 tables). The board's live updates use it. |
| `vault` | Supabase | Encrypted secrets store (1 table). Not used. |
| `supabase_migrations` | Supabase | History of applied migrations. |
| `extensions`, `graphql`, `graphql_public` | Supabase | Extensions and the GraphQL API; no app tables. |

## The app's tables (`public`)

How they nest: **teams → workspaces → boards → columns → tasks**. People join teams through **memberships**.

| Table | What it holds | Key columns |
|---|---|---|
| `profiles` | One per account (created by a trigger on sign-up) | `id` (= auth user), `email`, `name`, `avatar_url`, `theme` |
| `teams` | A team and its plan | `name`, `slug` (URL), `plan` (`free`/`lite`/`pro`) |
| `memberships` | Who is in which team, and their role | `team_id`, `user_id`, `role` (`owner`/`admin`/`member`) |
| `invites` | Pending invitations (copy-link) | `team_id`, `email`, `role`, `token`, `expires_at`, `accepted_at` |
| `workspaces` | A project inside a team; owns the task key prefix | `team_id`, `name`, `key_prefix` (e.g. ENG), `next_task_number` |
| `boards` | A Kanban board in a workspace | `workspace_id`, `name`, `description` |
| `columns` | A board's columns, in order | `board_id`, `name`, `position` (fractional index) |
| `tasks` | Issues | `board_id`, `column_id`, `key` (ENG-12), `title`, `description`, `priority`, `assignee_user_id` *or* `assignee_agent_id`, `due_date`, `parent_id` (sub-tasks), `position` |
| `labels` | A team's labels | `team_id`, `name`, `color` |
| `task_labels` | Which labels a task has | `task_id`, `label_id` |
| `comments` | Comments on tasks, by a person *or* an AI teammate | `task_id`, `author_user_id` / `author_agent_id`, `body` |
| `ai_agents` | AI teammates (Pro) | `team_id`, `name`, `specialty` |
| `agent_runs` | Each time an AI teammate works on a task | `task_id`, `agent_id`, `requested_by`, `status`, `error`, `comment_id` |
| `ai_usage` | Every metered AI request (limits and costs) | `team_id`, `user_id`, `feature`, `model`, `input_tokens`, `output_tokens` |

`private.worker_secrets` holds only the SHA-256 of the server's AI-teammate worker token. No API role can read it.

## Who can do what

There are three API roles:
- **`anon`**: someone who isn't signed in.
- **`authenticated`**: a signed-in user.
- **`service_role`**: the secret key. The app doesn't use it.

**Row-level security (RLS) is on for every table.** Every policy is for `authenticated` and is scoped to the caller's own team. `anon` has **no table privileges at all** (migration `20261002140000`). Nobody has `TRUNCATE`, `TRIGGER` or `REFERENCES`.

"Member" means any role in the team; "manager" means owner or admin.

| Table | Read | Create | Change | Delete |
|---|---|---|---|---|
| `profiles` | yourself and your teammates | via sign-up trigger | yourself (name, avatar, theme) | — |
| `teams` | members | `create_team` RPC | managers (name, slug); plan via `set_team_plan` (owner) | owner |
| `memberships` | members | `create_team` / `accept_invite` RPCs | owner any role; admin only members; never the owner row | managers remove; anyone leaves; never the owner |
| `invites` | managers | managers (as themselves) | managers | managers |
| `workspaces` | members | managers | managers | managers |
| `boards` | members | managers (`create_board`) | managers | managers |
| `columns` | members | managers | managers | managers |
| `tasks` | members | `create_task` RPC (members) | members (specific columns only) | members |
| `labels` | members | managers | managers | managers |
| `task_labels` | members | members (own team's labels only) | — | members |
| `comments` | members | members, as themselves | never (immutable) | the author or managers |
| `ai_agents` | members | managers, Pro only | managers | managers |
| `agent_runs` | members | `start_agent_run` RPC | only the server (worker token) | — |
| `ai_usage` | members | `start_ai_run` RPC (metered, rate-limited) | `finish_ai_run` (own run, once) | — |
| `private.worker_secrets` | nobody | nobody | nobody | nobody |

Plan limits (members, workspaces, AI runs) are enforced in the database as well as in the app: triggers plus `private.plan_limit`, and a test keeps them in step with `src/lib/domain/plans.ts`.

## Functions the app calls (RPCs)

All of these are callable only when signed in. Each `SECURITY DEFINER` function checks that the caller is who they say (`assert_actor`) and belongs to the team, so the Supabase advisor's "signed-in users can execute SECURITY DEFINER function" notices are expected.

| Function | Does |
|---|---|
| `create_team` | Creates a team, makes you its owner, adds default labels |
| `accept_invite`, `invite_preview` | Joins a team from an invite link / shows what the link is for |
| `transfer_ownership` | Owner hands the team to another member |
| `set_team_plan`, `team_usage` | Simulated checkout (owner) / current usage against the plan |
| `create_board` | Board with its columns (as the caller, under RLS) |
| `create_task` | Task with the next key (ENG-13), labels and assignee |
| `start_ai_run`, `finish_ai_run` | Reserves a metered AI run (monthly limit + 20/minute per user) / records its tokens |
| `start_agent_run` | Queues an AI teammate run (Pro, max 3 active and 50/day per team) |
| `claim_agent_run`, `finish_agent_run`, `fail_agent_run` | The run's steps; need the server's worker token |

## Things to set in the Supabase dashboard (not code)

- **Authentication → Settings → Leaked password protection:** turn it on. The advisor flags it.
- **Authentication → Emails → SMTP settings:** connect an email provider. Until then, confirmation emails only reach your project team's addresses.

## How it's tested

- `src/server/data/supabase/schema.test.ts` runs every migration in an in-memory Postgres (PGlite). It covers:
  - cross-team isolation and role rules;
  - plan limits;
  - AI metering and rate limits;
  - the worker token;
  - API role privileges, including that `anon` can't touch any table now or in future tables, and that nobody can `TRUNCATE`.
- `pnpm test:supabase` runs the repositories against the live project as the seeded demo accounts, so RLS applies as in the app.
