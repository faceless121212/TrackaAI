# TrackaAI Build Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** [`docs/prd.md`](./prd.md) · **Roadmap:** [`docs/plan.md`](./plan.md)

This file holds the detailed, task-level plan for the **current** milestone. Each later milestone (M1–M10 in `plan.md`) is appended here as a new section right before work on it starts, so it can build on the real code from the previous one.

| Milestone | Status |
|---|---|
| **M0 — Foundation** | 📝 Planned (below) |
| M1 — Mock data layer + onboarding | Planned when M0 is merged |
| M2 — Workspaces, boards & Kanban | — |
| M3 — Team & user management | — |
| M4 — Supabase (local, Docker) | — |
| M5 — Emails (Resend) | — |
| M6 — Billing (Stripe) | — |
| M7 — AI I: task writer & breakdown | — |
| M8 — AI II: board copilot | — |
| M9 — AI III: AI teammate | — |
| M10 — Hardening & launch | — |

---

# M0 — Foundation Implementation Plan

**Goal:** A real, tested Next.js 16 app shell — dark-by-default shadcn UI with light toggle, collapsible sidebar, ⌘K palette, a `proxy.ts` session gate with dev sign-in, domain schemas and repository interfaces — with lint/typecheck/unit/e2e green in CI.

**Architecture:** App Router with a `(app)` route group for signed-in pages and a public `/sign-in`. `src/proxy.ts` does an optimistic cookie check (real auth arrives in M1/M4). Domain types are Zod schemas in `src/lib/domain`; data access is defined as interfaces in `src/server/data/types.ts` with no implementation yet — M1 adds the mock backend.

**Tech Stack:** Next.js 16.3 · React 19.2 · TypeScript 5.9 · Tailwind v4 · shadcn 4 (`radix-nova` style) · next-themes · Zod 4 · Vitest 5 + Testing Library · Playwright 1.63 · pnpm 10 · Node 22.

## Global Constraints

