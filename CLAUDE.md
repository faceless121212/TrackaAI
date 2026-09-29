# TrackaAI

Linear-style project management app with AI agents. Teams → Workspaces → Boards → Tasks.

- Product spec: `docs/prd.md` — read before implementing a feature.
- Milestones: `docs/plan.md`. Task-level plan for the current milestone: `docs/build-plan.md`.
- Repo: github.com/faceless121212/TrackaAI (branch `main`; one branch + PR per milestone).

## Stack
- Next.js 16 (App Router, React 19, TS strict), pnpm, Node 22.
- **`proxy.ts`, not `middleware.ts`** — Next 16 renamed it. Auth/session checks go there.
- Supabase (Postgres, Auth, Realtime, RLS) — local via Docker (`supabase start`) from M4 on.
- shadcn/ui + Tailwind v4, Lucide, `next-themes` (**dark is default**).
- dnd-kit + `fractional-indexing` for Kanban ordering.
- Stripe (Lite/Pro subscriptions), Resend + React Email, Vercel AI SDK with `@ai-sdk/anthropic`.
- Zod for validation, Vitest (unit), Playwright (e2e).

## Architecture rules
- **UI never talks to a database directly.** All data access goes through repository interfaces in `src/server/data/types.ts`. Backends: `mock` (JSON file at `.data/mock-db.json`) and `supabase`, selected by `DATA_BACKEND`.
- Mutations are Server Actions in `src/server/actions/*`; validate input with Zod schemas from `src/lib/domain`, then check permissions via `src/server/auth/permissions.ts`.
- Plan limits are enforced server-side through one helper (`assertWithinPlan`) — never only in UI.
- Every Supabase table has RLS scoped by team membership. New table ⇒ new migration + RLS policy + test.
- AI: tools run with the caller's permissions; any mutating AI tool call requires user confirmation. Log usage to `ai_usage`.
- Default models: `claude-sonnet-5` (copilot/agents), `claude-haiku-4-5` (cheap generation).
- Use shadcn components (`pnpm dlx shadcn@latest add <c>`) before writing custom UI. Theme via CSS variables — no hard-coded colors.

## Integrations via MCP
Prefer MCP servers over hand-rolled scripts during development:
- Supabase MCP — migrations, SQL, type generation, advisors.
- Stripe MCP — products/prices, test customers (test mode only).
- Resend MCP — domains, test sends.
- Playwright MCP — verify UI changes in a real browser.

## Commands
```bash
pnpm dev            # app on :3000
pnpm lint && pnpm typecheck && pnpm test   # must pass before commit
pnpm test:e2e       # Playwright
supabase start      # local stack (needs Docker; M4+)
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

## Conventions
- Files: kebab-case; components PascalCase exports; server-only modules import `server-only`.
- Secrets in `.env.local` only; keep `.env.example` updated when adding a variable.
- TDD for domain logic (ordering, task keys, permissions, plan limits, webhook handling).
- Commits: small, imperative subject lines.
