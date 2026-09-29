# TrackaAI — Product Requirements

_Status: draft v1 · 2026-09-29 · Owner: Ilia Ladyga_

## 1. Summary

TrackaAI is a Linear-style project management app where small teams plan and ship work on Kanban boards, with AI agents that write, break down, triage and even execute tasks alongside humans.

## 2. Goals & non-goals

**Goals (v1)**
- A team can sign up, create a team, invite teammates and be working on a board in < 3 minutes.
- Fast, keyboard-friendly Kanban with drag & drop that feels like Linear.
- AI that saves real time: well-written tasks, sensible breakdowns, a copilot that can act on the board, and an AI teammate that can be assigned work.
- Paid plans (Lite / Pro) via Stripe.

**Non-goals (v1)**
- Native mobile apps, offline mode.
- Cycles/sprints, roadmaps, Gantt, time tracking.
- Git/GitHub integrations, public API, webhooks.
- SSO/SAML, audit logs.

## 3. Users & roles

| Role | Can |
|---|---|
| **Owner** | Everything, incl. billing and deleting the team. Exactly one per team. |
| **Admin** | Manage members, workspaces, boards, labels. |
| **Member** | Create/edit/move tasks, comment, use AI features within plan limits. |

A user can belong to multiple teams and switch between them.

## 4. Domain model

```
User ──< Membership >── Team (billing unit, plan)
                          └──< Workspace (e.g. "Engineering", key prefix "ENG")
                                  └──< Board
                                          ├──< Column (= status, ordered)
                                          └──< Task
                                                  ├── Label[] (team-scoped)
                                                  ├──< Comment
                                                  └──< SubTask (Task with parent_id)
Team ──< Invite
Team ──< AiAgent (the assignable AI teammate)
```

**Task fields (v1):** `key` (e.g. `ENG-12`, sequential per workspace), `title`, `description` (markdown), `status` (= column), `priority` (none · low · medium · high · urgent), `assignee` (user or AI agent), `labels[]`, `due_date`, `position` (fractional index within column), `parent_id` (for breakdowns), `created_by`, timestamps. Comments are markdown with author (user or AI).

## 5. Functional requirements

### 5.1 Auth & onboarding
- Sign up / sign in with email + password and magic link (Supabase Auth). Google OAuth is a stretch goal.
- First-run wizard: **Create team** (name, slug) → **Create first workspace** (name, key prefix) → **Invite teammates** (optional, skippable) → lands on a seeded default board (Backlog · Todo · In Progress · In Review · Done).
- **Welcome email** via Resend on team creation; **invite email** via Resend.

### 5.2 Workspaces & boards
- Sidebar: team switcher → workspaces → boards.
- CRUD workspaces (name, key prefix, icon) and boards (name, description).
- Board columns: add, rename, reorder, delete (tasks must be moved first).

### 5.3 Kanban
- Drag & drop tasks within and across columns; drag to reorder columns. Optimistic UI, persisted order.
- Quick-add at the top of each column; `C` opens the create-task dialog.
- Task detail as a side sheet (URL-addressable: `/…/board/[boardId]?task=ENG-12`).
- Filter by assignee, label, priority; text search on the board.
- Realtime: other members' changes appear without refresh (once on Supabase).

### 5.4 Team & user management
- Members list with role; change role; remove member; leave team.
- Invite by email (link with token, 7-day expiry), resend/revoke invites.
- Profile: name, avatar, theme preference.

### 5.5 Plans & billing
- Plans: **Free**, **Lite** and **Pro**, per team, monthly. No trial: Free is the starting plan.
- Billing is **simulated** for now (decision 2026-09-29): the owner upgrades through an in-app test checkout and nothing is charged. Stripe (Checkout, Customer Portal, webhooks syncing `team.plan`) can replace it later.
- Only the owner changes the plan. Downgrades keep all data; a team above its new limits can't add more until it's back under them.
- Plan limits enforced server-side (and in the database):

