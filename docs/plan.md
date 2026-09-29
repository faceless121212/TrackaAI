# TrackaAI — Build Plan (Milestones)

Source of truth for scope: [`docs/prd.md`](./prd.md).

**Strategy: UI first on mock data, then swap in Supabase.** Docker isn't installed yet, so M0–M3 run entirely on a mock data backend behind repository interfaces. M4 introduces local Supabase and flips `DATA_BACKEND=supabase` — screens don't change. Each milestone ends in a working, demoable app and its own PR.

Each milestone gets a detailed task-level plan (`docs/plans/M<n>-*.md`) written right before it starts.

---

## M0 — Foundation
**Goal:** empty but real app shell.
- `create-next-app` (Next.js 16, TS strict, Tailwind v4, App Router, `src/`, pnpm).
- shadcn/ui init + base components (button, input, dialog, sheet, dropdown, avatar, badge, command, sidebar, sonner, form, select, tooltip).
- `next-themes`: **dark default**, light/system toggle.
- App layout: collapsible sidebar, top bar, `⌘K` command palette stub.
- `proxy.ts` with a stubbed session check (mock session cookie).
- Tooling: ESLint, Prettier, Vitest, Playwright, `pnpm typecheck`, GitHub Actions CI (lint + typecheck + test).
- Domain types + Zod schemas (`src/lib/domain`) and repository interfaces (`src/server/data/types.ts`).

**Done when:** `pnpm dev` shows the themed shell, toggle works, CI green.

## M1 — Mock data layer + onboarding
- Mock backend: seeded, persisted to `.data/mock-db.json` (gitignored), implements all repositories.
- Mock auth: sign-up / sign-in pages (fake users, session cookie), protected routes via `proxy.ts`.
- Onboarding wizard: create team → first workspace (key prefix) → invite (skippable) → default board with 5 columns.
- Team switcher in sidebar.

**Done when:** a new "user" can go from sign-up to an empty seeded board; e2e test covers it.

## M2 — Workspaces, boards & Kanban
- Workspace + board CRUD; sidebar tree.
- Kanban with **dnd-kit**: move within/across columns, reorder columns, fractional-index positions, optimistic updates via server actions.
- Task create dialog (+ quick-add, `C` shortcut), task detail sheet (URL `?task=ENG-12`): all Linear-core fields, markdown description, labels, comments.
- Board filters (assignee, label, priority) and search.

**Done when:** full task lifecycle works on mock data; unit tests on ordering/keys; e2e drag-drop test.

## M3 — Team & user management
- Members page: roles (owner/admin/member), change role, remove, leave team.
- Invites: create, list, resend, revoke; accept-invite flow via token link (email is logged to console until M5).
- Profile & preferences (name, avatar, theme).
- Role checks centralised in `src/server/auth/permissions.ts`.

**Done when:** a second user can be invited, join, and collaborate; permission tests pass.

## M4 — Supabase (local, Docker)
**Prereq:** a container runtime (OrbStack recommended) installed.
- `supabase init` / `supabase start`; schema migrations for all PRD entities; **RLS** on every table; seed script.
- Supabase Auth replaces mock auth (email+password, magic link); `proxy.ts` uses `@supabase/ssr` for session refresh.
- Supabase repository implementations; generated DB types; `DATA_BACKEND=supabase`.
- Realtime subscriptions on the board.
- Use **Supabase MCP** for migrations/SQL inspection.

**Done when:** all M1–M3 e2e tests pass against local Supabase; RLS tests prove cross-team isolation.

## M5 — Emails (Resend)
- React Email templates: welcome, invite.
- Welcome on team creation, invite on invite create/resend.
- Local dev: Resend test mode / Supabase Inbucket for auth mail. Use **Resend MCP** for domain & test sends.

**Done when:** onboarding and invite send real (test) emails.

## M6 — Billing (Stripe)
- Products/prices for Lite & Pro (monthly/yearly) created via **Stripe MCP** in test mode.
- Checkout, Customer Portal, `/api/webhooks/stripe` (signature-verified, idempotent) → `subscriptions` table + `team.plan`.
- Trial on team creation; plan-limit enforcement helper (`assertWithinPlan`) used by members, workspaces, AI.
- Billing settings page; upgrade prompts on limits.
- Local webhooks via `stripe listen`.

**Done when:** test-card upgrade/downgrade/cancel flows sync correctly; limits enforced.

## M7 — AI I: Task writer & breakdown
- AI SDK + `@ai-sdk/anthropic`; `ai_usage` metering.
- Task writer: streamed structured output into the create dialog.
- Breakdown agent: preview sub-tasks → create.

## M8 — AI II: Board copilot
- Side-panel chat (`useChat`) with tools: search/create/update/move/assign/summarize; confirm cards for mutations; runs with user's permissions.

## M9 — AI III: AI teammate
- `ai_agents` as assignable members; assignment enqueues a job (`agent_runs` table); worker runs the agent (route handler + `after()` locally; cron/queue later), posts comment, moves task to In Review.
- Run history & retry on the task sheet.

## M10 — Hardening & launch
- Error/empty/loading states, accessibility pass, performance (RSC caching), rate limits.
- Supabase cloud + Vercel deploy, Stripe live keys, Resend domain.
- Open PRD question #1 (5th AI capability) slotted here or earlier once defined.

---

### Dependencies
```
M0 → M1 → M2 → M3 → M4 → M5
                        ↘ M6 → M7 → M8 → M9 → M10
```
M5 and M6 can run in parallel after M4. M7 technically only needs M2, but plan metering needs M6.