- Repo root: `/Users/ilaladyga/trackaai` (branch `main`, remote `origin` = `https://github.com/faceless121212/TrackaAI.git`). All paths below are relative to it.
- Next.js **16** — route gating lives in **`src/proxy.ts`** exporting `proxy()`; there is **no** `middleware.ts`.
- **Dark mode is the default**; users can toggle to light. Theme via shadcn CSS variables only — no hard-coded colors.
- Use shadcn components before writing custom UI.
- UI and server actions never touch a database directly; data access goes through `src/server/data/types.ts` interfaces.
- `pnpm lint && pnpm typecheck && pnpm test` must pass before every commit.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` when authored by Claude.
- Do **not** `git push` without the user's go-ahead.

## Verified gotchas (found while dry-running this plan)

1. `create-next-app` refuses a non-empty directory → scaffold into a sibling folder, then copy in.
2. `create-next-app --agents-md` writes `AGENTS.md` and a `CLAUDE.md` containing only `@AGENTS.md`. Keep our `CLAUDE.md` and add `@AGENTS.md` as its first line.
3. The default `.gitignore` has `.env*`, which would also ignore `.env.example` → add `!.env.example`.
4. `shadcn init` prompts for a preset unless given `-p nova`; it also adds a stray `cn` npm dependency → remove it.
5. shadcn's generated `src/hooks/use-mobile.ts` fails Next 16's `react-hooks/set-state-in-effect` lint rule → replace it (Task 5).
6. In this shadcn version `CommandDialog` does **not** wrap children in `<Command>` → wrap them yourself or cmdk crashes.
7. The shadcn `Sidebar` tooltips need a `TooltipProvider` at the root, or prerendering fails.
8. `tsc --noEmit` needs Next's generated route types (`PageProps<"/sign-in">`) → `typecheck` runs `next typegen` first.
9. Vitest: use `globals: true` (Testing Library auto-cleanup) **and** import `describe/it/expect` from `"vitest"` explicitly (so `tsc` is happy). cmdk needs `ResizeObserver` and `scrollIntoView` stubs in jsdom.

## File map (end of M0)

```
src/
  proxy.ts                                  session gate (Task 6)
  app/
    layout.tsx                              root: fonts, ThemeProvider, TooltipProvider, Toaster (Task 5, 7)
    globals.css                             shadcn theme tokens (Task 5)
    sign-in/page.tsx                        dev sign-in (Task 6)
    (app)/layout.tsx                        sidebar + header shell (Task 7)
    (app)/page.tsx                          "My tasks" empty state (Task 7)
  components/
    ui/*                                    shadcn generated (Task 5)
    theme/theme-provider.tsx                next-themes, dark default (Task 5)
    theme/theme-toggle.tsx (+ .test.tsx)    light/dark toggle (Task 5)
    shell/nav-items.ts                      nav config shared by sidebar + palette (Task 7)
    shell/app-sidebar.tsx                   collapsible sidebar (Task 7)
    shell/app-header.tsx                    trigger, palette button, toggle (Task 7)
    shell/command-menu.tsx (+ .test.tsx)    ⌘K palette (Task 7)
  hooks/use-mobile.ts                       lint-clean replacement (Task 5)
  lib/
    utils.ts                                shadcn cn() (Task 5)
    auth/routes.ts (+ .test.ts)             cookie name, public paths, safe redirects (Task 6)
    domain/task-key.ts (+ .test.ts)         ENG-12 keys (Task 2)
    domain/schemas.ts (+ .test.ts)          Zod entities + inputs + types (Task 3)
    domain/constants.ts                     DEFAULT_COLUMNS (Task 3)
    domain/index.ts                         barrel (Task 3)
  server/
    auth/actions.ts                         devSignIn / signOut server actions (Task 6)
    data/backend.ts (+ .test.ts)            DATA_BACKEND resolver (Task 4)
    data/types.ts                           repository interfaces (Task 4)
e2e/shell.spec.ts                           Playwright smoke (Task 8)
vitest.config.mts, vitest.setup.ts          (Task 2)
playwright.config.ts                        (Task 8)
.github/workflows/ci.yml                    (Task 9)
.env.example                                (Task 9)
```

---

### Task 1: Scaffold Next.js 16 into the repo

**Files:**
- Create: everything `create-next-app` generates (`package.json`, `src/app/*`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `postcss.config.mjs`, `AGENTS.md`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `public/*`)
- Modify: `.gitignore`, `CLAUDE.md`, `package.json`

**Interfaces:**
- Produces: `pnpm dev | build | start | lint | typecheck` scripts used by every later task.

- [ ] **Step 1: Scaffold into a sibling folder** (the repo isn't empty, see gotcha 1)

```bash
cd ~ && pnpm dlx create-next-app@16.3.7 trackaai-scaffold \
  --ts --tailwind --eslint --app --src-dir --import-alias "@/*" \
  --use-pnpm --no-react-compiler --agents-md --disable-git --yes
```
Expected: ends with `Success! Created trackaai-scaffold`.

- [ ] **Step 2: Copy it into the repo without clobbering our docs**

```bash
rsync -a --exclude node_modules --exclude .next \
  --exclude README.md --exclude CLAUDE.md --exclude .gitignore \
  ~/trackaai-scaffold/ ~/trackaai/
cp ~/trackaai-scaffold/.gitignore ~/trackaai/.gitignore
rm -rf ~/trackaai-scaffold
cd ~/trackaai
```

- [ ] **Step 3: Extend `.gitignore`** — append:

```gitignore

# TrackaAI
!.env.example
.data/
/test-results/
/playwright-report/
/blob-report/
/playwright/.cache/
```

- [ ] **Step 4: Fix package name and add scripts** — in `package.json` set `"name": "trackaai"` and make `scripts`:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "typecheck": "next typegen && tsc --noEmit"
}
```

- [ ] **Step 5: Link AGENTS.md from CLAUDE.md** — insert as the very first line of `CLAUDE.md`:

```markdown
@AGENTS.md
```

- [ ] **Step 6: Install and verify**

Run: `pnpm install && pnpm lint && pnpm typecheck && pnpm build`
Expected: all succeed; build lists route `/`.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js 16 app"
```

---

### Task 2: Unit-test tooling + task keys

**Files:**
- Create: `vitest.config.mts`, `vitest.setup.ts`, `src/lib/domain/task-key.ts`, `src/lib/domain/task-key.test.ts`
- Modify: `package.json` (scripts)

**Interfaces:**
- Produces: `formatTaskKey(prefix: string, number: number): string` (throws `RangeError` for non-positive / fractional numbers) and `parseTaskKey(key: string): { prefix: string; number: number } | null`. Used by the task repos in M1/M4 and the `?task=ENG-12` URL in M2.

- [ ] **Step 1: Install test deps**

```bash
pnpm add -D vitest@^5 @vitejs/plugin-react jsdom vite-tsconfig-paths \
  @testing-library/react @testing-library/dom @testing-library/jest-dom
```

- [ ] **Step 2: Create `vitest.config.mts`**

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
```

- [ ] **Step 3: Create `vitest.setup.ts`**

```ts
import "@testing-library/jest-dom/vitest";

// jsdom lacks these; cmdk and Radix use them.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;
Element.prototype.scrollIntoView ??= function scrollIntoView() {};
```

- [ ] **Step 4: Add scripts** to `package.json`: `"test": "vitest run"`, `"test:watch": "vitest"`.

- [ ] **Step 5: Write the failing test** `src/lib/domain/task-key.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { formatTaskKey, parseTaskKey } from "./task-key";

describe("formatTaskKey", () => {
  it("joins prefix and number", () => {
    expect(formatTaskKey("ENG", 12)).toBe("ENG-12");
  });

  it("rejects non-positive or fractional numbers", () => {
    expect(() => formatTaskKey("ENG", 0)).toThrow(RangeError);
    expect(() => formatTaskKey("ENG", 1.5)).toThrow(RangeError);
  });
});

describe("parseTaskKey", () => {
  it("parses a valid key", () => {
    expect(parseTaskKey("ENG-12")).toEqual({ prefix: "ENG", number: 12 });
  });

  it("is case-insensitive and trims whitespace", () => {
    expect(parseTaskKey(" eng-7 ")).toEqual({ prefix: "ENG", number: 7 });
  });

  it.each(["ENG", "ENG-", "ENG-0", "ENG-01", "E-1", "TOOLONG-1", "1NG-1"])("rejects %s", (key) => {
    expect(parseTaskKey(key)).toBeNull();
  });
});
```

- [ ] **Step 6: Run it to verify it fails**

Run: `pnpm test`
Expected: FAIL — `Failed to resolve import "./task-key"`.

- [ ] **Step 7: Implement** `src/lib/domain/task-key.ts`

```ts
const TASK_KEY_PATTERN = /^([A-Z][A-Z0-9]{1,4})-([1-9]\d*)$/;

export function formatTaskKey(prefix: string, number: number): string {
  if (!Number.isInteger(number) || number < 1) {
    throw new RangeError(`Task number must be a positive integer, got ${number}`);
  }
  return `${prefix}-${number}`;
}

export function parseTaskKey(key: string): { prefix: string; number: number } | null {
  const match = TASK_KEY_PATTERN.exec(key.trim().toUpperCase());
  if (!match) return null;
  return { prefix: match[1], number: Number(match[2]) };
}
```

- [ ] **Step 8: Run tests, lint, typecheck**

Run: `pnpm test && pnpm lint && pnpm typecheck`
Expected: 11 tests pass; lint and typecheck clean.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "test: add Vitest and task key helpers"
```

---

### Task 3: Domain schemas & types

**Files:**
- Create: `src/lib/domain/schemas.ts`, `src/lib/domain/schemas.test.ts`, `src/lib/domain/constants.ts`, `src/lib/domain/index.ts`

**Interfaces:**
- Consumes: `task-key.ts` (re-exported from the barrel).
- Produces (all from `@/lib/domain`): constants `ROLES`, `PRIORITIES`, `PLANS`, `DEFAULT_COLUMNS`; schemas `idSchema`, `roleSchema`, `prioritySchema`, `planSchema`, `slugSchema`, `keyPrefixSchema`, `userSchema`, `teamSchema`, `membershipSchema`, `workspaceSchema`, `boardSchema`, `columnSchema`, `assigneeSchema`, `taskSchema`, `createTeamInputSchema`, `createWorkspaceInputSchema`, `createBoardInputSchema`, `createTaskInputSchema`, `updateTaskInputSchema`; types `Role`, `Priority`, `Plan`, `User`, `Team`, `Membership`, `Workspace`, `Board`, `Column`, `Assignee`, `Task`, `CreateTeamInput`, `CreateWorkspaceInput`, `CreateBoardInput`, `CreateTaskInput`, `UpdateTaskInput`.

- [ ] **Step 1: Install Zod**

```bash
pnpm add zod@^4
```

- [ ] **Step 2: Write the failing test** `src/lib/domain/schemas.test.ts`

```ts
import { describe, expect, it } from "vitest";
import {
  assigneeSchema,
  createTaskInputSchema,
  keyPrefixSchema,
  slugSchema,
  updateTaskInputSchema,
} from "./schemas";

describe("keyPrefixSchema", () => {
  it.each(["ENG", "A1", "WEB22"])("accepts %s", (value) => {
    expect(keyPrefixSchema.safeParse(value).success).toBe(true);
  });

  it.each(["eng", "E", "TOOLONG", "1AB"])("rejects %s", (value) => {
    expect(keyPrefixSchema.safeParse(value).success).toBe(false);
  });
});

describe("slugSchema", () => {
  it.each(["acme", "acme-inc", "team42"])("accepts %s", (value) => {
    expect(slugSchema.safeParse(value).success).toBe(true);
  });

  it.each(["Acme", "-acme", "a", "acme--inc", "acme_inc"])("rejects %s", (value) => {
    expect(slugSchema.safeParse(value).success).toBe(false);
  });
});

describe("createTaskInputSchema", () => {
  it("trims the title and fills defaults", () => {
    expect(
      createTaskInputSchema.parse({ boardId: "b1", columnId: "c1", title: "  Fix login  " }),
    ).toEqual({
      boardId: "b1",
      columnId: "c1",
      title: "Fix login",
      description: "",
      priority: "none",
      assignee: null,
      labelIds: [],
      dueDate: null,
      parentId: null,
    });
  });

  it("rejects a blank title", () => {
    expect(
      createTaskInputSchema.safeParse({ boardId: "b1", columnId: "c1", title: "   " }).success,
    ).toBe(false);
  });

  it("rejects an unknown priority", () => {
    expect(
      createTaskInputSchema.safeParse({ boardId: "b1", columnId: "c1", title: "x", priority: "p0" })
        .success,
    ).toBe(false);
  });
});

describe("updateTaskInputSchema", () => {
  it("leaves unspecified fields out instead of defaulting them", () => {
    expect(updateTaskInputSchema.parse({})).toEqual({});
    expect(updateTaskInputSchema.parse({ priority: "high" })).toEqual({ priority: "high" });
  });
});

describe("assigneeSchema", () => {
  it("accepts users, agents and null", () => {
    expect(assigneeSchema.parse({ kind: "user", userId: "u1" })).toEqual({ kind: "user", userId: "u1" });
    expect(assigneeSchema.parse({ kind: "agent", agentId: "a1" })).toEqual({ kind: "agent", agentId: "a1" });
    expect(assigneeSchema.parse(null)).toBeNull();
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `pnpm test src/lib/domain/schemas.test.ts`
Expected: FAIL — `Failed to resolve import "./schemas"`.

- [ ] **Step 4: Implement** `src/lib/domain/schemas.ts`

```ts
import { z } from "zod";

export const ROLES = ["owner", "admin", "member"] as const;
export const PRIORITIES = ["none", "low", "medium", "high", "urgent"] as const;
export const PLANS = ["lite", "pro"] as const;

export const idSchema = z.string().min(1);
export const roleSchema = z.enum(ROLES);
export const prioritySchema = z.enum(PRIORITIES);
export const planSchema = z.enum(PLANS);

export const slugSchema = z
  .string()
  .min(2)
  .max(40)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and single dashes");

export const keyPrefixSchema = z
  .string()
  .regex(/^[A-Z][A-Z0-9]{1,4}$/, "Use 2–5 uppercase letters or digits, starting with a letter");

const timestampSchema = z.iso.datetime();

export const userSchema = z.object({
  id: idSchema,
  email: z.email(),
  name: z.string().trim().min(1).max(80),
  avatarUrl: z.url().nullable(),
  createdAt: timestampSchema,
});

export const teamSchema = z.object({
  id: idSchema,
  name: z.string().trim().min(1).max(60),
  slug: slugSchema,
  plan: planSchema,
  createdAt: timestampSchema,
});

export const membershipSchema = z.object({
  teamId: idSchema,
  userId: idSchema,
  role: roleSchema,
  joinedAt: timestampSchema,
});

export const workspaceSchema = z.object({
  id: idSchema,
  teamId: idSchema,
  name: z.string().trim().min(1).max(60),
  keyPrefix: keyPrefixSchema,
  nextTaskNumber: z.number().int().positive(),
  createdAt: timestampSchema,
});

export const boardSchema = z.object({
  id: idSchema,
  workspaceId: idSchema,
  name: z.string().trim().min(1).max(60),
  description: z.string().max(500).nullable(),
  createdAt: timestampSchema,
});

export const columnSchema = z.object({
  id: idSchema,
  boardId: idSchema,
  name: z.string().trim().min(1).max(40),
  position: z.string().min(1),
});

export const assigneeSchema = z
  .discriminatedUnion("kind", [
    z.object({ kind: z.literal("user"), userId: idSchema }),
    z.object({ kind: z.literal("agent"), agentId: idSchema }),
  ])
  .nullable();

export const taskSchema = z.object({
  id: idSchema,
  boardId: idSchema,
  columnId: idSchema,
  number: z.number().int().positive(),
  key: z.string().min(1),
  title: z.string().trim().min(1).max(200),
  description: z.string().max(20_000),
  priority: prioritySchema,
  assignee: assigneeSchema,
  labelIds: z.array(idSchema),
  dueDate: z.iso.date().nullable(),
  position: z.string().min(1),
  parentId: idSchema.nullable(),
  createdBy: idSchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const createTeamInputSchema = teamSchema.pick({ name: true, slug: true });

export const createWorkspaceInputSchema = workspaceSchema.pick({
  teamId: true,
  name: true,
  keyPrefix: true,
});

export const createBoardInputSchema = boardSchema
  .pick({ workspaceId: true, name: true })
  .extend({ description: z.string().max(500).nullable().default(null) });

export const createTaskInputSchema = z.object({
  boardId: idSchema,
  columnId: idSchema,
  title: taskSchema.shape.title,
  description: taskSchema.shape.description.default(""),
  priority: prioritySchema.default("none"),
  assignee: assigneeSchema.default(null),
  labelIds: z.array(idSchema).default([]),
  dueDate: taskSchema.shape.dueDate.default(null),
  parentId: taskSchema.shape.parentId.default(null),
});

// No defaults here: an update only touches the fields it names.
export const updateTaskInputSchema = taskSchema
  .pick({
    title: true,
    description: true,
    priority: true,
    assignee: true,
    labelIds: true,
    dueDate: true,
    parentId: true,
  })
  .partial();

export type Role = z.infer<typeof roleSchema>;
export type Priority = z.infer<typeof prioritySchema>;
export type Plan = z.infer<typeof planSchema>;
export type User = z.infer<typeof userSchema>;
export type Team = z.infer<typeof teamSchema>;
export type Membership = z.infer<typeof membershipSchema>;
export type Workspace = z.infer<typeof workspaceSchema>;
export type Board = z.infer<typeof boardSchema>;
export type Column = z.infer<typeof columnSchema>;
export type Assignee = z.infer<typeof assigneeSchema>;
export type Task = z.infer<typeof taskSchema>;
export type CreateTeamInput = z.infer<typeof createTeamInputSchema>;
export type CreateWorkspaceInput = z.infer<typeof createWorkspaceInputSchema>;
export type CreateBoardInput = z.infer<typeof createBoardInputSchema>;
export type CreateTaskInput = z.infer<typeof createTaskInputSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskInputSchema>;
```

- [ ] **Step 5: Create** `src/lib/domain/constants.ts`

```ts
// Columns seeded on every new board (PRD §5.1).
export const DEFAULT_COLUMNS = ["Backlog", "Todo", "In Progress", "In Review", "Done"] as const;
```

- [ ] **Step 6: Create** `src/lib/domain/index.ts`

```ts
export * from "./constants";
export * from "./schemas";
export * from "./task-key";
```

- [ ] **Step 7: Run tests, lint, typecheck**

Run: `pnpm test && pnpm lint && pnpm typecheck`
Expected: all pass.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(domain): add Zod schemas and types for core entities"
```

---

### Task 4: Repository interfaces + backend switch

**Files:**
- Create: `src/server/data/backend.ts`, `src/server/data/backend.test.ts`, `src/server/data/types.ts`

**Interfaces:**
- Consumes: types from `@/lib/domain` (Task 3).
- Produces: `type DataBackend = "mock" | "supabase"`, `resolveDataBackend(value: string | undefined): DataBackend`; interfaces `UsersRepo`, `TeamsRepo`, `MembershipsRepo`, `WorkspacesRepo`, `BoardsRepo`, `TasksRepo`, `Repositories`. M1 implements them in `src/server/data/mock/` and adds `getRepositories()`.

- [ ] **Step 1: Write the failing test** `src/server/data/backend.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { resolveDataBackend } from "./backend";

describe("resolveDataBackend", () => {
  it("defaults to mock when unset or empty", () => {
    expect(resolveDataBackend(undefined)).toBe("mock");
    expect(resolveDataBackend("")).toBe("mock");
  });

  it("accepts known backends", () => {
    expect(resolveDataBackend("mock")).toBe("mock");
    expect(resolveDataBackend("supabase")).toBe("supabase");
  });

  it("throws on anything else", () => {
    expect(() => resolveDataBackend("postgres")).toThrow(/Unknown DATA_BACKEND "postgres"/);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm test src/server/data`
Expected: FAIL — `Failed to resolve import "./backend"`.

- [ ] **Step 3: Implement** `src/server/data/backend.ts`

```ts
export type DataBackend = "mock" | "supabase";

export function resolveDataBackend(value: string | undefined): DataBackend {
  if (value === undefined || value === "") return "mock";
  if (value === "mock" || value === "supabase") return value;
  throw new Error(`Unknown DATA_BACKEND "${value}". Expected "mock" or "supabase".`);
}
```

- [ ] **Step 4: Create** `src/server/data/types.ts`

```ts
import type {
  Board,
  Column,
  CreateBoardInput,
  CreateTaskInput,
  CreateTeamInput,
  CreateWorkspaceInput,
  Membership,
  Role,
  Task,
  Team,
  UpdateTaskInput,
  User,
  Workspace,
} from "@/lib/domain";

// Every backend (mock in M1, Supabase in M4) implements these. UI and server
// actions depend only on this file, never on a concrete backend.

export interface UsersRepo {
  getById(id: string): Promise<User | null>;
  getByEmail(email: string): Promise<User | null>;
  create(input: { email: string; name: string }): Promise<User>;
}

export interface TeamsRepo {
  /** Creates the team and makes `ownerId` its owner. */
  create(input: CreateTeamInput & { ownerId: string }): Promise<Team>;
  getBySlug(slug: string): Promise<Team | null>;
  listForUser(userId: string): Promise<Team[]>;
}