| | Free | Lite | Pro |
|---|---|---|---|
| Price (per team / month) | $0 | $10 | $25 |
| People (incl. owner and pending invites) | 1 | 3 | unlimited |
| Workspaces ("projects") | 1 | 10 | unlimited |
| AI task writer & breakdown | 10 runs / month | 100 runs / month | unlimited (fair use) |
| Board copilot | — | — | ✓ |
| AI teammate | — | — | ✓ |

- Pricing is shown on a public `/pricing` page and on the team's billing settings page.

### 5.6 AI features (Vercel AI SDK)
1. **Task writer** — from a one-liner, generate title, description with acceptance criteria, suggested priority and labels. Streams into the create dialog; user accepts/edits.
2. **Breakdown agent** — split a task into 3–8 sub-tasks, preview, then create them in the parent's column.
3. **Board copilot** — side-panel chat with tools: `search_tasks`, `create_task`, `update_task`, `move_task`, `assign_task`, `summarize_board`. Every mutating tool call shows a confirm card before executing.
4. **AI teammate** — an assignable agent member. When a task is assigned to it, a background job runs: reads the task and context, produces a result (e.g. spec, research, draft copy, plan) and posts it as a comment, then moves the task to _In Review_. Human always reviews.
5. **(Open)** A fifth capability was flagged as "something else" — to be defined.

AI usage is metered per team per month (`ai_usage` table) to enforce plan limits.

## 6. UX / look & feel
- shadcn/ui components, Tailwind v4, Lucide icons, Geist font.
- **Dark mode by default**, light mode toggle (persisted per user), system option.
- Dense, Linear-like layout: collapsible sidebar, command palette (`⌘K`), keyboard shortcuts.
- Responsive down to tablet; phone is view-and-light-edit only.

## 7. Tech stack & architecture
- **Next.js 16** App Router, React 19, TypeScript strict, Server Components + Server Actions. Route protection and session refresh in **`proxy.ts`** (Next 16's replacement for `middleware.ts`).
- **Supabase** (Postgres, Auth, Realtime, RLS), run **locally via Docker** first, cloud later. Types generated from the DB.
- **Data layer behind repository interfaces** (`src/server/data`): a **mock** backend (seeded, JSON-file-persisted) ships first so UI is built before Docker/Supabase is available; the **Supabase** backend is swapped in via `DATA_BACKEND=supabase` without touching UI.
- **Stripe** (Checkout, Portal, webhooks at `/api/webhooks/stripe`).
- **Resend** + React Email templates.
- **AI SDK** (`ai`, `@ai-sdk/react`, `@ai-sdk/anthropic`) — default models: `claude-sonnet-5` for copilot/agents, `claude-haiku-4-5` for cheap generation.
- **dnd-kit** for drag & drop; `fractional-indexing` for ordering.
- **Zod** for all input validation; **Vitest** for unit, **Playwright** for e2e.
- **MCP for integrations during development:** Supabase MCP (schema, migrations, SQL), Stripe MCP (products/prices, test data), Resend MCP (domains, test sends), Playwright MCP (UI verification).

## 8. Security
- Every table has RLS keyed on team membership; server actions re-check role.
- Secrets only in `.env.local`; nothing sensitive exposed to the client except publishable keys.
- Stripe webhook signature verification; idempotent handlers.
- AI tools execute with the calling user's permissions; mutations require confirmation.

## 9. Success metrics
- Time from sign-up to first task created (target < 3 min median).
- % of new tasks created with AI task writer.
- Weekly active teams; trial → paid conversion.

## 10. Open questions
1. What is the 5th AI capability ("something else")?
2. ~~Confirm Lite/Pro limits, prices and whether there's a free tier or trial.~~ Decided in M6 (§5.5).
3. Is Google OAuth needed in v1?
4. Domain for Resend sending (needed before real emails leave local dev).
