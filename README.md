# TrackaAI

Linear-style project management for teams, with AI agents.

- Database reference (tables, RLS, functions): `docs/database.md`.
- Product spec: [docs/prd.md](docs/prd.md)
- Roadmap: [docs/plan.md](docs/plan.md) · Current build plan: [docs/build-plan.md](docs/build-plan.md)

## Develop

```bash
cp .env.example .env.local
pnpm install
pnpm dev
```

### AI

Set `ANTHROPIC_API_KEY` in `.env.local` to enable the AI task writer (**Write with AI** in the new-task dialog) and **Break down with AI** in a task's sheet. Both use `claude-haiku-4-5`, suggest only (nothing is saved until you confirm), and count toward the plan's monthly AI runs (Free 10, Lite 100, Pro unlimited), logged in `ai_usage`. `AI_MOCK=1` swaps in a mock model (the e2e suite uses it).

On Pro, the board's **Copilot** panel (`claude-sonnet-5`) answers questions about the board and proposes changes (create, update, move, assign); each change is a card you approve or deny, and it runs with your permissions. Set `TOOL_APPROVAL_SECRET` in production so approvals are signed with a shared key.

On every plan, **Ask AI** (sidebar, `claude-sonnet-5-5`) is a read-only chat about all of the team's issues: what's urgent or overdue, who has what, what's stuck in review. It looks things up with read-only tools (search, one issue in full, team overview) under the caller's permissions, links every issue it mentions, and counts each message as one AI run. Conversations aren't saved.

Also on Pro, managers add **AI teammates** in **Settings → AI teammates** (a name and a specialty). Assign a task to one and it writes a first result (a spec, plan or draft) as a comment, then moves the task to **In Review**; the task sheet shows its runs and a **Run again** button. Runs happen in the background after the request (`after()`); a job queue can take over later. On the Supabase backend, set `AGENT_WORKER_SECRET` and store its SHA-256 in `private.worker_secrets` (see `.env.example`): only the server can then post as a teammate.

### Checking a live setup

`pnpm test:smoke` goes through every main feature once, AI included, against a running server on the Supabase backend: sign-in, board, tasks, comments, the AI writer, breakdown, copilot, Ask AI and an AI teammate, settings and pricing. It signs in as the seeded demo account (or `SMOKE_EMAIL`/`SMOKE_PASSWORD`), needs its team on Pro, and deletes what it creates. Each run uses five AI runs from that team's monthly allowance. Never seed a public deployment with the demo account: its password is public. Start a production build first (`pnpm build && pnpm start`), then run `SMOKE_URL=http://localhost:3000 pnpm test:smoke`. Each step's time is printed.

`DEBUG_SUPABASE=1` logs every Supabase request with its duration. Each line is a round trip, so a slow page shows up as a long list.

### Plans

Teams start on **Free** (just you, 1 workspace); **Lite** allows 3 people and 10 workspaces; **Pro** is unlimited. Billing is simulated: the owner upgrades from **Settings → Billing** through a test checkout, and nothing is charged. Limits live in `src/lib/domain/plans.ts` and are enforced by the server actions and by the database. The seeded demo team is on Pro.

### Data backends

- **Mock** (`DATA_BACKEND=mock`, default): a JSON file at `.data/mock-db.json`, seeded on first run with `demo@trackaai.test` / `demo-password`; delete `.data/` to reset. CI and the e2e suite use this.
- **Supabase** (`DATA_BACKEND=supabase`): a hosted project. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (public values; no secret key needed). Apply `supabase/migrations/*` in order, then `supabase/seed.sql`, which creates the pre-confirmed `demo@trackaai.test` and `mate@trackaai.test` accounts (password `demo-password`) and the demo board. Sign-up requires confirming the email (Supabase "Confirm email" is on). The seed is for development only (its password is public): delete those two accounts and the `acme` team before a project goes to production.

Invites are shared with the members page's **Copy link** button (email sending was skipped).

Checks: `pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e`. Against the live Supabase project: `pnpm test:supabase`.