export interface MembershipsRepo {
  list(teamId: string): Promise<Membership[]>;
  get(teamId: string, userId: string): Promise<Membership | null>;
  setRole(teamId: string, userId: string, role: Role): Promise<Membership>;
  remove(teamId: string, userId: string): Promise<void>;
}

export interface WorkspacesRepo {
  create(input: CreateWorkspaceInput): Promise<Workspace>;
  get(id: string): Promise<Workspace | null>;
  listForTeam(teamId: string): Promise<Workspace[]>;
}

export interface BoardsRepo {
  /** Creates the board and seeds DEFAULT_COLUMNS. */
  create(input: CreateBoardInput): Promise<Board>;
  get(id: string): Promise<Board | null>;
  listForWorkspace(workspaceId: string): Promise<Board[]>;
  listColumns(boardId: string): Promise<Column[]>;
}

export interface TasksRepo {
  /** Allocates the next task number for the board's workspace and places the task last in its column. */
  create(input: CreateTaskInput & { createdBy: string }): Promise<Task>;
  getByKey(workspaceId: string, key: string): Promise<Task | null>;
  listForBoard(boardId: string): Promise<Task[]>;
  update(id: string, patch: UpdateTaskInput): Promise<Task>;
  move(id: string, to: { columnId: string; position: string }): Promise<Task>;
}

