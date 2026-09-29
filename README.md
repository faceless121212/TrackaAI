# TrackaAI

Linear-style project management for teams, with AI agents.

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

### Plans

Teams start on **Free** (just you, 1 workspace); **Lite** allows 3 people and 10 workspaces; **Pro** is unlimited. Billing is simulated: the owner upgrades from **Settings → Billing** through a test checkout, and nothing is charged. Limits live in `src/lib/domain/plans.ts` and are enforced by the server actions and by the database. The seeded demo team is on Pro.

### Data backends

- **Mock** (`DATA_BACKEND=mock`, default): a JSON file at `.data/mock-db.json`, seeded on first run with `demo@trackaai.test` / `demo-password`; delete `.data/` to reset. CI and the e2e suite use this.
- **Supabase** (`DATA_BACKEND=supabase`): a hosted project. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (public values; no secret key needed). Apply `supabase/migrations/*` in order, then `supabase/seed.sql`, which creates the pre-confirmed `demo@trackaai.test` and `mate@trackaai.test` accounts (password `demo-password`) and the demo board. Sign-up requires confirming the email (Supabase "Confirm email" is on). The seed is for development only (its password is public): delete those two accounts and the `acme` team before a project goes to production.

Invites are shared with the members page's **Copy link** button (email sending was skipped).

Checks: `pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e`. Against the live Supabase project: `pnpm test:supabase`.
