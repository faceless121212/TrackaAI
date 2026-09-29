# TrackaAI — Build Plan (Milestones)

Source of truth for scope: [`docs/prd.md`](./prd.md).

**Strategy: UI first on mock data, then swap in Supabase.** Docker isn't installed yet, so M0–M3 run entirely on a mock data backend behind repository interfaces. M4 introduces local Supabase and flips `DATA_BACKEND=supabase` — screens don't change. Each milestone ends in a working, demoable app and its own PR.

Each milestone gets a detailed task-level plan in [`docs/build-plan.md`](./build-plan.md), written right before it starts.

---

## M0 — Foundation
**Goal:** empty but real app shell.
- `create-next-app` (Next.js 16, TS strict, Tailwind v4, App Router, `src/`, pnpm).
- shadcn/ui init + base components (button, input, dialog, sheet, dropdown, avatar, badge, command, sidebar, sonner, form, select, tooltip).
- `next-themes`: **dark default**, light/system toggle.
- App layout: collapsible sidebar, top bar, `⌘K` command palette stub.
- `proxy.ts` with a stubbed session check (mock session cookie).
- Tooling: ESLint, Vitest, Playwright, `pnpm typecheck`, GitHub Actions CI (lint + typecheck + test).
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

## M4 — Supabase (hosted) ✅
No Docker: a hosted Supabase project (free plan), managed through the **Supabase MCP** connector.
- Schema migrations for all current entities with **RLS** on every table (team-scoped; roles mirror `permissions.ts`); RLS helpers live in a non-exposed `private` schema; multi-row invariants are SQL functions (team creation, atomic task numbers, invite acceptance, ownership transfer).
- Schema and RLS are tested **in PGlite** (Postgres in WASM) in the normal unit suite — cross-team isolation, role limits, grants.
- Supabase Auth replaces mock auth; **"Confirm email" stays on** (check-your-inbox screen + `/auth/callback`); `proxy.ts` refreshes sessions with `@supabase/ssr`.
- Supabase repository implementations behind the same interfaces (`DATA_BACKEND=supabase`), verified by live integration tests (`pnpm test:supabase`) as two seeded users; generated DB types.
- Realtime board updates.

**Done:** CI keeps running unit + e2e on the mock backend; the live project is covered by the integration tests and a scripted end-to-end run.

## M5 — Emails (Resend) — skipped
Skipped by decision (2026-09-29). Invites use the members page's **Copy link** (and a server log line); Supabase's built-in mailer sends the sign-up confirmation emails. `deliverInvites()` is the single seam if email is added later. Before launch, configure a real SMTP provider in Supabase Auth.

## M6 — Plans & billing (simulated) ✅
Real Stripe was skipped by decision (2026-09-29): billing is **simulated**, and nothing is charged.
- Plans: **Free** (just you, 1 workspace), **Lite** (3 people, 10 workspaces), **Pro** (unlimited). The catalog lives in `src/lib/domain/plans.ts`.
- Limits are enforced in `assertWithinPlan` (server actions) and in Postgres triggers, so the API can't be used to skip them.
- Public `/pricing` page; billing settings page with usage; owner-only simulated checkout (upgrade) and downgrade; upgrade prompts where limits block.
- Swapping in Stripe later: Checkout replaces the simulated checkout page, and a signed webhook calls `set_team_plan` with the service role instead of the owner.

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
M0 → M1 → M2 → M3 → M4 → M6 → M7 → M8 → M9 → M10     (M5 skipped)
```
M7 technically only needs M2, but plan metering needs M6.