export interface Repositories {
  users: UsersRepo;
  teams: TeamsRepo;
  memberships: MembershipsRepo;
  workspaces: WorkspacesRepo;
  boards: BoardsRepo;
  tasks: TasksRepo;
}
```

- [ ] **Step 5: Run tests, lint, typecheck**

Run: `pnpm test && pnpm lint && pnpm typecheck`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(data): define repository interfaces and backend switch"
```

---

### Task 5: shadcn/ui + dark-by-default theming

**Files:**
- Create: `components.json`, `src/lib/utils.ts`, `src/components/ui/*`, `src/components/theme/theme-provider.tsx`, `src/components/theme/theme-toggle.tsx`, `src/components/theme/theme-toggle.test.tsx`
- Modify: `src/app/globals.css` (by shadcn), `src/app/layout.tsx`, `src/hooks/use-mobile.ts` (replace), `package.json`

**Interfaces:**
- Produces: `<ThemeProvider>` (next-themes, `attribute="class"`, `defaultTheme="dark"`) and `<ThemeToggle />` (button, accessible name **"Toggle theme"**). shadcn `@/components/ui/*` components used by Task 7.

- [ ] **Step 1: Initialise shadcn** (non-interactive; gotcha 4)

```bash
pnpm dlx shadcn@4.21.0 init -t next -b radix -p nova -y --no-monorepo
pnpm dlx shadcn@4.21.0 add sidebar sonner command dropdown-menu tooltip separator dialog sheet input avatar badge -y
pnpm remove cn
```
Expected: `components.json` has `"style": "radix-nova"`; `src/components/ui/` contains the listed components; `next-themes` is in dependencies.

