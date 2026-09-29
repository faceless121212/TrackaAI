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

### Data backends

- **Mock** (`DATA_BACKEND=mock`, default): a JSON file at `.data/mock-db.json`, seeded on first run with `demo@trackaai.test` / `demo-password`; delete `.data/` to reset. CI and the e2e suite use this.
- **Supabase** (`DATA_BACKEND=supabase`): a hosted project. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (public values; no secret key needed). Apply `supabase/migrations/*` in order, then `supabase/seed.sql`, which creates the pre-confirmed `demo@trackaai.test` and `mate@trackaai.test` accounts (password `demo-password`) and the demo board. Sign-up requires confirming the email (Supabase "Confirm email" is on).

Invites are shared with the members page's **Copy link** button (email sending was skipped).

Checks: `pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e`. Against the live Supabase project: `pnpm test:supabase`.