- [ ] **Step 2: Replace** `src/hooks/use-mobile.ts` (gotcha 5)

```ts
import * as React from "react"

const MOBILE_QUERY = "(max-width: 767px)"

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(MOBILE_QUERY)
  mql.addEventListener("change", onChange)
  return () => mql.removeEventListener("change", onChange)
}

export function useIsMobile() {
  return React.useSyncExternalStore(
    subscribe,
    () => window.matchMedia(MOBILE_QUERY).matches,
    () => false
  )
}
```

- [ ] **Step 3: Write the failing test** `src/components/theme/theme-toggle.test.tsx`

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeToggle } from "./theme-toggle";

const mocks = vi.hoisted(() => ({
  setTheme: vi.fn(),
  resolvedTheme: "dark" as string | undefined,
}));

vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: mocks.resolvedTheme, setTheme: mocks.setTheme }),
}));

describe("ThemeToggle", () => {
  beforeEach(() => mocks.setTheme.mockReset());

  it("switches dark to light", () => {
    mocks.resolvedTheme = "dark";
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole("button", { name: "Toggle theme" }));
    expect(mocks.setTheme).toHaveBeenCalledWith("light");
  });

  it("switches light to dark", () => {
    mocks.resolvedTheme = "light";
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole("button", { name: "Toggle theme" }));
    expect(mocks.setTheme).toHaveBeenCalledWith("dark");
  });
});
```

- [ ] **Step 4: Run it to verify it fails**

Run: `pnpm test src/components/theme`
Expected: FAIL — `Failed to resolve import "./theme-toggle"`.

- [ ] **Step 5: Implement** `src/components/theme/theme-toggle.tsx`

```tsx
"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle theme"
      onClick={() => setTheme(resolvedTheme === "light" ? "dark" : "light")}
    >
      <Sun className="hidden size-4 dark:block" />
      <Moon className="size-4 dark:hidden" />
    </Button>
  );
}
```
(Icons switch via the `dark:` variant, not `resolvedTheme`, so server and client render the same markup.)

- [ ] **Step 6: Implement** `src/components/theme/theme-provider.tsx`

```tsx
"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
```

- [ ] **Step 7: Replace** `src/app/layout.tsx`

```tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "TrackaAI", template: "%s · TrackaAI" },
  description: "Project management for teams, with AI agents.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <ThemeProvider>
          <TooltipProvider>{children}</TooltipProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 8: Verify**

Run: `pnpm test && pnpm lint && pnpm typecheck && pnpm build`
Expected: all pass. `pnpm dev` → http://localhost:3000 renders with a dark background.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat(ui): add shadcn/ui with dark-by-default theme and toggle"
```

---

### Task 6: Session gate — `proxy.ts` + dev sign-in

**Files:**
- Create: `src/lib/auth/routes.ts`, `src/lib/auth/routes.test.ts`, `src/proxy.ts`, `src/server/auth/actions.ts`, `src/app/sign-in/page.tsx`

**Interfaces:**
- Produces: `SESSION_COOKIE = "tracka_session"`, `SIGN_IN_PATH = "/sign-in"`, `isPublicPath(pathname: string): boolean`, `signInRedirectPath(pathname: string, search: string): string`, `safeNextPath(next: string | null | undefined): string`; server actions `devSignIn(formData: FormData)` and `signOut()`. M1 replaces `devSignIn` with real mock auth; M4 swaps the cookie check for `@supabase/ssr`.

- [ ] **Step 1: Write the failing test** `src/lib/auth/routes.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { isPublicPath, safeNextPath, signInRedirectPath } from "./routes";

describe("isPublicPath", () => {
  it("treats sign-in and its sub-paths as public", () => {
    expect(isPublicPath("/sign-in")).toBe(true);
    expect(isPublicPath("/sign-in/magic")).toBe(true);
  });

  it("treats everything else as protected", () => {
    expect(isPublicPath("/")).toBe(false);
    expect(isPublicPath("/sign-inx")).toBe(false);
    expect(isPublicPath("/acme/board")).toBe(false);
  });
});

describe("signInRedirectPath", () => {
  it("omits next for the home page", () => {
    expect(signInRedirectPath("/", "")).toBe("/sign-in");
  });

  it("encodes the original path and query as next", () => {
    expect(signInRedirectPath("/acme/board", "?task=ENG-1")).toBe(
      "/sign-in?next=%2Facme%2Fboard%3Ftask%3DENG-1",
    );
  });
});

describe("safeNextPath", () => {
  it("keeps same-origin relative paths", () => {
    expect(safeNextPath("/acme/board?task=ENG-1")).toBe("/acme/board?task=ENG-1");
  });

  it.each([null, undefined, "", "https://evil.test", "//evil.test", "/\\evil.test", "acme"])(
    "falls back to / for %s",
    (value) => {
      expect(safeNextPath(value)).toBe("/");
    },
  );
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm test src/lib/auth`
Expected: FAIL — `Failed to resolve import "./routes"`.

- [ ] **Step 3: Implement** `src/lib/auth/routes.ts`

```ts
export const SESSION_COOKIE = "tracka_session";
export const SIGN_IN_PATH = "/sign-in";

const PUBLIC_PATHS = [SIGN_IN_PATH];

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export function signInRedirectPath(pathname: string, search: string): string {
  const next = `${pathname}${search}`;
  return next === "/" ? SIGN_IN_PATH : `${SIGN_IN_PATH}?next=${encodeURIComponent(next)}`;
}

// Only allow same-origin relative paths, so ?next= can't be used as an open redirect.
export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return "/";
  }
  return next;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm test src/lib/auth`
Expected: PASS (12 tests).

- [ ] **Step 5: Create** `src/proxy.ts`

```ts
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, isPublicPath, signInRedirectPath } from "@/lib/auth/routes";

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSession = request.cookies.has(SESSION_COOKIE);

  if (!hasSession && !isPublicPath(pathname)) {
    return NextResponse.redirect(new URL(signInRedirectPath(pathname, search), request.url));
  }
  if (hasSession && isPublicPath(pathname)) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
```

- [ ] **Step 6: Create** `src/server/auth/actions.ts`

```ts
"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, SIGN_IN_PATH, safeNextPath } from "@/lib/auth/routes";

// M0 stub: any visitor becomes "dev-user". Replaced by mock auth in M1 and Supabase Auth in M4.
export async function devSignIn(formData: FormData) {
  const store = await cookies();
  store.set(SESSION_COOKIE, "dev-user", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
  });
  redirect(safeNextPath(formData.get("next")?.toString()));
}

export async function signOut() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect(SIGN_IN_PATH);
}
```

- [ ] **Step 7: Create** `src/app/sign-in/page.tsx`

```tsx
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { devSignIn } from "@/server/auth/actions";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  const { next } = await searchParams;

  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <form action={devSignIn} className="bg-card w-full max-w-sm space-y-6 rounded-xl border p-8">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Sign in to TrackaAI</h1>
          <p className="text-muted-foreground text-sm">
            Development sign-in. Real accounts arrive in M1.
          </p>
        </div>
        <input type="hidden" name="next" value={typeof next === "string" ? next : "/"} />
        <Button type="submit" className="w-full">
          Continue as dev user
        </Button>
      </form>
    </main>
  );
}
```

- [ ] **Step 8: Verify**

Run: `pnpm test && pnpm lint && pnpm typecheck && pnpm build`
Expected: all pass; build output lists `ƒ Proxy (Middleware)` and `ƒ /sign-in`.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat(auth): gate routes in proxy.ts with a dev sign-in stub"
```

---

### Task 7: App shell — sidebar, header, ⌘K palette

**Files:**
- Create: `src/components/shell/nav-items.ts`, `src/components/shell/command-menu.tsx`, `src/components/shell/command-menu.test.tsx`, `src/components/shell/app-sidebar.tsx`, `src/components/shell/app-header.tsx`, `src/app/(app)/layout.tsx`, `src/app/(app)/page.tsx`
- Delete: `src/app/page.tsx` (moves into the `(app)` group)

**Interfaces:**
- Consumes: `ThemeToggle` (Task 5), `signOut` (Task 6), shadcn `sidebar`, `command`, `separator`.
- Produces: `type NavItem = { title: string; href: string; icon: LucideIcon }`, `NAV_ITEMS: NavItem[]` — later milestones append entries; sidebar and palette both read it. `<CommandMenu />` exposes a button named **"Search"**, input placeholder **"Type a command or search…"**, items **"Dark theme"** / **"Light theme"**.

- [ ] **Step 1: Create** `src/components/shell/nav-items.ts`

```ts
import { Inbox, type LucideIcon } from "lucide-react";

export type NavItem = { title: string; href: string; icon: LucideIcon };

// Milestones append entries here (workspaces in M2, members/settings in M3).
export const NAV_ITEMS: NavItem[] = [{ title: "My tasks", href: "/", icon: Inbox }];
```

- [ ] **Step 2: Write the failing test** `src/components/shell/command-menu.test.tsx`

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CommandMenu } from "./command-menu";

const mocks = vi.hoisted(() => ({ push: vi.fn(), setTheme: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("next-themes", () => ({ useTheme: () => ({ setTheme: mocks.setTheme }) }));

describe("CommandMenu", () => {
  beforeEach(() => {
    mocks.push.mockReset();
    mocks.setTheme.mockReset();
  });

  it("opens with Cmd+K", () => {
    render(<CommandMenu />);
    expect(screen.queryByPlaceholderText("Type a command or search…")).not.toBeInTheDocument();
    fireEvent.keyDown(document, { key: "k", metaKey: true });
    expect(screen.getByPlaceholderText("Type a command or search…")).toBeInTheDocument();
  });

  it("switches theme from the palette", () => {
    render(<CommandMenu />);
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    fireEvent.click(screen.getByText("Light theme"));
    expect(mocks.setTheme).toHaveBeenCalledWith("light");
  });

  it("navigates to a nav item", () => {
    render(<CommandMenu />);
    fireEvent.click(screen.getByRole("button", { name: /search/i }));
    fireEvent.click(screen.getByText("My tasks"));
    expect(mocks.push).toHaveBeenCalledWith("/");
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `pnpm test src/components/shell`
Expected: FAIL — `Failed to resolve import "./command-menu"`.

- [ ] **Step 4: Implement** `src/components/shell/command-menu.tsx` (note the `<Command>` wrapper — gotcha 6)

```tsx
"use client";

import { Moon, Search, Sun } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { NAV_ITEMS } from "./nav-items";

export function CommandMenu() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { setTheme } = useTheme();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((value) => !value);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  function run(action: () => void) {
    setOpen(false);
    action();
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="text-muted-foreground gap-2"
        onClick={() => setOpen(true)}
      >
        <Search className="size-4" />
        Search
        <kbd className="bg-muted rounded px-1.5 font-mono text-[10px]">⌘K</kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <Command>
          <CommandInput placeholder="Type a command or search…" />
          <CommandList>
            <CommandEmpty>No results.</CommandEmpty>
            <CommandGroup heading="Navigation">
              {NAV_ITEMS.map((item) => (
                <CommandItem key={item.href} onSelect={() => run(() => router.push(item.href))}>
                  <item.icon />
                  {item.title}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="Theme">
              <CommandItem onSelect={() => run(() => setTheme("dark"))}>
                <Moon />
                Dark theme
              </CommandItem>
              <CommandItem onSelect={() => run(() => setTheme("light"))}>
                <Sun />
                Light theme
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm test src/components/shell`
Expected: PASS (3 tests).

- [ ] **Step 6: Create** `src/components/shell/app-sidebar.tsx`

```tsx
import { LogOut } from "lucide-react";
import Link from "next/link";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { signOut } from "@/server/auth/actions";
import { NAV_ITEMS } from "./nav-items";

export function AppSidebar() {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <span className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-md text-sm font-bold">
                  T
                </span>
                <span className="font-semibold">TrackaAI</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Workspaces</SidebarGroupLabel>
          <SidebarGroupContent>
            <p className="text-muted-foreground px-2 text-xs group-data-[collapsible=icon]:hidden">
              No workspaces yet
            </p>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <form action={signOut}>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton type="submit" tooltip="Sign out">
                <LogOut />
                <span>Sign out</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </form>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
```

- [ ] **Step 7: Create** `src/components/shell/app-header.tsx`

```tsx
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { CommandMenu } from "./command-menu";

export function AppHeader() {
  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b px-3">
      <SidebarTrigger />
      <Separator orientation="vertical" className="mx-1 h-4" />
      <div className="ml-auto flex items-center gap-1">
        <CommandMenu />
        <ThemeToggle />
      </div>
    </header>
  );
}
```

- [ ] **Step 8: Move the home page into the `(app)` group**

```bash
git rm src/app/page.tsx
mkdir -p "src/app/(app)"
```

Create `src/app/(app)/layout.tsx`:

```tsx
import { AppHeader } from "@/components/shell/app-header";
import { AppSidebar } from "@/components/shell/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <AppHeader />
        <div className="flex flex-1 flex-col p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
```

Create `src/app/(app)/page.tsx`:

```tsx
import type { Metadata } from "next";

export const metadata: Metadata = { title: "My tasks" };

export default function HomePage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
      <h1 className="text-2xl font-semibold">My tasks</h1>
      <p className="text-muted-foreground max-w-sm text-sm">
        Nothing here yet. Teams, workspaces and boards arrive in the next milestones.
      </p>
    </div>
  );
}
```

- [ ] **Step 9: Verify**

Run: `rm -rf .next && pnpm test && pnpm lint && pnpm typecheck && pnpm build`
Expected: all pass (51 unit tests total). Manual: `pnpm dev`, open http://localhost:3000 → redirected to `/sign-in` → "Continue as dev user" → dark shell with sidebar; ⌘K opens palette; toggle switches to light; sidebar collapses to icons.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat(shell): add sidebar, header and command palette"
```

---

### Task 8: Playwright smoke tests

**Files:**
- Create: `playwright.config.ts`, `e2e/shell.spec.ts`
- Modify: `package.json` (script)

**Interfaces:**
- Consumes: accessible names from Tasks 5–7 ("Continue as dev user", "Toggle theme", "Sign out", heading "My tasks", placeholder "Type a command or search…").
- Produces: `pnpm test:e2e`, reused by CI (Task 9) and extended in every later milestone.

- [ ] **Step 1: Install**

```bash
pnpm add -D @playwright/test@^1.63
pnpm exec playwright install chromium
```
Add script: `"test:e2e": "playwright test"`.

- [ ] **Step 2: Create** `playwright.config.ts`

```ts
import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `pnpm build && pnpm start --port ${PORT}`,
    url: `http://localhost:${PORT}/sign-in`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
```

- [ ] **Step 3: Create** `e2e/shell.spec.ts`

```ts
import { expect, test, type Page } from "@playwright/test";

async function signIn(page: Page) {
  await page.goto("/sign-in");
  await page.getByRole("button", { name: "Continue as dev user" }).click();
  await expect(page.getByRole("heading", { name: "My tasks" })).toBeVisible();
}

test("signed-out visitors are sent to sign-in and back to where they were going", async ({ page }) => {
  await page.goto("/somewhere?x=1");
  await expect(page).toHaveURL(/\/sign-in\?next=%2Fsomewhere%3Fx%3D1$/);
  await page.getByRole("button", { name: "Continue as dev user" }).click();
  await expect(page).toHaveURL(/\/somewhere\?x=1$/);
});

test("app is dark by default and the toggle switches to light and persists", async ({ page }) => {
  await signIn(page);
  const html = page.locator("html");
  await expect(html).toHaveClass(/\bdark\b/);
  await page.getByRole("button", { name: "Toggle theme" }).click();
  await expect(html).not.toHaveClass(/\bdark\b/);
  await page.reload();
  await expect(html).not.toHaveClass(/\bdark\b/);
});

test("command palette opens with the keyboard", async ({ page }) => {
  await signIn(page);
  await page.keyboard.press("ControlOrMeta+k");
  await expect(page.getByPlaceholder("Type a command or search…")).toBeVisible();
});

test("sign out returns to sign-in", async ({ page }) => {
  await signIn(page);
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
});
```

- [ ] **Step 4: Run**

Run: `pnpm test:e2e`
Expected: `4 passed`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "test(e2e): add Playwright smoke tests for the app shell"
```

---

### Task 9: CI, env template, docs, publish

**Files:**
- Create: `.github/workflows/ci.yml`, `.env.example`
- Modify: `README.md`, `docs/build-plan.md` (status table)

- [ ] **Step 1: Create** `.github/workflows/ci.yml`

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test
      - run: pnpm exec playwright install --with-deps chromium
      - run: pnpm test:e2e
```
(`pnpm/action-setup` reads the pnpm version from `packageManager` in `package.json`.)

- [ ] **Step 2: Create** `.env.example`

```bash
# Data backend: "mock" (default, M0–M3) or "supabase" (M4+)
DATA_BACKEND=mock
```

- [ ] **Step 3: Replace** `README.md`

````markdown
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

Checks: `pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e`
````

- [ ] **Step 4: Mark M0 done** in this file's status table (`✅ Done`).

- [ ] **Step 5: Full verification**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e`
Expected: everything green.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "ci: add GitHub Actions checks, env template and README"
```

- [ ] **Step 7: Publish — only after the user says yes**

```bash
git push -u origin main
```
Then confirm the CI run is green on GitHub.

---

## M0 Definition of Done

- `pnpm dev` → sign-in → dark themed shell with collapsible sidebar, ⌘K palette, working light/dark toggle, sign-out.
- `src/proxy.ts` gates every non-public route; `?next=` is open-redirect-safe.
- Domain schemas/types and repository interfaces exist and are unit-tested where they have logic.
- 51 unit tests + 4 e2e tests green locally and in CI.

## Next up: M1

Planned here once M0 is merged: mock backend implementing `Repositories` (JSON file at `.data/mock-db.json`), `getRepositories()` using `resolveDataBackend(process.env.DATA_BACKEND)`, real mock sign-up/sign-in replacing `devSignIn`, and the onboarding wizard (team → workspace → invite → seeded board).
