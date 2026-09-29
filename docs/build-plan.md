# TrackaAI Build Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** [`docs/prd.md`](./prd.md) · **Roadmap:** [`docs/plan.md`](./plan.md)

This file holds the detailed, task-level plan for the **current** milestone. Each later milestone (M1–M10 in `plan.md`) is appended here as a new section right before work on it starts, so it can build on the real code from the previous one.

| Milestone | Status |
|---|---|
| M0 — Foundation | ✅ Done |
| **M1 — Mock data layer + onboarding** | 📝 Planned (below) — awaiting review |
| M2 — Workspaces, boards & Kanban | Planned when M1 is merged |
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
4. `shadcn init` prompts for a preset unless given `-p nova`. Since late Sept 2026 the registry also emits `src/lib/utils.ts` as `export { cn } from "cn"` and imports `"cn"` directly in `ui/*` → after `pnpm remove cn`, write the classic `cn()` (`clsx` + `tailwind-merge`) in `src/lib/utils.ts` and rewrite `from "cn"` to `from "@/lib/utils"`. Repeat the rewrite after every `shadcn add`.
5. shadcn's generated `src/hooks/use-mobile.ts` fails Next 16's `react-hooks/set-state-in-effect` lint rule → replace it (Task 5).
6. In this shadcn version `CommandDialog` does **not** wrap children in `<Command>` → wrap them yourself or cmdk crashes.
7. The shadcn `Sidebar` tooltips need a `TooltipProvider` at the root, or prerendering fails.
8. `tsc --noEmit` needs Next's generated route types (`PageProps<"/sign-in">`) → `typecheck` runs `next typegen` first.
9. Vitest: use `globals: true` (Testing Library auto-cleanup) **and** import `describe/it/expect` from `"vitest"` explicitly (so `tsc` is happy). cmdk needs `ResizeObserver` and `scrollIntoView` stubs in jsdom.
10. `shadcn init` writes `--font-sans: var(--font-sans)` (a self-reference → serif fallback) in `globals.css` → point `--font-sans` and `--font-heading` at `var(--font-geist-sans)`.
11. The nova `Separator` is `data-vertical:self-stretch`; with a fixed height it pins to the top of the header → use `data-vertical:h-4 data-vertical:self-center`.

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
pnpm add clsx tailwind-merge
grep -rl 'from "cn"' src | xargs sed -i '' 's#from "cn"#from "@/lib/utils"#'
```
Then make `src/lib/utils.ts` the classic `cn()` (`twMerge(clsx(inputs))`) — see gotcha 4.
Expected: `components.json` has `"style": "radix-nova"`; `src/components/ui/` contains the listed components; `next-themes` is in dependencies.

- [ ] **Step 1b: Fix the font tokens** (gotcha 10) — in `src/app/globals.css` set `--font-sans: var(--font-geist-sans);` and `--font-heading: var(--font-geist-sans);`.

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
      <Separator orientation="vertical" className="mx-1 data-vertical:h-4 data-vertical:self-center" />
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

---

# M1 — Mock data layer + onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A new visitor can sign up, create a team → first workspace → (optionally) invite teammates, and land on a seeded board with the five default columns — all on a JSON-file mock backend behind the M0 repository interfaces. Real sign-in replaces the dev stub; the shell becomes team-scoped (`/[team]`) with a team switcher and a workspace → board tree.

**Architecture:** `getRepositories()` (`src/server/data/index.ts`) returns the mock backend: repositories over a `MockStore` that serialises every read/write of `.data/mock-db.json` through one queue and seeds a demo account when the file is missing. Auth is part of the repository contract (`AuthRepo`) so M4 can swap in Supabase Auth; mock sessions are HMAC-signed cookies (`session-token.ts`) verified by `requireUser()`. `proxy.ts` stays an optimistic cookie check. Server Actions (`src/server/actions/*`) validate with Zod from `@/lib/domain`, check roles via `src/server/auth/permissions.ts`, and return `FormState` for `useActionState` forms built from shadcn `Field` components.

**Routes after M1:** `/` (redirects to first team or onboarding) · `/sign-in` · `/sign-up` · `/sign-out` (clears stale cookies) · `/onboarding` → `/onboarding/[team]/workspace` → `/onboarding/[team]/invite?board=…` · `/[team]` (My tasks) · `/[team]/board/[boardId]` (read-only board; Kanban is M2).

**New dependencies:** `fractional-indexing` (column/task positions), `server-only`, shadcn `field` `label` `card` (+ `clsx`/`tailwind-merge` from M0 gotcha 4).

## Global Constraints

- Everything in M0's Global Constraints still applies (Next 16 `proxy.ts`, dark default, shadcn first, data access only via `src/server/data`, `pnpm lint && pnpm typecheck && pnpm test` before every commit, commit trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`).
- Work on a branch: `git switch -c m1-mock-data-onboarding` from an up-to-date `main`; finish with a PR (CLAUDE.md: one branch + PR per milestone).
- Data only through `getRepositories()`; nothing imports `src/server/data/mock/*` except `src/server/data/index.ts`, the seed, and tests — and the sign-in page, which reads `DEMO_USER` for the mock-mode hint.
- `"use server"` modules export only async functions → shared form types/helpers live in `src/lib/forms.ts`.
- The e2e suite (M0's 4 tests) is rewritten in Task 10; between Tasks 7 and 10 only unit tests, lint, typecheck and build are expected to pass.

## Verified gotchas (found while dry-running this plan)

1. `shadcn add field …` stops at an interactive "overwrite separator.tsx?" prompt (a `field` dependency) → pass `--overwrite`, then `pnpm remove cn` and rewrite `from "cn"` imports again (M0 gotcha 4). The overwrite leaves `separator.tsx` byte-identical after the rewrite.
2. `path.resolve(process.env.MOCK_DB_PATH …)` makes Turbopack trace the whole project (build warning) → start the call with `/* turbopackIgnore: true */ process.cwd()`.
3. `SidebarInset` is a flex item with `min-width: auto`, so the wide board pushes the header's Search/theme buttons off-screen → give it `className="min-w-0"`.
4. A signed cookie whose user no longer exists (reset `.data/`) would loop `/` ↔ `/sign-in`, because the proxy bounces cookie holders away from public pages → `requireUser()` redirects to `/sign-out`, an *open* path (proxy lets it through) whose route handler deletes the cookie. Covered by an e2e test.
5. React 19 resets `<form action>` forms after every submit; echo submitted values back in `FormState.values` and use them as `defaultValue`. Controlled inputs (team name → slug) survive the reset — covered by the "reserved team URLs" e2e test.
6. Playwright `getByLabel` matches substrings ("Email" also hits "Email addresses") → use `{ exact: true }`.
7. `slugSchema` rejects `RESERVED_SLUGS` because `/[team]` sits at the root next to `/onboarding`, `/sign-in`, …; static routes win, so a team named "onboarding" would be unreachable.
8. `next start` renames its process to `next-server`, so `pkill -f "next start"` misses it; if you run a manual server on the e2e port, stop it by port (`lsof -ti :3100 | xargs kill`) or Playwright will reuse the stale build locally.

## File map (end of M1)

```
src/
  proxy.ts                                  + open paths (Task 6)
  app/
    page.tsx                                "/" → first team or /onboarding (Task 9)
    (auth)/layout.tsx, sign-in/page.tsx, sign-up/page.tsx   (Task 7)
    sign-out/route.ts                       clears stale session cookie (Task 7)
    onboarding/layout.tsx, page.tsx         step 1: team (Task 8)
    onboarding/[team]/workspace/page.tsx    step 2: workspace + default board (Task 8)
    onboarding/[team]/invite/page.tsx       step 3: invites, skippable (Task 8)
    [team]/layout.tsx                       team-scoped shell (Task 9)
    [team]/page.tsx                         My tasks (Task 9)
    [team]/board/[boardId]/page.tsx         read-only board (Task 9)
  components/
    ui/field.tsx, label.tsx, card.tsx       shadcn (Task 7)
    forms/fields.tsx                        TextField, FormError (Task 7)
    auth/sign-in-form.tsx, sign-up-form.tsx (Task 7)
    onboarding/*.tsx                        step card + 3 forms (Task 8)
    shell/team-switcher.tsx                 (Task 9)
    shell/app-sidebar.tsx, app-header.tsx, command-menu.tsx (+test), nav-items.ts   updated (Task 9)
  lib/
    domain/text.ts (+test)                  slugify, suggestKeyPrefix, parseEmailList (Task 1)
    domain/schemas.ts, constants.ts         + auth/invite schemas, reserved slugs (Task 1)
    auth/routes.ts (+test)                  + sign-up / sign-out paths (Task 6)
    forms.ts                                FormState, formValues (Task 7)
    paths.ts                                URL builders (Task 7)
  server/
    actions/auth.ts                         signUp/signIn/signOut actions (Task 7)
    actions/onboarding.ts                   team/workspace/invite actions (Task 8)
    auth/session-token.ts (+test)           HMAC session tokens (Task 2)
    auth/session.ts                         start/end session, requireUser (Task 7)
    auth/guards.ts                          requireTeamMember (Task 7)
    auth/permissions.ts (+test)             can / assertCan (Task 6)
    data/errors.ts                          NotFoundError, ConflictError (Task 4)
    data/types.ts                           + AuthRepo, InvitesRepo (Task 4)
    data/index.ts                           getRepositories() (Task 5)
    data/mock/db.ts, store.ts (+test)       JSON-file store (Task 3)
    data/mock/password.ts (+test)           scrypt hashing (Task 2)
    data/mock/repositories.ts (+test)       all repositories (Task 4)
    data/mock/seed.ts (+test)               demo account + board (Task 5)
e2e/helpers.ts, shell.spec.ts, auth.spec.ts, onboarding.spec.ts   (Task 10)
```

---

### Task 1: Domain — text helpers, reserved slugs, auth & invite schemas

**Files:**
- Create: `src/lib/domain/text.ts`, `src/lib/domain/text.test.ts`
- Modify: `src/lib/domain/constants.ts`, `src/lib/domain/schemas.ts`, `src/lib/domain/schemas.test.ts`, `src/lib/domain/index.ts`

**Interfaces:**
- Produces (from `@/lib/domain`): `slugify(name)`, `suggestKeyPrefix(name)`, `parseEmailList(text)`; `RESERVED_SLUGS`, `MAX_INVITES_PER_BATCH = 10`, `INVITE_TTL_DAYS = 7`; `emailSchema` (trims + lowercases), `passwordSchema` (8–72), `inviteSchema`, `signUpInputSchema`, `signInInputSchema`, `createInvitesInputSchema`; types `Invite`, `SignUpInput`, `SignInInput`, `CreateInvitesInput`. `slugSchema` now rejects reserved slugs (gotcha 7).

- [ ] **Step 1: Write the failing tests**

Create `src/lib/domain/text.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { parseEmailList, slugify, suggestKeyPrefix } from "./text";

describe("slugify", () => {
  it.each([
    ["Acme Inc.", "acme-inc"],
    ["  Crème Brûlée  ", "creme-brulee"],
    ["Team 42!!", "team-42"],
    ["---", ""],
  ])("turns %j into %j", (name, slug) => {
    expect(slugify(name)).toBe(slug);
  });

  it("caps the length at 40 without a trailing dash", () => {
    const slug = slugify(`${"a".repeat(39)} b`);
    expect(slug).toBe("a".repeat(39));
  });
});

describe("suggestKeyPrefix", () => {
  it.each([
    ["Engineering", "ENG"],
    ["Mobile App", "MA"],
    ["Design & Research", "DR"],
    ["Q3 launch plan", "QLP"],
    ["x", ""],
    ["", ""],
  ])("suggests %j → %j", (name, prefix) => {
    expect(suggestKeyPrefix(name)).toBe(prefix);
  });
});

describe("parseEmailList", () => {
  it("splits on commas, semicolons and whitespace, lowercases and dedupes", () => {
    expect(parseEmailList("Ann@Example.test, bob@example.test;\nann@example.test  ")).toEqual([
      "ann@example.test",
      "bob@example.test",
    ]);
  });

  it("returns an empty list for blank input", () => {
    expect(parseEmailList("  \n ")).toEqual([]);
  });
});
```

Replace `src/lib/domain/schemas.test.ts` (M0 tests plus reserved slugs, sign-up and invites):

```ts
import { describe, expect, it } from "vitest";
import {
  assigneeSchema,
  createInvitesInputSchema,
  createTaskInputSchema,
  keyPrefixSchema,
  signUpInputSchema,
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

describe("reserved slugs", () => {
  it.each(["onboarding", "sign-in", "api"])("rejects %s", (value) => {
    expect(slugSchema.safeParse(value).success).toBe(false);
  });
});

describe("signUpInputSchema", () => {
  it("normalises the email", () => {
    expect(
      signUpInputSchema.parse({ name: "Ada", email: "  Ada@Example.TEST ", password: "longenough" }),
    ).toEqual({ name: "Ada", email: "ada@example.test", password: "longenough" });
  });

  it("requires at least 8 password characters", () => {
    const result = signUpInputSchema.safeParse({ name: "Ada", email: "a@b.test", password: "short" });
    expect(result.success).toBe(false);
  });
});

describe("createInvitesInputSchema", () => {
  it("rejects an empty list and invalid emails", () => {
    expect(createInvitesInputSchema.safeParse({ teamId: "t1", emails: [] }).success).toBe(false);
    expect(createInvitesInputSchema.safeParse({ teamId: "t1", emails: ["nope"] }).success).toBe(false);
  });

  it("caps a batch at 10", () => {
    const emails = Array.from({ length: 11 }, (_, i) => `u${i}@example.test`);
    expect(createInvitesInputSchema.safeParse({ teamId: "t1", emails }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm test src/lib/domain`
Expected: FAIL — `Failed to resolve import "./text"`, and the new `schemas.test.ts` cases fail (`signUpInputSchema` is undefined / reserved slugs accepted).

- [ ] **Step 3: Implement**

Create `src/lib/domain/text.ts`:

```ts
const SLUG_MAX = 40;

export function slugify(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, SLUG_MAX)
    .replace(/^-+|-+$/g, "");
}

// "Engineering" → "ENG", "Mobile App" → "MA". Returns "" when nothing valid fits.
export function suggestKeyPrefix(name: string): string {
  const words = name.toUpperCase().match(/[A-Z0-9]+/g) ?? [];
  const raw = words.length > 1 ? words.map((word) => word[0]).join("") : (words[0] ?? "").slice(0, 3);
  const prefix = raw.replace(/^[0-9]+/, "").slice(0, 5);
  return prefix.length >= 2 ? prefix : "";
}

export function parseEmailList(text: string): string[] {
  const emails = text
    .split(/[\s,;]+/)
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  return [...new Set(emails)];
}
```

Replace `src/lib/domain/constants.ts`:

```ts
// Columns seeded on every new board (PRD §5.1).
export const DEFAULT_COLUMNS = ["Backlog", "Todo", "In Progress", "In Review", "Done"] as const;

// Top-level routes that a team slug (/[team]) must never shadow.
export const RESERVED_SLUGS: readonly string[] = [
  "api",
  "invite",
  "onboarding",
  "settings",
  "sign-in",
  "sign-out",
  "sign-up",
];

export const MAX_INVITES_PER_BATCH = 10;
export const INVITE_TTL_DAYS = 7;
```

Replace `src/lib/domain/schemas.ts`:

```ts
import { z } from "zod";
import { MAX_INVITES_PER_BATCH, RESERVED_SLUGS } from "./constants";

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
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and single dashes")
  .refine((slug) => !RESERVED_SLUGS.includes(slug), "This name is reserved");

export const keyPrefixSchema = z
  .string()
  .regex(/^[A-Z][A-Z0-9]{1,4}$/, "Use 2–5 uppercase letters or digits, starting with a letter");

const timestampSchema = z.iso.datetime();

// Trim and lowercase before checking the format, so " Ann@X.test " is valid.
export const emailSchema = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email"));
export const passwordSchema = z.string().min(8, "Use at least 8 characters").max(72);

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

export const inviteSchema = z.object({
  id: idSchema,
  teamId: idSchema,
  email: z.email(),
  role: roleSchema.exclude(["owner"]),
  token: z.string().min(16),
  invitedBy: idSchema,
  expiresAt: timestampSchema,
  acceptedAt: timestampSchema.nullable(),
  createdAt: timestampSchema,
});

export const signUpInputSchema = z.object({
  name: userSchema.shape.name,
  email: emailSchema,
  password: passwordSchema,
});

export const signInInputSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password"),
});

export const createInvitesInputSchema = z.object({
  teamId: idSchema,
  emails: z
    .array(emailSchema)
    .min(1, "Add at least one email")
    .max(MAX_INVITES_PER_BATCH, `Invite at most ${MAX_INVITES_PER_BATCH} people at a time`),
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
export type Invite = z.infer<typeof inviteSchema>;
export type SignUpInput = z.infer<typeof signUpInputSchema>;
export type SignInInput = z.infer<typeof signInInputSchema>;
export type CreateInvitesInput = z.infer<typeof createInvitesInputSchema>;
export type CreateTeamInput = z.infer<typeof createTeamInputSchema>;
export type CreateWorkspaceInput = z.infer<typeof createWorkspaceInputSchema>;
export type CreateBoardInput = z.infer<typeof createBoardInputSchema>;
export type CreateTaskInput = z.infer<typeof createTaskInputSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskInputSchema>;
```

Append to `src/lib/domain/index.ts`:

```ts
export * from "./text";
```

- [ ] **Step 4: Verify**

Run: `pnpm test && pnpm lint && pnpm typecheck`
Expected: 71 tests pass; lint and typecheck clean.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(domain): add auth, invite and onboarding helpers and schemas"
```

---

### Task 2: Password hashing + signed session tokens

**Files:**
- Create: `src/server/data/mock/password.ts` (+ `.test.ts`), `src/server/auth/session-token.ts` (+ `.test.ts`)

**Interfaces:**
- Produces: `hashPassword(pw): Promise<string>` / `verifyPassword(pw, stored): Promise<boolean>` (scrypt, `scrypt$salt$hash`; mock backend only). `SESSION_TTL_SECONDS` (30 days), `signSessionToken(userId, secret, now?)`, `verifySessionToken(token, secret, now?) → userId | null` (`<userId>.<expiresAt>.<hmac>`). Both are pure Node modules, so they are unit-tested without Next.

- [ ] **Step 1: Write the failing tests**

Create `src/server/data/mock/password.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password hashing", () => {
  it("verifies the right password and rejects a wrong one", async () => {
    const hash = await hashPassword("correct horse");
    expect(hash).toMatch(/^scrypt\$/);
    expect(await verifyPassword("correct horse", hash)).toBe(true);
    expect(await verifyPassword("wrong horse", hash)).toBe(false);
  });

  it("salts every hash", async () => {
    expect(await hashPassword("same")).not.toBe(await hashPassword("same"));
  });

  it("rejects malformed hashes", async () => {
    expect(await verifyPassword("x", "plain-text")).toBe(false);
  });
});
```

Create `src/server/auth/session-token.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { SESSION_TTL_SECONDS, signSessionToken, verifySessionToken } from "./session-token";

const SECRET = "test-secret";
const NOW = Date.UTC(2026, 0, 1);

describe("session tokens", () => {
  it("round-trips the user id", () => {
    const token = signSessionToken("user-1", SECRET, NOW);
    expect(verifySessionToken(token, SECRET, NOW)).toBe("user-1");
  });

  it("rejects a token signed with another secret", () => {
    const token = signSessionToken("user-1", "other", NOW);
    expect(verifySessionToken(token, SECRET, NOW)).toBeNull();
  });

  it("rejects a tampered user id", () => {
    const [, expiresAt, signature] = signSessionToken("user-1", SECRET, NOW).split(".");
    expect(verifySessionToken(`user-2.${expiresAt}.${signature}`, SECRET, NOW)).toBeNull();
  });

  it("rejects an expired token", () => {
    const token = signSessionToken("user-1", SECRET, NOW);
    expect(verifySessionToken(token, SECRET, NOW + SESSION_TTL_SECONDS * 1000)).toBeNull();
  });

  it.each(["", "garbage", "a.b", "a.b.c.d"])("rejects malformed token %j", (token) => {
    expect(verifySessionToken(token, SECRET, NOW)).toBeNull();
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm test src/server`
Expected: FAIL — `Failed to resolve import "./password"` and `"./session-token"`.

- [ ] **Step 3: Implement**

Create `src/server/data/mock/password.ts`:

```ts
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

// Mock backend only. Supabase Auth owns passwords from M4 on.
const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: Buffer,
  keyLength: number,
) => Promise<Buffer>;

const KEY_LENGTH = 32;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, KEY_LENGTH);
  return `scrypt$${salt.toString("base64url")}$${key.toString("base64url")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64url");
  const actual = await scrypt(password, Buffer.from(salt, "base64url"), expected.length);
  return timingSafeEqual(expected, actual);
}
```

Create `src/server/auth/session-token.ts`:

```ts
import { createHmac, timingSafeEqual } from "node:crypto";

// Mock-backend sessions: "<userId>.<expiresAt>.<hmac>". Supabase Auth replaces this in M4.
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function signSessionToken(userId: string, secret: string, now = Date.now()): string {
  const expiresAt = Math.floor(now / 1000) + SESSION_TTL_SECONDS;
  const payload = `${userId}.${expiresAt}`;
  return `${payload}.${sign(payload, secret)}`;
}

export function verifySessionToken(token: string, secret: string, now = Date.now()): string | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [userId, expiresAt, signature] = parts;
  const expected = Buffer.from(sign(`${userId}.${expiresAt}`, secret));
  const actual = Buffer.from(signature);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  if (Number(expiresAt) * 1000 <= now) return null;
  return userId;
}
```

- [ ] **Step 4: Verify**

Run: `pnpm test && pnpm lint && pnpm typecheck`
Expected: 82 tests pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(auth): add scrypt password hashing and signed session tokens"
```

---

### Task 3: Mock store — JSON file with a write queue

**Files:**
- Create: `src/server/data/mock/db.ts`, `src/server/data/mock/store.ts`, `src/server/data/mock/store.test.ts`
- Modify: `package.json` (deps)

**Interfaces:**
- Produces: `type MockDb` (one array per entity, mirrors the M4 tables), `emptyDb()`, `type MockStore = { read(fn), write(fn) }`, `createMemoryStore(initial)` (+ `snapshot()`; used by tests and the seed), `createFileStore(path, seed)` (seeds a missing file; serialises all operations; atomic tmp-file + rename writes; a throwing `write` persists nothing).

- [ ] **Step 1: Install deps used from here on**

```bash
pnpm add fractional-indexing server-only
```

- [ ] **Step 2: Write the failing test**

Create `src/server/data/mock/store.test.ts`:

```ts
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { emptyDb } from "./db";
import { createFileStore, createMemoryStore } from "./store";

const user = (id: string) => ({
  id,
  email: `${id}@example.test`,
  name: id,
  avatarUrl: null,
  createdAt: "2026-01-01T00:00:00.000Z",
});

describe("createMemoryStore", () => {
  it("keeps writes and discards them when the writer throws", async () => {
    const store = createMemoryStore(emptyDb());
    await store.write((db) => db.users.push(user("u1")));
    await expect(
      store.write((db) => {
        db.users.push(user("u2"));
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
    expect(await store.read((db) => db.users.map((u) => u.id))).toEqual(["u1"]);
  });
});

describe("createFileStore", () => {
  let dir: string;
  let file: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "tracka-store-"));
    file = join(dir, "nested", "db.json");
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("seeds a missing file and persists it", async () => {
    const store = createFileStore(file, () => ({ ...emptyDb(), users: [user("seed")] }));
    expect(await store.read((db) => db.users.length)).toBe(1);
    const onDisk = JSON.parse(await readFile(file, "utf8"));
    expect(onDisk.users[0].id).toBe("seed");
  });

  it("serialises concurrent writes so none are lost", async () => {
    const store = createFileStore(file, emptyDb);
    await Promise.all(
      Array.from({ length: 20 }, (_, i) => store.write((db) => db.users.push(user(`u${i}`)))),
    );
    const reopened = createFileStore(file, emptyDb);
    expect(await reopened.read((db) => db.users.length)).toBe(20);
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `pnpm test src/server/data/mock/store`
Expected: FAIL — `Failed to resolve import "./db"`.

- [ ] **Step 4: Implement**

Create `src/server/data/mock/db.ts`:

```ts
import type {
  Board,
  Column,
  Invite,
  Membership,
  Task,
  Team,
  User,
  Workspace,
} from "@/lib/domain";

// Shape of .data/mock-db.json. Mirrors the Supabase tables that arrive in M4.
export type MockDb = {
  version: 1;
  users: User[];
  credentials: { userId: string; passwordHash: string }[];
  teams: Team[];
  memberships: Membership[];
  workspaces: Workspace[];
  boards: Board[];
  columns: Column[];
  tasks: Task[];
  invites: Invite[];
};

export function emptyDb(): MockDb {
  return {
    version: 1,
    users: [],
    credentials: [],
    teams: [],
    memberships: [],
    workspaces: [],
    boards: [],
    columns: [],
    tasks: [],
    invites: [],
  };
}
```

Create `src/server/data/mock/store.ts`:

```ts
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { MockDb } from "./db";

/**
 * All mock-backend access goes through `read` / `write`. A `write` callback
 * mutates the db in place; if it throws, nothing is persisted.
 */
export type MockStore = {
  read<T>(fn: (db: MockDb) => T): Promise<T>;
  write<T>(fn: (db: MockDb) => T): Promise<T>;
};

export function createMemoryStore(initial: MockDb): MockStore & { snapshot(): MockDb } {
  let current = structuredClone(initial);
  return {
    async read(fn) {
      return fn(structuredClone(current));
    },
    async write(fn) {
      const draft = structuredClone(current);
      const result = fn(draft);
      current = draft;
      // Detach the result so callers can't mutate stored state by reference.
      return structuredClone(result);
    },
    snapshot: () => structuredClone(current),
  };
}

export function createFileStore(filePath: string, seed: () => MockDb | Promise<MockDb>): MockStore {
  // One queue per store: operations run strictly one after another, so
  // read-modify-write cycles never interleave.
  let queue: Promise<unknown> = Promise.resolve();

  function enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = queue.then(task, task);
    queue = run.catch(() => undefined);
    return run;
  }

  async function save(db: MockDb) {
    await mkdir(dirname(filePath), { recursive: true });
    const tmp = `${filePath}.${randomUUID()}.tmp`;
    await writeFile(tmp, JSON.stringify(db, null, 2));
    await rename(tmp, filePath);
  }

  async function load(): Promise<MockDb> {
    try {
      return JSON.parse(await readFile(filePath, "utf8")) as MockDb;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      const db = await seed();
      await save(db);
      return db;
    }
  }

  return {
    read: (fn) => enqueue(async () => fn(await load())),
    write: (fn) =>
      enqueue(async () => {
        const db = await load();
        const result = fn(db);
        await save(db);
        return result;
      }),
  };
}
```

- [ ] **Step 5: Verify**

Run: `pnpm test && pnpm lint && pnpm typecheck`
Expected: 85 tests pass.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(data): add JSON-file mock store with serialised writes"
```

---

### Task 4: Repository contract + mock repositories

**Files:**
- Create: `src/server/data/errors.ts`, `src/server/data/mock/repositories.ts`, `src/server/data/mock/repositories.test.ts`
- Modify: `src/server/data/types.ts`

**Interfaces:**
- Consumes: `MockStore` (Task 3), password helpers (Task 2), domain schemas (Task 1), `fractional-indexing`.
- Produces: `NotFoundError(entity, id)`, `ConflictError(field, message)` (`.field` maps to a form field). `Repositories` gains `auth: AuthRepo` (`signUp`, `signIn`) and `invites: InvitesRepo` (`create`, `listPending`); `UsersRepo.create` is removed (users are created by `auth.signUp`). `createMockRepositories(store): Repositories`. Rules: emails are stored lowercase; team slugs are globally unique; key prefixes are unique per team; `boards.create` seeds `DEFAULT_COLUMNS` with fractional positions; `tasks.create` takes `workspace.nextTaskNumber` and appends to the column; `move` / `create` reject a column from another board; invites skip current members and pending invites and expire after `INVITE_TTL_DAYS`.

- [ ] **Step 1: Write the failing test**

Create `src/server/data/mock/repositories.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_COLUMNS, createTaskInputSchema, type User } from "@/lib/domain";
import { ConflictError, NotFoundError } from "../errors";
import type { Repositories } from "../types";
import { emptyDb } from "./db";
import { createMockRepositories } from "./repositories";
import { createMemoryStore } from "./store";

let repos: Repositories;
let owner: User;

beforeEach(async () => {
  repos = createMockRepositories(createMemoryStore(emptyDb()));
  owner = await repos.auth.signUp({ name: "Owner", email: "owner@example.test", password: "password1" });
});

async function setupBoard() {
  const team = await repos.teams.create({ name: "Acme", slug: "acme", ownerId: owner.id });
  const workspace = await repos.workspaces.create({ teamId: team.id, name: "Eng", keyPrefix: "ENG" });
  const board = await repos.boards.create({ workspaceId: workspace.id, name: "Eng", description: null });
  const columns = await repos.boards.listColumns(board.id);
  return { team, workspace, board, columns };
}

function taskInput(boardId: string, columnId: string, title: string) {
  return { ...createTaskInputSchema.parse({ boardId, columnId, title }), createdBy: owner.id };
}

describe("auth", () => {
  it("signs in with the right password only", async () => {
    expect(await repos.auth.signIn({ email: "owner@example.test", password: "password1" })).toEqual(owner);
    expect(await repos.auth.signIn({ email: "owner@example.test", password: "nope" })).toBeNull();
    expect(await repos.auth.signIn({ email: "ghost@example.test", password: "password1" })).toBeNull();
  });

  it("rejects a duplicate email, case-insensitively", async () => {
    await expect(
      repos.auth.signUp({ name: "Dup", email: "OWNER@example.test", password: "password1" }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("exposes users by id and email", async () => {
    expect(await repos.users.getById(owner.id)).toEqual(owner);
    expect(await repos.users.getByEmail("Owner@Example.test")).toEqual(owner);
  });
});

describe("teams", () => {
  it("makes the creator the owner", async () => {
    const team = await repos.teams.create({ name: "Acme", slug: "acme", ownerId: owner.id });
    expect(team.plan).toBe("lite");
    expect(await repos.memberships.get(team.id, owner.id)).toMatchObject({ role: "owner" });
    expect(await repos.teams.listForUser(owner.id)).toEqual([team]);
    expect(await repos.teams.getBySlug("acme")).toEqual(team);
  });

  it("rejects a taken slug", async () => {
    await repos.teams.create({ name: "Acme", slug: "acme", ownerId: owner.id });
    const error = await repos.teams
      .create({ name: "Other", slug: "acme", ownerId: owner.id })
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ConflictError);
    expect((error as ConflictError).field).toBe("slug");
  });
});

describe("memberships", () => {
  it("changes roles and removes members", async () => {
    const { team } = await setupBoard();
    expect(await repos.memberships.setRole(team.id, owner.id, "admin")).toMatchObject({ role: "admin" });
    const stranger = await repos.auth.signUp({ name: "S", email: "s@example.test", password: "password1" });
    await expect(repos.memberships.setRole(team.id, stranger.id, "admin")).rejects.toBeInstanceOf(
      NotFoundError,
    );
    await repos.memberships.remove(team.id, owner.id);
    expect(await repos.memberships.list(team.id)).toEqual([]);
  });
});

describe("workspaces", () => {
  it("starts task numbering at 1 and rejects a duplicate prefix in the team", async () => {
    const { team, workspace } = await setupBoard();
    expect(workspace.nextTaskNumber).toBe(1);
    expect(await repos.workspaces.listForTeam(team.id)).toEqual([workspace]);
    await expect(
      repos.workspaces.create({ teamId: team.id, name: "Again", keyPrefix: "ENG" }),
    ).rejects.toBeInstanceOf(ConflictError);
  });
});

describe("boards", () => {
  it("seeds the default columns in order", async () => {
    const { board, columns } = await setupBoard();
    expect(columns.map((c) => c.name)).toEqual([...DEFAULT_COLUMNS]);
    expect(columns.every((c) => c.boardId === board.id)).toBe(true);
    const positions = columns.map((c) => c.position);
    expect([...positions].sort()).toEqual(positions);
  });

  it("fails for an unknown workspace", async () => {
    await expect(
      repos.boards.create({ workspaceId: "nope", name: "X", description: null }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("tasks", () => {
  it("allocates sequential keys per workspace and appends to the column", async () => {
    const { workspace, board, columns } = await setupBoard();
    const first = await repos.tasks.create(taskInput(board.id, columns[0].id, "One"));
    const second = await repos.tasks.create(taskInput(board.id, columns[0].id, "Two"));
    expect([first.key, second.key]).toEqual(["ENG-1", "ENG-2"]);
    expect(first.position < second.position).toBe(true);
    expect((await repos.workspaces.get(workspace.id))?.nextTaskNumber).toBe(3);
    expect((await repos.tasks.listForBoard(board.id)).map((t) => t.title)).toEqual(["One", "Two"]);
    expect(await repos.tasks.getByKey(workspace.id, "eng-2")).toEqual(second);
  });

  it("rejects a column from another board", async () => {
    const { workspace, board } = await setupBoard();
    const other = await repos.boards.create({ workspaceId: workspace.id, name: "Other", description: null });
    const [otherColumn] = await repos.boards.listColumns(other.id);
    await expect(repos.tasks.create(taskInput(board.id, otherColumn.id, "X"))).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("updates fields and moves between columns", async () => {
    const { board, columns } = await setupBoard();
    const task = await repos.tasks.create(taskInput(board.id, columns[0].id, "One"));
    const updated = await repos.tasks.update(task.id, { priority: "high" });
    expect(updated).toMatchObject({ priority: "high", title: "One" });
    const moved = await repos.tasks.move(task.id, { columnId: columns[2].id, position: "a5" });
    expect(moved).toMatchObject({ columnId: columns[2].id, position: "a5" });
  });
});

describe("invites", () => {
  it("creates pending invites with a token and 7-day expiry, skipping duplicates and members", async () => {
    const { team } = await setupBoard();
    const created = await repos.invites.create({
      teamId: team.id,
      emails: ["a@example.test", "owner@example.test"],
      invitedBy: owner.id,
    });
    expect(created.map((i) => i.email)).toEqual(["a@example.test"]);
    const [invite] = created;
    expect(invite.role).toBe("member");
    expect(invite.token.length).toBeGreaterThanOrEqual(16);
    const days = (Date.parse(invite.expiresAt) - Date.parse(invite.createdAt)) / 86_400_000;
    expect(days).toBe(7);

    const again = await repos.invites.create({ teamId: team.id, emails: ["a@example.test"], invitedBy: owner.id });
    expect(again).toEqual([]);
    expect(await repos.invites.listPending(team.id)).toEqual([invite]);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm test src/server/data/mock/repositories`
Expected: FAIL — `Failed to resolve import "../errors"`.

- [ ] **Step 3: Implement**

Create `src/server/data/errors.ts`:

```ts
// Backend-agnostic errors. Server actions map them to form errors / 404s.

export class NotFoundError extends Error {
  constructor(entity: string, id: string) {
    super(`${entity} ${id} not found`);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends Error {
  /** The input field the conflict belongs to, e.g. "slug" or "email". */
  readonly field: string;

  constructor(field: string, message: string) {
    super(message);
    this.name = "ConflictError";
    this.field = field;
  }
}
```

Replace `src/server/data/types.ts`:

```ts
import type {
  Board,
  Column,
  CreateBoardInput,
  CreateInvitesInput,
  CreateTaskInput,
  CreateTeamInput,
  CreateWorkspaceInput,
  Invite,
  Membership,
  Role,
  SignInInput,
  SignUpInput,
  Task,
  Team,
  UpdateTaskInput,
  User,
  Workspace,
} from "@/lib/domain";

// Every backend (mock in M1, Supabase in M4) implements these. UI and server
// actions depend only on this file, never on a concrete backend.
// Methods throw NotFoundError / ConflictError from ./errors.

export interface AuthRepo {
  /** Creates the user and their credentials. Throws ConflictError("email") if taken. */
  signUp(input: SignUpInput): Promise<User>;
  /** Returns the user, or null for an unknown email or wrong password. */
  signIn(input: SignInInput): Promise<User | null>;
}

export interface UsersRepo {
  getById(id: string): Promise<User | null>;
  getByEmail(email: string): Promise<User | null>;
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

export interface InvitesRepo {
  /** Creates member invites valid for INVITE_TTL_DAYS, skipping existing members and pending invites. */
  create(input: CreateInvitesInput & { invitedBy: string }): Promise<Invite[]>;
  listPending(teamId: string): Promise<Invite[]>;
}

export interface Repositories {
  auth: AuthRepo;
  users: UsersRepo;
  teams: TeamsRepo;
  memberships: MembershipsRepo;
  workspaces: WorkspacesRepo;
  boards: BoardsRepo;
  tasks: TasksRepo;
  invites: InvitesRepo;
}
```

Create `src/server/data/mock/repositories.ts`:

```ts
import { randomBytes, randomUUID } from "node:crypto";
import { generateKeyBetween, generateNKeysBetween } from "fractional-indexing";
import {
  DEFAULT_COLUMNS,
  INVITE_TTL_DAYS,
  formatTaskKey,
  type Column,
  type Invite,
  type Task,
  type User,
} from "@/lib/domain";
import { ConflictError, NotFoundError } from "../errors";
import type { Repositories } from "../types";
import type { MockDb } from "./db";
import { hashPassword, verifyPassword } from "./password";
import type { MockStore } from "./store";

const DAY_MS = 86_400_000;

const newId = () => randomUUID();
const now = () => new Date().toISOString();

// fractional-indexing keys compare by code unit, not locale.
function byPosition(a: { position: string }, b: { position: string }) {
  return a.position < b.position ? -1 : a.position > b.position ? 1 : 0;
}

function byCreatedAt(a: { createdAt: string }, b: { createdAt: string }) {
  return a.createdAt.localeCompare(b.createdAt);
}

function find<T>(items: T[], predicate: (item: T) => boolean, entity: string, id: string): T {
  const item = items.find(predicate);
  if (!item) throw new NotFoundError(entity, id);
  return item;
}

function findColumn(db: MockDb, boardId: string, columnId: string): Column {
  return find(db.columns, (c) => c.id === columnId && c.boardId === boardId, "Column", columnId);
}

export function createMockRepositories(store: MockStore): Repositories {
  return {
    auth: {
      async signUp({ name, email, password }) {
        const normalized = email.toLowerCase();
        const passwordHash = await hashPassword(password);
        return store.write((db) => {
          if (db.users.some((u) => u.email === normalized)) {
            throw new ConflictError("email", "An account with this email already exists");
          }
          const user: User = { id: newId(), email: normalized, name, avatarUrl: null, createdAt: now() };
          db.users.push(user);
          db.credentials.push({ userId: user.id, passwordHash });
          return user;
        });
      },

      async signIn({ email, password }) {
        const found = await store.read((db) => {
          const user = db.users.find((u) => u.email === email.toLowerCase());
          const credentials = user && db.credentials.find((c) => c.userId === user.id);
          return user && credentials ? { user, passwordHash: credentials.passwordHash } : null;
        });
        if (!found || !(await verifyPassword(password, found.passwordHash))) return null;
        return found.user;
      },
    },

    users: {
      getById: (id) => store.read((db) => db.users.find((u) => u.id === id) ?? null),
      getByEmail: (email) =>
        store.read((db) => db.users.find((u) => u.email === email.toLowerCase()) ?? null),
    },

    teams: {
      create: ({ name, slug, ownerId }) =>
        store.write((db) => {
          if (db.teams.some((t) => t.slug === slug)) {
            throw new ConflictError("slug", "This URL is already taken");
          }
          const team = { id: newId(), name, slug, plan: "lite" as const, createdAt: now() };
          db.teams.push(team);
          db.memberships.push({ teamId: team.id, userId: ownerId, role: "owner", joinedAt: now() });
          return team;
        }),
      getBySlug: (slug) => store.read((db) => db.teams.find((t) => t.slug === slug) ?? null),
      listForUser: (userId) =>
        store.read((db) => {
          const teamIds = new Set(db.memberships.filter((m) => m.userId === userId).map((m) => m.teamId));
          return db.teams.filter((t) => teamIds.has(t.id)).sort((a, b) => a.name.localeCompare(b.name));
        }),
    },

    memberships: {
      list: (teamId) => store.read((db) => db.memberships.filter((m) => m.teamId === teamId)),
      get: (teamId, userId) =>
        store.read((db) => db.memberships.find((m) => m.teamId === teamId && m.userId === userId) ?? null),
      setRole: (teamId, userId, role) =>
        store.write((db) => {
          const membership = find(
            db.memberships,
            (m) => m.teamId === teamId && m.userId === userId,
            "Membership",
            `${teamId}/${userId}`,
          );
          membership.role = role;
          return membership;
        }),
      remove: (teamId, userId) =>
        store.write((db) => {
          db.memberships = db.memberships.filter((m) => !(m.teamId === teamId && m.userId === userId));
        }),
    },

    workspaces: {
      create: ({ teamId, name, keyPrefix }) =>
        store.write((db) => {
          find(db.teams, (t) => t.id === teamId, "Team", teamId);
          if (db.workspaces.some((w) => w.teamId === teamId && w.keyPrefix === keyPrefix)) {
            throw new ConflictError("keyPrefix", "Another workspace already uses this prefix");
          }
          const workspace = { id: newId(), teamId, name, keyPrefix, nextTaskNumber: 1, createdAt: now() };
          db.workspaces.push(workspace);
          return workspace;
        }),
      get: (id) => store.read((db) => db.workspaces.find((w) => w.id === id) ?? null),
      listForTeam: (teamId) =>
        store.read((db) => db.workspaces.filter((w) => w.teamId === teamId).sort(byCreatedAt)),
    },

    boards: {
      create: ({ workspaceId, name, description }) =>
        store.write((db) => {
          find(db.workspaces, (w) => w.id === workspaceId, "Workspace", workspaceId);
          const board = { id: newId(), workspaceId, name, description, createdAt: now() };
          db.boards.push(board);
          const positions = generateNKeysBetween(null, null, DEFAULT_COLUMNS.length);
          DEFAULT_COLUMNS.forEach((columnName, i) => {
            db.columns.push({ id: newId(), boardId: board.id, name: columnName, position: positions[i] });
          });
          return board;
        }),
      get: (id) => store.read((db) => db.boards.find((b) => b.id === id) ?? null),
      listForWorkspace: (workspaceId) =>
        store.read((db) => db.boards.filter((b) => b.workspaceId === workspaceId).sort(byCreatedAt)),
      listColumns: (boardId) =>
        store.read((db) => db.columns.filter((c) => c.boardId === boardId).sort(byPosition)),
    },

    tasks: {
      create: (input) =>
        store.write((db) => {
          const board = find(db.boards, (b) => b.id === input.boardId, "Board", input.boardId);
          const workspace = find(db.workspaces, (w) => w.id === board.workspaceId, "Workspace", board.workspaceId);
          findColumn(db, board.id, input.columnId);
          const last = db.tasks.filter((t) => t.columnId === input.columnId).sort(byPosition).at(-1);
          const number = workspace.nextTaskNumber++;
          const timestamp = now();
          const task: Task = {
            ...input,
            id: newId(),
            number,
            key: formatTaskKey(workspace.keyPrefix, number),
            position: generateKeyBetween(last?.position ?? null, null),
            createdAt: timestamp,
            updatedAt: timestamp,
          };
          db.tasks.push(task);
          return task;
        }),
      getByKey: (workspaceId, key) =>
        store.read((db) => {
          const boardIds = new Set(db.boards.filter((b) => b.workspaceId === workspaceId).map((b) => b.id));
          const wanted = key.trim().toUpperCase();
          return db.tasks.find((t) => boardIds.has(t.boardId) && t.key === wanted) ?? null;
        }),
      listForBoard: (boardId) =>
        store.read((db) => db.tasks.filter((t) => t.boardId === boardId).sort(byPosition)),
      update: (id, patch) =>
        store.write((db) => {
          const task = find(db.tasks, (t) => t.id === id, "Task", id);
          Object.assign(task, patch, { updatedAt: now() });
          return task;
        }),
      move: (id, { columnId, position }) =>
        store.write((db) => {
          const task = find(db.tasks, (t) => t.id === id, "Task", id);
          findColumn(db, task.boardId, columnId);
          Object.assign(task, { columnId, position, updatedAt: now() });
          return task;
        }),
    },

    invites: {
      create: ({ teamId, emails, invitedBy }) =>
        store.write((db) => {
          find(db.teams, (t) => t.id === teamId, "Team", teamId);
          const memberIds = new Set(db.memberships.filter((m) => m.teamId === teamId).map((m) => m.userId));
          const createdAt = new Date();
          const pending = db.invites.filter(
            (i) => i.teamId === teamId && i.acceptedAt === null && i.expiresAt > createdAt.toISOString(),
          );
          const taken = new Set([
            ...db.users.filter((u) => memberIds.has(u.id)).map((u) => u.email),
            ...pending.map((i) => i.email),
          ]);
          const expiresAt = new Date(createdAt.getTime() + INVITE_TTL_DAYS * DAY_MS);
          const created: Invite[] = [];
          for (const email of new Set(emails.map((e) => e.toLowerCase()))) {
            if (taken.has(email)) continue;
            created.push({
              id: newId(),
              teamId,
              email,
              role: "member",
              token: randomBytes(24).toString("base64url"),
              invitedBy,
              expiresAt: expiresAt.toISOString(),
              acceptedAt: null,
              createdAt: createdAt.toISOString(),
            });
          }
          db.invites.push(...created);
          return created;
        }),
      listPending: (teamId) =>
        store.read((db) => {
          const current = now();
          return db.invites.filter(
            (i) => i.teamId === teamId && i.acceptedAt === null && i.expiresAt > current,
          );
        }),
    },
  };
}
```

- [ ] **Step 4: Verify**

Run: `pnpm test && pnpm lint && pnpm typecheck`
Expected: 98 tests pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(data): implement mock repositories for auth, teams, boards, tasks and invites"
```

---

### Task 5: Seed data + `getRepositories()`

**Files:**
- Create: `src/server/data/mock/seed.ts`, `src/server/data/mock/seed.test.ts`, `src/server/data/index.ts`

**Interfaces:**
- Produces: `DEMO_USER` (`demo@trackaai.test` / `demo-password`, local dev only), `seedDb()` — built by running the real repositories against a memory store: team **Acme** (`acme`), workspace **Engineering** (`ENG`), board **Engineering** with five tasks `ENG-1…5`. `getRepositories()` (`server-only`): resolves `DATA_BACKEND`, throws for `supabase` until M4, and caches one file-backed instance per process (`MOCK_DB_PATH`, default `.data/mock-db.json`). Also re-exports the repository types and error classes.

- [ ] **Step 1: Write the failing test**

Create `src/server/data/mock/seed.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createMockRepositories } from "./repositories";
import { DEMO_USER, seedDb } from "./seed";
import { createMemoryStore } from "./store";

describe("seedDb", () => {
  it("creates a demo account with a team, workspace and populated board", async () => {
    const repos = createMockRepositories(createMemoryStore(await seedDb()));
    const user = await repos.auth.signIn(DEMO_USER);
    expect(user?.name).toBe(DEMO_USER.name);

    const [team] = await repos.teams.listForUser(user!.id);
    expect(team.slug).toBe("acme");
    const [workspace] = await repos.workspaces.listForTeam(team.id);
    expect(workspace.keyPrefix).toBe("ENG");
    const [board] = await repos.boards.listForWorkspace(workspace.id);
    const tasks = await repos.tasks.listForBoard(board.id);
    expect(tasks.length).toBeGreaterThan(0);
    expect(tasks.map((t) => t.key)).toContain("ENG-1");
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm test src/server/data/mock/seed`
Expected: FAIL — `Failed to resolve import "./seed"`.

- [ ] **Step 3: Implement**

Create `src/server/data/mock/seed.ts`:

```ts
import { createTaskInputSchema, type Priority } from "@/lib/domain";
import { emptyDb, type MockDb } from "./db";
import { createMockRepositories } from "./repositories";
import { createMemoryStore } from "./store";

// Local-dev account, created whenever the mock db file is missing.
export const DEMO_USER = {
  name: "Demo User",
  email: "demo@trackaai.test",
  password: "demo-password",
} as const;

const DEMO_TASKS: [column: number, title: string, priority: Priority][] = [
  [0, "Write onboarding copy", "low"],
  [0, "Pick an analytics provider", "none"],
  [1, "Add password reset", "medium"],
  [2, "Build the Kanban board", "high"],
  [3, "Set up CI", "urgent"],
];

export async function seedDb(): Promise<MockDb> {
  const store = createMemoryStore(emptyDb());
  const repos = createMockRepositories(store);

  const user = await repos.auth.signUp(DEMO_USER);
  const team = await repos.teams.create({ name: "Acme", slug: "acme", ownerId: user.id });
  const workspace = await repos.workspaces.create({ teamId: team.id, name: "Engineering", keyPrefix: "ENG" });
  const board = await repos.boards.create({ workspaceId: workspace.id, name: "Engineering", description: null });
  const columns = await repos.boards.listColumns(board.id);

  for (const [column, title, priority] of DEMO_TASKS) {
    await repos.tasks.create({
      ...createTaskInputSchema.parse({ boardId: board.id, columnId: columns[column].id, title, priority }),
      createdBy: user.id,
    });
  }

  return store.snapshot();
}
```

Create `src/server/data/index.ts` (note the `turbopackIgnore` comment — gotcha 2):

```ts
import "server-only";
import path from "node:path";
import { resolveDataBackend } from "./backend";
import { createMockRepositories } from "./mock/repositories";
import { seedDb } from "./mock/seed";
import { createFileStore } from "./mock/store";
import type { Repositories } from "./types";

// One instance per server process (survives dev hot reloads), so every request
// shares the mock store's write queue.
const globalForRepos = globalThis as typeof globalThis & { __trackaRepos?: Repositories };

export function getRepositories(): Repositories {
  if (!globalForRepos.__trackaRepos) {
    const backend = resolveDataBackend(process.env.DATA_BACKEND);
    if (backend === "supabase") {
      throw new Error('The Supabase backend arrives in M4. Set DATA_BACKEND="mock" for now.');
    }
    // turbopackIgnore: the db file is local runtime state, not something to bundle or trace.
    const file = path.resolve(
      /* turbopackIgnore: true */ process.cwd(),
      process.env.MOCK_DB_PATH || ".data/mock-db.json",
    );
    globalForRepos.__trackaRepos = createMockRepositories(createFileStore(file, seedDb));
  }
  return globalForRepos.__trackaRepos;
}

export type * from "./types";
export { ConflictError, NotFoundError } from "./errors";
```

- [ ] **Step 4: Verify**

Run: `pnpm test && pnpm lint && pnpm typecheck`
Expected: 99 tests pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(data): seed a demo account and expose getRepositories()"
```

---

### Task 6: Permissions + route helpers

**Files:**
- Create: `src/server/auth/permissions.ts`, `src/server/auth/permissions.test.ts`
- Modify: `src/lib/auth/routes.ts`, `src/lib/auth/routes.test.ts`, `src/proxy.ts`

**Interfaces:**
- Produces: `type Action` (`team:read`, `task:create`, `workspace:create`, `board:create`, `member:invite`), `can(role, action)`, `assertCan(role, action)` throwing `ForbiddenError` — the one place role rules live (M3 extends it). Routes gain `SIGN_UP_PATH`, `SIGN_OUT_PATH` and `isOpenPath()`; the proxy lets open paths through untouched (gotcha 4).

- [ ] **Step 1: Write the failing tests**

Create `src/server/auth/permissions.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { ForbiddenError, assertCan, can } from "./permissions";

describe("can", () => {
  it("lets every role read the team and create tasks", () => {
    for (const role of ["owner", "admin", "member"] as const) {
      expect(can(role, "team:read")).toBe(true);
      expect(can(role, "task:create")).toBe(true);
    }
  });

  it.each(["workspace:create", "board:create", "member:invite"] as const)(
    "limits %s to owners and admins",
    (action) => {
      expect(can("owner", action)).toBe(true);
      expect(can("admin", action)).toBe(true);
      expect(can("member", action)).toBe(false);
    },
  );
});

describe("assertCan", () => {
  it("throws ForbiddenError when the role lacks the permission", () => {
    expect(() => assertCan("member", "member:invite")).toThrow(ForbiddenError);
    expect(() => assertCan("admin", "member:invite")).not.toThrow();
  });
});
```

Replace `src/lib/auth/routes.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { isOpenPath, isPublicPath, safeNextPath, signInRedirectPath } from "./routes";

describe("isPublicPath", () => {
  it("treats sign-in, sign-up and their sub-paths as public", () => {
    expect(isPublicPath("/sign-in")).toBe(true);
    expect(isPublicPath("/sign-in/magic")).toBe(true);
    expect(isPublicPath("/sign-up")).toBe(true);
  });

  it("treats everything else as protected", () => {
    expect(isPublicPath("/")).toBe(false);
    expect(isPublicPath("/sign-inx")).toBe(false);
    expect(isPublicPath("/acme/board")).toBe(false);
  });
});

describe("isOpenPath", () => {
  it("lets /sign-out through regardless of session", () => {
    expect(isOpenPath("/sign-out")).toBe(true);
    expect(isOpenPath("/sign-in")).toBe(false);
    expect(isOpenPath("/")).toBe(false);
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

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm test src/server/auth src/lib/auth`
Expected: FAIL — `Failed to resolve import "./permissions"`; `isPublicPath("/sign-up")` is false; `isOpenPath` is not a function.

- [ ] **Step 3: Implement**

Create `src/server/auth/permissions.ts`:

```ts
import type { Role } from "@/lib/domain";

// Single source of truth for role checks. M3 adds member-management actions.
const RULES = {
  "team:read": ["owner", "admin", "member"],
  "task:create": ["owner", "admin", "member"],
  "workspace:create": ["owner", "admin"],
  "board:create": ["owner", "admin"],
  "member:invite": ["owner", "admin"],
} as const satisfies Record<string, readonly Role[]>;

export type Action = keyof typeof RULES;

export class ForbiddenError extends Error {
  constructor(role: Role, action: Action) {
    super(`A ${role} cannot ${action}`);
    this.name = "ForbiddenError";
  }
}

export function can(role: Role, action: Action): boolean {
  return (RULES[action] as readonly Role[]).includes(role);
}

export function assertCan(role: Role, action: Action): void {
  if (!can(role, action)) throw new ForbiddenError(role, action);
}
```

Replace `src/lib/auth/routes.ts`:

```ts
export const SESSION_COOKIE = "tracka_session";
export const SIGN_IN_PATH = "/sign-in";
export const SIGN_UP_PATH = "/sign-up";
export const SIGN_OUT_PATH = "/sign-out";

// Signed-in users are bounced from these to "/".
const PUBLIC_PATHS = [SIGN_IN_PATH, SIGN_UP_PATH];
// These skip the session check entirely (e.g. clearing a stale cookie).
const OPEN_PATHS = [SIGN_OUT_PATH];

function matches(paths: string[], pathname: string): boolean {
  return paths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export function isPublicPath(pathname: string): boolean {
  return matches(PUBLIC_PATHS, pathname);
}

export function isOpenPath(pathname: string): boolean {
  return matches(OPEN_PATHS, pathname);
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

Replace `src/proxy.ts`:

```ts
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, isOpenPath, isPublicPath, signInRedirectPath } from "@/lib/auth/routes";

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (isOpenPath(pathname)) return NextResponse.next();

  // Optimistic check only: pages verify the session via requireUser().
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

- [ ] **Step 4: Verify**

Run: `pnpm test && pnpm lint && pnpm typecheck`
Expected: 105 tests pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(auth): add role permissions and open auth routes"
```

---

### Task 7: Real (mock) auth — sessions, sign-up, sign-in, sign-out

**Files:**
- Create: `src/components/ui/{field,label,card}.tsx` (shadcn), `src/lib/forms.ts`, `src/lib/paths.ts`, `src/server/auth/session.ts`, `src/server/auth/guards.ts`, `src/server/actions/auth.ts`, `src/components/forms/fields.tsx`, `src/components/auth/sign-in-form.tsx`, `src/components/auth/sign-up-form.tsx`, `src/app/(auth)/layout.tsx`, `src/app/(auth)/sign-in/page.tsx`, `src/app/(auth)/sign-up/page.tsx`, `src/app/sign-out/route.ts`
- Delete: `src/server/auth/actions.ts` (dev stub), `src/app/sign-in/page.tsx` (moves into `(auth)`)
- Modify: `src/components/shell/app-sidebar.tsx` (sign-out import)

**Interfaces:**
- Consumes: `getRepositories()` (Task 5), session tokens (Task 2), routes (Task 6).
- Produces: `FormState` / `initialFormState` / `formValues()`; URL builders `teamPath`, `boardPath`, `ONBOARDING_PATH`, `onboardingWorkspacePath`, `onboardingInvitePath`; `startSession(userId)`, `endSession()`, `getCurrentUser()` (request-cached), `requireUser()` (→ `/sign-out` when the cookie is missing or stale); `requireTeamMember(slug)` → `{ user, team, membership }` or 404; actions `signUpAction` (→ `/onboarding`), `signInAction` (→ safe `next`), `signOutAction`; `<TextField>` / `<FormError>`. Accessible names used by e2e: labels **Name**, **Email**, **Password**; buttons **Create account**, **Sign in**; errors **"Invalid email or password."**, **"An account with this email already exists"**.

- [ ] **Step 1: Add shadcn components** (gotcha 1)

```bash
pnpm dlx shadcn@4.21.0 add field label card -y --overwrite
pnpm remove cn
grep -rl 'from "cn"' src | xargs sed -i '' 's#from "cn"#from "@/lib/utils"#'
git status --short src/components/ui   # expect only new field/label/card files
```

- [ ] **Step 2: Shared helpers**

Create `src/lib/forms.ts`:

```ts
// Shape returned by server actions used with useActionState.
export type FormState = {
  fieldErrors?: Partial<Record<string, string[]>>;
  formError?: string;
  /** Echoed back so inputs keep their values after a failed submit. */
  values?: Record<string, string>;
};

export const initialFormState: FormState = {};

export function formValues<K extends string>(formData: FormData, keys: readonly K[]): Record<K, string> {
  return Object.fromEntries(keys.map((key) => [key, formData.get(key)?.toString() ?? ""])) as Record<
    K,
    string
  >;
}
```

Create `src/lib/paths.ts`:

```ts
// Every in-app URL is built here so routes can move without hunting strings.
export const ONBOARDING_PATH = "/onboarding";

export const teamPath = (teamSlug: string) => `/${teamSlug}`;
export const boardPath = (teamSlug: string, boardId: string) => `/${teamSlug}/board/${boardId}`;
export const onboardingWorkspacePath = (teamSlug: string) => `${ONBOARDING_PATH}/${teamSlug}/workspace`;
export const onboardingInvitePath = (teamSlug: string, boardId: string) =>
  `${ONBOARDING_PATH}/${teamSlug}/invite?board=${encodeURIComponent(boardId)}`;
```

- [ ] **Step 3: Sessions and guards**

Create `src/server/auth/session.ts`:

```ts
import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { User } from "@/lib/domain";
import { SESSION_COOKIE, SIGN_OUT_PATH } from "@/lib/auth/routes";
import { getRepositories } from "@/server/data";
import { SESSION_TTL_SECONDS, signSessionToken, verifySessionToken } from "./session-token";

// Mock backend only; Supabase Auth manages sessions from M4 on.
const SECRET = process.env.SESSION_SECRET || "trackaai-mock-dev-secret";

export async function startSession(userId: string) {
  const store = await cookies();
  store.set(SESSION_COOKIE, signSessionToken(userId, SECRET), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function endSession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export const getCurrentUser = cache(async (): Promise<User | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const userId = token ? verifySessionToken(token, SECRET) : null;
  return userId ? getRepositories().users.getById(userId) : null;
});

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  // A cookie that no longer maps to a user (bad signature, reset mock db) is
  // cleared by /sign-out, which then sends the visitor to sign in.
  if (!user) redirect(SIGN_OUT_PATH);
  return user;
}
```

Create `src/server/auth/guards.ts`:

```ts
import "server-only";
import { notFound } from "next/navigation";
import { cache } from "react";
import { getRepositories } from "@/server/data";
import { requireUser } from "./session";

/** Loads the team by slug and the caller's membership; 404s for non-members. */
export const requireTeamMember = cache(async (teamSlug: string) => {
  const user = await requireUser();
  const repos = getRepositories();
  const team = await repos.teams.getBySlug(teamSlug);
  const membership = team ? await repos.memberships.get(team.id, user.id) : null;
  if (!team || !membership) notFound();
  return { user, team, membership };
});
```

- [ ] **Step 4: Auth actions** (replacing the M0 stub)

```bash
git rm src/server/auth/actions.ts src/app/sign-in/page.tsx
mkdir -p src/server/actions "src/app/(auth)/sign-in" "src/app/(auth)/sign-up" src/app/sign-out
```

Create `src/server/actions/auth.ts`:

```ts
"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { SIGN_IN_PATH, safeNextPath } from "@/lib/auth/routes";
import { signInInputSchema, signUpInputSchema } from "@/lib/domain";
import { formValues, type FormState } from "@/lib/forms";
import { ONBOARDING_PATH } from "@/lib/paths";
import { endSession, startSession } from "@/server/auth/session";
import { ConflictError, getRepositories } from "@/server/data";

export async function signUpAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData, ["name", "email", "password"]);
  const echo = { name: values.name, email: values.email };
  const parsed = signUpInputSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values: echo };

  let userId: string;
  try {
    userId = (await getRepositories().auth.signUp(parsed.data)).id;
  } catch (error) {
    if (error instanceof ConflictError) return { fieldErrors: { [error.field]: [error.message] }, values: echo };
    throw error;
  }
  await startSession(userId);
  redirect(ONBOARDING_PATH);
}

export async function signInAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData, ["email", "password", "next"]);
  const echo = { email: values.email };
  const parsed = signInInputSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values: echo };

  const user = await getRepositories().auth.signIn(parsed.data);
  if (!user) return { formError: "Invalid email or password.", values: echo };
  await startSession(user.id);
  redirect(safeNextPath(values.next));
}

export async function signOutAction() {
  await endSession();
  redirect(SIGN_IN_PATH);
}
```

In `src/components/shell/app-sidebar.tsx` replace `import { signOut } from "@/server/auth/actions";` with `import { signOutAction } from "@/server/actions/auth";` and `<form action={signOut}>` with `<form action={signOutAction}>` (the whole file is replaced in Task 9).

- [ ] **Step 5: Form components**

Create `src/components/forms/fields.tsx`:

```tsx
import type { ComponentProps, ReactNode } from "react";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type TextFieldProps = ComponentProps<typeof Input> & {
  name: string;
  label: string;
  errors?: string[];
  description?: ReactNode;
};

export function TextField({ name, label, errors, description, ...props }: TextFieldProps) {
  const invalid = Boolean(errors?.length);
  return (
    <Field data-invalid={invalid}>
      <FieldLabel htmlFor={name}>{label}</FieldLabel>
      <Input id={name} name={name} aria-invalid={invalid} {...props} />
      {description && <FieldDescription>{description}</FieldDescription>}
      <FieldError>{errors?.[0]}</FieldError>
    </Field>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-destructive text-sm">
      {message}
    </p>
  );
}
```

Create `src/components/auth/sign-in-form.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useActionState } from "react";
import { FormError, TextField } from "@/components/forms/fields";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { SIGN_UP_PATH } from "@/lib/auth/routes";
import { initialFormState } from "@/lib/forms";
import { signInAction } from "@/server/actions/auth";

export function SignInForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(signInAction, initialFormState);

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="next" value={next} />
      <FieldGroup>
        <TextField
          name="email"
          label="Email"
          type="email"
          autoComplete="email"
          required
          defaultValue={state.values?.email}
          errors={state.fieldErrors?.email}
        />
        <TextField
          name="password"
          label="Password"
          type="password"
          autoComplete="current-password"
          required
          errors={state.fieldErrors?.password}
        />
      </FieldGroup>
      <FormError message={state.formError} />
      <Button type="submit" className="w-full" disabled={pending}>
        Sign in
      </Button>
      <p className="text-muted-foreground text-center text-sm">
        No account yet?{" "}
        <Link href={SIGN_UP_PATH} className="text-foreground underline underline-offset-4">
          Sign up
        </Link>
      </p>
    </form>
  );
}
```

Create `src/components/auth/sign-up-form.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useActionState } from "react";
import { TextField } from "@/components/forms/fields";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { SIGN_IN_PATH } from "@/lib/auth/routes";
import { initialFormState } from "@/lib/forms";
import { signUpAction } from "@/server/actions/auth";

export function SignUpForm() {
  const [state, action, pending] = useActionState(signUpAction, initialFormState);

  return (
    <form action={action} className="space-y-6">
      <FieldGroup>
        <TextField
          name="name"
          label="Name"
          autoComplete="name"
          required
          defaultValue={state.values?.name}
          errors={state.fieldErrors?.name}
        />
        <TextField
          name="email"
          label="Email"
          type="email"
          autoComplete="email"
          required
          defaultValue={state.values?.email}
          errors={state.fieldErrors?.email}
        />
        <TextField
          name="password"
          label="Password"
          type="password"
          autoComplete="new-password"
          required
          description="At least 8 characters."
          errors={state.fieldErrors?.password}
        />
      </FieldGroup>
      <Button type="submit" className="w-full" disabled={pending}>
        Create account
      </Button>
      <p className="text-muted-foreground text-center text-sm">
        Already have an account?{" "}
        <Link href={SIGN_IN_PATH} className="text-foreground underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </form>
  );
}
```

- [ ] **Step 6: Pages and the sign-out route**

Create `src/app/(auth)/layout.tsx`:

```tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <div className="w-full max-w-sm">{children}</div>
    </main>
  );
}
```

Create `src/app/(auth)/sign-in/page.tsx`:

```tsx
import type { Metadata } from "next";
import { SignInForm } from "@/components/auth/sign-in-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { resolveDataBackend } from "@/server/data/backend";
import { DEMO_USER } from "@/server/data/mock/seed";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  const { next } = await searchParams;
  const isMock = resolveDataBackend(process.env.DATA_BACKEND) === "mock";

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h1 className="text-xl">Sign in to TrackaAI</h1>
        </CardTitle>
        {isMock && (
          <CardDescription>
            Mock mode: try <code>{DEMO_USER.email}</code> / <code>{DEMO_USER.password}</code>
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <SignInForm next={typeof next === "string" ? next : "/"} />
      </CardContent>
    </Card>
  );
}
```

Create `src/app/(auth)/sign-up/page.tsx`:

```tsx
import type { Metadata } from "next";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Sign up" };

export default function SignUpPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h1 className="text-xl">Create your account</h1>
        </CardTitle>
        <CardDescription>Set up your team in under three minutes.</CardDescription>
      </CardHeader>
      <CardContent>
        <SignUpForm />
      </CardContent>
    </Card>
  );
}
```

Create `src/app/sign-out/route.ts`:

```ts
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, SIGN_IN_PATH } from "@/lib/auth/routes";

// Clears a stale session cookie (see requireUser). Signing out from the UI
// uses the signOutAction server action instead.
export function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL(SIGN_IN_PATH, request.url));
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
```

- [ ] **Step 7: Verify**

Run: `rm -rf .next && pnpm test && pnpm lint && pnpm typecheck && pnpm build`
Expected: 105 tests pass; build lists `ƒ /sign-in`, `○ /sign-up`, `ƒ /sign-out`. (M0's e2e sign-in test now fails by design; Task 10 rewrites the suite.)

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(auth): replace dev sign-in with mock sign-up, sign-in and sessions"
```

---

### Task 8: Onboarding wizard — team → workspace → invites

**Files:**
- Create: `src/server/actions/onboarding.ts`, `src/components/onboarding/onboarding-step.tsx`, `src/components/onboarding/create-team-form.tsx`, `src/components/onboarding/create-workspace-form.tsx`, `src/components/onboarding/invite-form.tsx`, `src/app/onboarding/layout.tsx`, `src/app/onboarding/page.tsx`, `src/app/onboarding/[team]/workspace/page.tsx`, `src/app/onboarding/[team]/invite/page.tsx`

**Interfaces:**
- Consumes: `requireUser`, `requireTeamMember`, `assertCan`, `getRepositories`, `slugify`, `suggestKeyPrefix`, `parseEmailList`.
- Produces: `createTeamAction` (→ step 2), `createWorkspaceAction` (creates the workspace **and** its default board named after it, → step 3 with `?board=`), `sendInvitesAction` (logs `[invite] email → /invite/<token>` until M5, → board). The team URL follows the team name and the key prefix follows the workspace name until edited by hand. Accessible names used by e2e: headings **Create your team**, **Create your first workspace**, **Invite your teammates**; labels **Team name**, **Team URL**, **Workspace name**, **Key prefix**, **Email addresses**; buttons **Continue**, **Send invites**; link **Skip for now**.

- [ ] **Step 1: Actions**

```bash
mkdir -p src/components/onboarding "src/app/onboarding/[team]/workspace" "src/app/onboarding/[team]/invite"
```

Create `src/server/actions/onboarding.ts`:

```ts
"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import {
  createInvitesInputSchema,
  createTeamInputSchema,
  createWorkspaceInputSchema,
  parseEmailList,
} from "@/lib/domain";
import { formValues, type FormState } from "@/lib/forms";
import { boardPath, onboardingInvitePath, onboardingWorkspacePath, teamPath } from "@/lib/paths";
import { requireTeamMember } from "@/server/auth/guards";
import { assertCan } from "@/server/auth/permissions";
import { requireUser } from "@/server/auth/session";
import { ConflictError, getRepositories } from "@/server/data";

function conflictToFormState(error: unknown, values: Record<string, string>): FormState {
  if (error instanceof ConflictError) return { fieldErrors: { [error.field]: [error.message] }, values };
  throw error;
}

export async function createTeamAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const values = formValues(formData, ["name", "slug"]);
  const parsed = createTeamInputSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };

  try {
    await getRepositories().teams.create({ ...parsed.data, ownerId: user.id });
  } catch (error) {
    return conflictToFormState(error, values);
  }
  redirect(onboardingWorkspacePath(parsed.data.slug));
}

export async function createWorkspaceAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData, ["teamSlug", "name", "keyPrefix"]);
  const { team, membership } = await requireTeamMember(values.teamSlug);
  assertCan(membership.role, "workspace:create");
  const parsed = createWorkspaceInputSchema.safeParse({
    teamId: team.id,
    name: values.name,
    keyPrefix: values.keyPrefix.toUpperCase(),
  });
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };

  const repos = getRepositories();
  let boardId: string;
  try {
    const workspace = await repos.workspaces.create(parsed.data);
    // PRD §5.1: onboarding lands on a seeded default board.
    const board = await repos.boards.create({ workspaceId: workspace.id, name: workspace.name, description: null });
    boardId = board.id;
  } catch (error) {
    return conflictToFormState(error, values);
  }
  redirect(onboardingInvitePath(team.slug, boardId));
}

export async function sendInvitesAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData, ["teamSlug", "boardId", "emails"]);
  const { user, team, membership } = await requireTeamMember(values.teamSlug);
  assertCan(membership.role, "member:invite");
  const parsed = createInvitesInputSchema.safeParse({
    teamId: team.id,
    emails: parseEmailList(values.emails),
  });
  // Errors on individual addresses (emails.3) flatten onto "emails".
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };

  const invites = await getRepositories().invites.create({ ...parsed.data, invitedBy: user.id });
  for (const invite of invites) {
    // Invite emails are sent via Resend from M5; accepting invites arrives in M3.
    console.info(`[invite] ${invite.email} → /invite/${invite.token}`);
  }
  redirect(values.boardId ? boardPath(team.slug, values.boardId) : teamPath(team.slug));
}
```

- [ ] **Step 2: Components**

Create `src/components/onboarding/onboarding-step.tsx`:

```tsx
import type { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const STEP_COUNT = 3;

export function OnboardingStep({
  step,
  title,
  description,
  children,
}: {
  step: number;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          Step {step} of {STEP_COUNT}
        </p>
        <CardTitle>
          <h1 className="text-xl">{title}</h1>
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
```

Create `src/components/onboarding/create-team-form.tsx`:

```tsx
"use client";

import { useActionState, useState } from "react";
import { TextField } from "@/components/forms/fields";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { slugify } from "@/lib/domain";
import { initialFormState } from "@/lib/forms";
import { createTeamAction } from "@/server/actions/onboarding";

export function CreateTeamForm() {
  const [state, action, pending] = useActionState(createTeamAction, initialFormState);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  // The URL follows the name until the user edits it directly.
  const [slugTouched, setSlugTouched] = useState(false);

  return (
    <form action={action} className="space-y-6">
      <FieldGroup>
        <TextField
          name="name"
          label="Team name"
          required
          autoFocus
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            if (!slugTouched) setSlug(slugify(event.target.value));
          }}
          errors={state.fieldErrors?.name}
        />
        <TextField
          name="slug"
          label="Team URL"
          required
          value={slug}
          onChange={(event) => {
            setSlug(event.target.value);
            setSlugTouched(true);
          }}
          description={`Your team lives at /${slug || "your-team"}`}
          errors={state.fieldErrors?.slug}
        />
      </FieldGroup>
      <Button type="submit" className="w-full" disabled={pending}>
        Continue
      </Button>
    </form>
  );
}
```

Create `src/components/onboarding/create-workspace-form.tsx`:

```tsx
"use client";

import { useActionState, useState } from "react";
import { TextField } from "@/components/forms/fields";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { suggestKeyPrefix } from "@/lib/domain";
import { initialFormState } from "@/lib/forms";
import { createWorkspaceAction } from "@/server/actions/onboarding";

export function CreateWorkspaceForm({ teamSlug }: { teamSlug: string }) {
  const [state, action, pending] = useActionState(createWorkspaceAction, initialFormState);
  const [name, setName] = useState("");
  const [keyPrefix, setKeyPrefix] = useState("");
  const [prefixTouched, setPrefixTouched] = useState(false);

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="teamSlug" value={teamSlug} />
      <FieldGroup>
        <TextField
          name="name"
          label="Workspace name"
          placeholder="Engineering"
          required
          autoFocus
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            if (!prefixTouched) setKeyPrefix(suggestKeyPrefix(event.target.value));
          }}
          errors={state.fieldErrors?.name}
        />
        <TextField
          name="keyPrefix"
          label="Key prefix"
          required
          maxLength={5}
          value={keyPrefix}
          onChange={(event) => {
            setKeyPrefix(event.target.value.toUpperCase());
            setPrefixTouched(true);
          }}
          description={`Task IDs will look like ${keyPrefix || "ENG"}-1`}
          errors={state.fieldErrors?.keyPrefix}
        />
      </FieldGroup>
      <Button type="submit" className="w-full" disabled={pending}>
        Continue
      </Button>
    </form>
  );
}
```

Create `src/components/onboarding/invite-form.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { MAX_INVITES_PER_BATCH } from "@/lib/domain";
import { initialFormState } from "@/lib/forms";
import { sendInvitesAction } from "@/server/actions/onboarding";

export function InviteForm({ teamSlug, boardId, skipHref }: { teamSlug: string; boardId: string; skipHref: string }) {
  const [state, action, pending] = useActionState(sendInvitesAction, initialFormState);
  const errors = state.fieldErrors?.emails;

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="teamSlug" value={teamSlug} />
      <input type="hidden" name="boardId" value={boardId} />
      <Field data-invalid={Boolean(errors)}>
        <FieldLabel htmlFor="emails">Email addresses</FieldLabel>
        <Textarea
          id="emails"
          name="emails"
          rows={4}
          placeholder="ann@example.com, bob@example.com"
          defaultValue={state.values?.emails}
          aria-invalid={Boolean(errors)}
        />
        <FieldDescription>
          Separate with commas or new lines. Up to {MAX_INVITES_PER_BATCH} at a time.
        </FieldDescription>
        <FieldError>{errors?.[0]}</FieldError>
      </Field>
      <div className="flex gap-2">
        <Button type="submit" className="flex-1" disabled={pending}>
          Send invites
        </Button>
        <Button variant="ghost" asChild>
          <Link href={skipHref}>Skip for now</Link>
        </Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 3: Pages**

Create `src/app/onboarding/layout.tsx`:

```tsx
import { requireUser } from "@/server/auth/session";

export default async function OnboardingLayout({ children }: LayoutProps<"/onboarding">) {
  await requireUser();
  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <div className="w-full max-w-md">{children}</div>
    </main>
  );
}
```

Create `src/app/onboarding/page.tsx`:

```tsx
import type { Metadata } from "next";
import { CreateTeamForm } from "@/components/onboarding/create-team-form";
import { OnboardingStep } from "@/components/onboarding/onboarding-step";

export const metadata: Metadata = { title: "Create your team" };

export default function CreateTeamPage() {
  return (
    <OnboardingStep
      step={1}
      title="Create your team"
      description="Your team holds workspaces, boards and people."
    >
      <CreateTeamForm />
    </OnboardingStep>
  );
}
```

Create `src/app/onboarding/[team]/workspace/page.tsx`:

```tsx
import type { Metadata } from "next";
import { CreateWorkspaceForm } from "@/components/onboarding/create-workspace-form";
import { OnboardingStep } from "@/components/onboarding/onboarding-step";
import { requireTeamMember } from "@/server/auth/guards";

export const metadata: Metadata = { title: "Create a workspace" };

export default async function CreateWorkspacePage({ params }: PageProps<"/onboarding/[team]/workspace">) {
  const { team } = await requireTeamMember((await params).team);

  return (
    <OnboardingStep
      step={2}
      title="Create your first workspace"
      description="Workspaces group boards, like Engineering or Marketing. The key prefix starts every task ID."
    >
      <CreateWorkspaceForm teamSlug={team.slug} />
    </OnboardingStep>
  );
}
```

Create `src/app/onboarding/[team]/invite/page.tsx`:

```tsx
import type { Metadata } from "next";
import { InviteForm } from "@/components/onboarding/invite-form";
import { OnboardingStep } from "@/components/onboarding/onboarding-step";
import { boardPath, teamPath } from "@/lib/paths";
import { requireTeamMember } from "@/server/auth/guards";

export const metadata: Metadata = { title: "Invite teammates" };

export default async function InvitePage({ params, searchParams }: PageProps<"/onboarding/[team]/invite">) {
  const { team } = await requireTeamMember((await params).team);
  const { board } = await searchParams;
  const boardId = typeof board === "string" ? board : "";

  return (
    <OnboardingStep
      step={3}
      title="Invite your teammates"
      description="They'll get an email with a link to join. You can always do this later."
    >
      <InviteForm
        teamSlug={team.slug}
        boardId={boardId}
        skipHref={boardId ? boardPath(team.slug, boardId) : teamPath(team.slug)}
      />
    </OnboardingStep>
  );
}
```

- [ ] **Step 4: Verify**

Run: `pnpm test && pnpm lint && pnpm typecheck && pnpm build`
Expected: 105 tests pass; build lists `ƒ /onboarding`, `ƒ /onboarding/[team]/workspace`, `ƒ /onboarding/[team]/invite`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(onboarding): add team, workspace and invite wizard"
```

---

### Task 9: Team-scoped shell — `/[team]`, team switcher, workspace tree, board

**Files:**
- Create: `src/app/page.tsx`, `src/app/[team]/layout.tsx`, `src/app/[team]/page.tsx`, `src/app/[team]/board/[boardId]/page.tsx`, `src/components/shell/team-switcher.tsx`
- Delete: `src/app/(app)/layout.tsx`, `src/app/(app)/page.tsx`
- Modify: `src/components/shell/nav-items.ts`, `src/components/shell/command-menu.tsx`, `src/components/shell/command-menu.test.tsx`, `src/components/shell/app-header.tsx`, `src/components/shell/app-sidebar.tsx`

**Interfaces:**
- Consumes: `requireUser`, `requireTeamMember`, `getRepositories`, `paths.ts`, `signOutAction`.
- Produces: `navItems(teamSlug): NavItem[]` (replaces `NAV_ITEMS`); `<CommandMenu teamSlug boards />` with a **Boards** group; `<AppHeader teamSlug boards />`; `<TeamSwitcher current teams />` (button named **"Switch team (current: …)"**, menu items per team plus **Create team**); `<AppSidebar user team teams workspaces />` with a workspace → boards tree and the signed-in user. Board page renders each column as a `region` named after it, with task cards (`ENG-1` + title) or **"No tasks"** — read-only until M2.

- [ ] **Step 1: Update the palette test first**

Replace `src/components/shell/command-menu.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CommandMenu } from "./command-menu";

const mocks = vi.hoisted(() => ({ push: vi.fn(), setTheme: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("next-themes", () => ({ useTheme: () => ({ setTheme: mocks.setTheme }) }));

const BOARDS = [{ id: "b1", name: "Roadmap" }];

describe("CommandMenu", () => {
  beforeEach(() => {
    mocks.push.mockReset();
    mocks.setTheme.mockReset();
  });

  it("opens with Cmd+K", () => {
    render(<CommandMenu teamSlug="acme" boards={BOARDS} />);
    expect(screen.queryByPlaceholderText("Type a command or search…")).not.toBeInTheDocument();
    fireEvent.keyDown(document, { key: "k", metaKey: true });
    expect(screen.getByPlaceholderText("Type a command or search…")).toBeInTheDocument();
  });

  it("switches theme from the palette", () => {
    render(<CommandMenu teamSlug="acme" boards={BOARDS} />);
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    fireEvent.click(screen.getByText("Light theme"));
    expect(mocks.setTheme).toHaveBeenCalledWith("light");
  });

  it("navigates to a team page", () => {
    render(<CommandMenu teamSlug="acme" boards={BOARDS} />);
    fireEvent.click(screen.getByRole("button", { name: /search/i }));
    fireEvent.click(screen.getByText("My tasks"));
    expect(mocks.push).toHaveBeenCalledWith("/acme");
  });

  it("jumps to a board", () => {
    render(<CommandMenu teamSlug="acme" boards={BOARDS} />);
    fireEvent.click(screen.getByRole("button", { name: /search/i }));
    fireEvent.click(screen.getByText("Roadmap"));
    expect(mocks.push).toHaveBeenCalledWith("/acme/board/b1");
  });
});
```

Run: `pnpm test src/components/shell`
Expected: FAIL — "My tasks" navigates to `/` instead of `/acme`, and "Roadmap" is not found.

- [ ] **Step 2: Nav items and palette**

Replace `src/components/shell/nav-items.ts`:

```ts
import { Inbox, type LucideIcon } from "lucide-react";
import { teamPath } from "@/lib/paths";

export type NavItem = { title: string; href: string; icon: LucideIcon };

// Team-level destinations, shared by the sidebar and the palette. M3 adds members/settings.
export function navItems(teamSlug: string): NavItem[] {
  return [{ title: "My tasks", href: teamPath(teamSlug), icon: Inbox }];
}
```

Replace `src/components/shell/command-menu.tsx`:

```tsx
"use client";

import { Moon, Search, SquareKanban, Sun } from "lucide-react";
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
import { boardPath } from "@/lib/paths";
import { navItems } from "./nav-items";

export function CommandMenu({
  teamSlug,
  boards,
}: {
  teamSlug: string;
  boards: { id: string; name: string }[];
}) {
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
              {navItems(teamSlug).map((item) => (
                <CommandItem key={item.href} onSelect={() => run(() => router.push(item.href))}>
                  <item.icon />
                  {item.title}
                </CommandItem>
              ))}
            </CommandGroup>
            {boards.length > 0 && (
              <CommandGroup heading="Boards">
                {boards.map((board) => (
                  <CommandItem
                    key={board.id}
                    onSelect={() => run(() => router.push(boardPath(teamSlug, board.id)))}
                  >
                    <SquareKanban />
                    {board.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
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

Run: `pnpm test src/components/shell`
Expected: PASS (4 tests).

- [ ] **Step 3: Header, switcher, sidebar**

Replace `src/components/shell/app-header.tsx`:

```tsx
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { CommandMenu } from "./command-menu";

export function AppHeader({ teamSlug, boards }: { teamSlug: string; boards: { id: string; name: string }[] }) {
  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b px-3">
      <SidebarTrigger />
      <Separator orientation="vertical" className="mx-1 data-vertical:h-4 data-vertical:self-center" />
      <div className="ml-auto flex items-center gap-1">
        <CommandMenu teamSlug={teamSlug} boards={boards} />
        <ThemeToggle />
      </div>
    </header>
  );
}
```

Create `src/components/shell/team-switcher.tsx`:

```tsx
"use client";

import { Check, ChevronsUpDown, Plus } from "lucide-react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import type { Team } from "@/lib/domain";
import { ONBOARDING_PATH, teamPath } from "@/lib/paths";

type TeamLink = Pick<Team, "id" | "name" | "slug">;

function TeamMark({ name }: { name: string }) {
  return (
    <span className="bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-md text-sm font-bold">
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

export function TeamSwitcher({ current, teams }: { current: TeamLink; teams: TeamLink[] }) {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton size="lg" aria-label={`Switch team (current: ${current.name})`}>
              <TeamMark name={current.name} />
              <span className="truncate font-semibold">{current.name}</span>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-56">
            <DropdownMenuLabel>Teams</DropdownMenuLabel>
            {teams.map((team) => (
              <DropdownMenuItem key={team.id} asChild>
                <Link href={teamPath(team.slug)}>
                  {team.name}
                  {team.id === current.id && <Check className="ml-auto" />}
                </Link>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={ONBOARDING_PATH}>
                <Plus />
                Create team
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
```

Replace `src/components/shell/app-sidebar.tsx`:

```tsx
import { Layers, LogOut, SquareKanban } from "lucide-react";
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import type { Board, Team, User, Workspace } from "@/lib/domain";
import { boardPath } from "@/lib/paths";
import { signOutAction } from "@/server/actions/auth";
import { navItems } from "./nav-items";
import { TeamSwitcher } from "./team-switcher";

export type SidebarWorkspace = Workspace & { boards: Board[] };

export function AppSidebar({
  user,
  team,
  teams,
  workspaces,
}: {
  user: User;
  team: Team;
  teams: Team[];
  workspaces: SidebarWorkspace[];
}) {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <TeamSwitcher current={team} teams={teams} />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems(team.slug).map((item) => (
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
            {workspaces.length === 0 ? (
              <p className="text-muted-foreground px-2 text-xs group-data-[collapsible=icon]:hidden">
                No workspaces yet
              </p>
            ) : (
              <SidebarMenu>
                {workspaces.map((workspace) => (
                  <SidebarMenuItem key={workspace.id}>
                    <SidebarMenuButton asChild tooltip={workspace.name}>
                      <span>
                        <Layers />
                        <span>{workspace.name}</span>
                      </span>
                    </SidebarMenuButton>
                    <SidebarMenuSub>
                      {workspace.boards.map((board) => (
                        <SidebarMenuSubItem key={board.id}>
                          <SidebarMenuSubButton asChild>
                            <Link href={boardPath(team.slug, board.id)}>
                              <SquareKanban />
                              <span>{board.name}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="min-w-0 px-2 text-sm group-data-[collapsible=icon]:hidden">
          <p className="truncate font-medium">{user.name}</p>
          <p className="text-muted-foreground truncate text-xs">{user.email}</p>
        </div>
        <form action={signOutAction}>
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

- [ ] **Step 4: Routes**

```bash
git rm "src/app/(app)/layout.tsx" "src/app/(app)/page.tsx"
mkdir -p "src/app/[team]/board/[boardId]"
```

Create `src/app/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { ONBOARDING_PATH, teamPath } from "@/lib/paths";
import { requireUser } from "@/server/auth/session";
import { getRepositories } from "@/server/data";

// "/" only routes: to the user's first team, or to onboarding if they have none.
export default async function RootPage() {
  const user = await requireUser();
  const [team] = await getRepositories().teams.listForUser(user.id);
  redirect(team ? teamPath(team.slug) : ONBOARDING_PATH);
}
```

Create `src/app/[team]/layout.tsx` (note `min-w-0` — gotcha 3):

```tsx
import { AppHeader } from "@/components/shell/app-header";
import { AppSidebar } from "@/components/shell/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { requireTeamMember } from "@/server/auth/guards";
import { getRepositories } from "@/server/data";

export default async function TeamLayout({ children, params }: LayoutProps<"/[team]">) {
  const { user, team } = await requireTeamMember((await params).team);
  const repos = getRepositories();
  const [teams, workspaces] = await Promise.all([
    repos.teams.listForUser(user.id),
    repos.workspaces.listForTeam(team.id),
  ]);
  const tree = await Promise.all(
    workspaces.map(async (workspace) => ({
      ...workspace,
      boards: await repos.boards.listForWorkspace(workspace.id),
    })),
  );
  const boards = tree.flatMap((workspace) => workspace.boards.map(({ id, name }) => ({ id, name })));

  return (
    <SidebarProvider>
      <AppSidebar user={user} team={team} teams={teams} workspaces={tree} />
      {/* min-w-0 keeps wide content (the board) from pushing the header off-screen. */}
      <SidebarInset className="min-w-0">
        <AppHeader teamSlug={team.slug} boards={boards} />
        <div className="flex min-h-0 flex-1 flex-col p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
```

Create `src/app/[team]/page.tsx`:

```tsx
import type { Metadata } from "next";

export const metadata: Metadata = { title: "My tasks" };

export default function MyTasksPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
      <h1 className="text-2xl font-semibold">My tasks</h1>
      <p className="text-muted-foreground max-w-sm text-sm">
        Tasks assigned to you will show up here once boards come alive in the next milestone.
      </p>
    </div>
  );
}
```

Create `src/app/[team]/board/[boardId]/page.tsx`:

```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { requireTeamMember } from "@/server/auth/guards";
import { getRepositories } from "@/server/data";

export const metadata: Metadata = { title: "Board" };

// Read-only in M1; drag & drop, task dialogs and filters arrive in M2.
export default async function BoardPage({ params }: PageProps<"/[team]/board/[boardId]">) {
  const { team: teamSlug, boardId } = await params;
  const { team } = await requireTeamMember(teamSlug);
  const repos = getRepositories();
  const board = await repos.boards.get(boardId);
  const workspace = board ? await repos.workspaces.get(board.workspaceId) : null;
  if (!board || !workspace || workspace.teamId !== team.id) notFound();

  const [columns, tasks] = await Promise.all([
    repos.boards.listColumns(board.id),
    repos.tasks.listForBoard(board.id),
  ]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div>
        <p className="text-muted-foreground text-sm">{workspace.name}</p>
        <h1 className="text-xl font-semibold">{board.name}</h1>
      </div>
      <div className="flex min-h-0 flex-1 gap-3 overflow-x-auto pb-2">
        {columns.map((column) => {
          const columnTasks = tasks.filter((task) => task.columnId === column.id);
          return (
            <section
              key={column.id}
              aria-label={column.name}
              className="bg-muted/40 flex w-72 shrink-0 flex-col gap-2 rounded-lg border p-2"
            >
              <header className="flex items-center justify-between px-1 py-0.5">
                <h2 className="text-sm font-medium">{column.name}</h2>
                <Badge variant="secondary">{columnTasks.length}</Badge>
              </header>
              {columnTasks.map((task) => (
                <article key={task.id} className="bg-card space-y-1 rounded-md border p-3 text-sm">
                  <p className="text-muted-foreground font-mono text-xs">{task.key}</p>
                  <p>{task.title}</p>
                </article>
              ))}
              {columnTasks.length === 0 && (
                <p className="text-muted-foreground px-1 py-6 text-center text-xs">No tasks</p>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Verify**

Run: `rm -rf .next && pnpm test && pnpm lint && pnpm typecheck && pnpm build`
Expected: 106 tests pass (13 files); build lists `ƒ /`, `ƒ /[team]`, `ƒ /[team]/board/[boardId]` and no Turbopack warnings. Manual: `pnpm dev` → sign in as the demo user → `/acme`; the sidebar shows **Acme**, Engineering → Engineering; the board shows `ENG-1…5` across columns.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(shell): scope the app to a team with switcher, workspace tree and board view"
```

---

### Task 10: E2E coverage, env template, docs, PR

**Files:**
- Create: `e2e/helpers.ts`, `e2e/auth.spec.ts`, `e2e/onboarding.spec.ts`
- Modify: `e2e/shell.spec.ts`, `playwright.config.ts`, `.env.example`, `README.md`, `docs/build-plan.md` (status table)

**Interfaces:**
- Consumes: every accessible name listed in Tasks 7–9.
- Produces: `pnpm test:e2e` with 12 tests, each run on a fresh seeded db (`.data/e2e-db.json`, deleted before the server starts).

- [ ] **Step 1: Playwright config** — isolated db per run

Replace `playwright.config.ts`:

```ts
import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const E2E_DB = ".data/e2e-db.json";

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
    // Each run starts from a freshly seeded mock db, isolated from local dev data.
    command: `rm -f ${E2E_DB} && pnpm build && pnpm start --port ${PORT}`,
    env: { MOCK_DB_PATH: E2E_DB },
    url: `http://localhost:${PORT}/sign-in`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
```

- [ ] **Step 2: Helpers and specs**

Create `e2e/helpers.ts`:

```ts
import { expect, type Page } from "@playwright/test";

// Mirrors DEMO_USER in src/server/data/mock/seed.ts.
export const DEMO = { email: "demo@trackaai.test", password: "demo-password" };

export function uniqueId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export async function fillSignIn(page: Page, email: string, password: string) {
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

export async function signInAsDemo(page: Page) {
  await page.goto("/sign-in");
  await fillSignIn(page, DEMO.email, DEMO.password);
  await expect(page.getByRole("heading", { name: "My tasks" })).toBeVisible();
}

/** Signs up a fresh user and waits for onboarding step 1. Returns the unique id used. */
export async function signUp(page: Page) {
  const id = uniqueId();
  await page.goto("/sign-up");
  await page.getByLabel("Name", { exact: true }).fill(`User ${id}`);
  await page.getByLabel("Email", { exact: true }).fill(`user-${id}@example.test`);
  await page.getByLabel("Password", { exact: true }).fill("password123");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("heading", { name: "Create your team" })).toBeVisible();
  return id;
}

/** From onboarding step 1, creates a team and an "Engineering" workspace; stops at the invite step. */
export async function createTeamAndWorkspace(page: Page, teamName: string) {
  await page.getByLabel("Team name", { exact: true }).fill(teamName);
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Create your first workspace" })).toBeVisible();
  await page.getByLabel("Workspace name", { exact: true }).fill("Engineering");
  await expect(page.getByLabel("Key prefix", { exact: true })).toHaveValue("ENG");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Invite your teammates" })).toBeVisible();
}
```

Replace `e2e/shell.spec.ts`:

```ts
import { expect, test } from "@playwright/test";
import { DEMO, fillSignIn, signInAsDemo } from "./helpers";

test("signed-out visitors are sent to sign-in and back to where they were going", async ({ page }) => {
  await page.goto("/acme?x=1");
  await expect(page).toHaveURL(/\/sign-in\?next=%2Facme%3Fx%3D1$/);
  await fillSignIn(page, DEMO.email, DEMO.password);
  await expect(page).toHaveURL(/\/acme\?x=1$/);
});

test("app is dark by default and the toggle switches to light and persists", async ({ page }) => {
  await signInAsDemo(page);
  const html = page.locator("html");
  await expect(html).toHaveClass(/\bdark\b/);
  await page.getByRole("button", { name: "Toggle theme" }).click();
  await expect(html).not.toHaveClass(/\bdark\b/);
  await page.reload();
  await expect(html).not.toHaveClass(/\bdark\b/);
});

test("command palette opens with the keyboard and jumps to a board", async ({ page }) => {
  await signInAsDemo(page);
  await page.keyboard.press("ControlOrMeta+k");
  await expect(page.getByPlaceholder("Type a command or search…")).toBeVisible();
  await page.getByRole("option", { name: "Engineering" }).click();
  await expect(page).toHaveURL(/\/acme\/board\//);
  await expect(page.getByRole("region", { name: "Backlog" })).toContainText("ENG-1");
});

test("sign out returns to sign-in", async ({ page }) => {
  await signInAsDemo(page);
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
});
```

Create `e2e/auth.spec.ts`:

```ts
import { expect, test } from "@playwright/test";
import { DEMO, fillSignIn, uniqueId } from "./helpers";

test("a wrong password shows an error", async ({ page }) => {
  await page.goto("/sign-in");
  await fillSignIn(page, DEMO.email, "wrong-password");
  await expect(page.getByText("Invalid email or password.")).toBeVisible();
  await expect(page.getByLabel("Email", { exact: true })).toHaveValue(DEMO.email);
});

test("sign-up validates the password and keeps the other fields", async ({ page }) => {
  const email = `ada-${uniqueId()}@example.test`;
  await page.goto("/sign-up");
  await page.getByLabel("Name", { exact: true }).fill("Ada");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill("short");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Use at least 8 characters")).toBeVisible();
  await expect(page.getByLabel("Email", { exact: true })).toHaveValue(email);
});

test("sign-up rejects an email that is already registered", async ({ page }) => {
  await page.goto("/sign-up");
  await page.getByLabel("Name", { exact: true }).fill("Copycat");
  await page.getByLabel("Email", { exact: true }).fill(DEMO.email);
  await page.getByLabel("Password", { exact: true }).fill("password123");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("An account with this email already exists")).toBeVisible();
});

test("a stale session cookie is cleared instead of looping", async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: "tracka_session", value: "ghost.1.bad", url: baseURL! }]);
  await page.goto("/");
  await expect(page).toHaveURL(/\/sign-in$/);
  expect((await context.cookies()).some((c) => c.name === "tracka_session")).toBe(false);
});
```

Create `e2e/onboarding.spec.ts`:

```ts
import { expect, test } from "@playwright/test";
import { createTeamAndWorkspace, signUp } from "./helpers";

const DEFAULT_COLUMNS = ["Backlog", "Todo", "In Progress", "In Review", "Done"];

test("a new user goes from sign-up to a seeded board", async ({ page }) => {
  const id = await signUp(page);
  await createTeamAndWorkspace(page, `Team ${id}`);
  await page.getByRole("link", { name: "Skip for now" }).click();

  await expect(page).toHaveURL(new RegExp(`/team-${id}/board/`));
  await expect(page.getByRole("heading", { name: "Engineering", level: 1 })).toBeVisible();
  for (const column of DEFAULT_COLUMNS) {
    await expect(page.getByRole("region", { name: column })).toContainText("No tasks");
  }
});

test("invites are validated, then sent", async ({ page }) => {
  const id = await signUp(page);
  await createTeamAndWorkspace(page, `Team ${id}`);

  await page.getByLabel("Email addresses").fill("not-an-email");
  await page.getByRole("button", { name: "Send invites" }).click();
  await expect(page.getByText("Enter a valid email")).toBeVisible();

  await page.getByLabel("Email addresses").fill("ann@example.test, bob@example.test");
  await page.getByRole("button", { name: "Send invites" }).click();
  await expect(page).toHaveURL(new RegExp(`/team-${id}/board/`));
});

test("reserved team URLs are rejected and the form keeps its input", async ({ page }) => {
  await signUp(page);
  await page.getByLabel("Team name", { exact: true }).fill("Onboarding");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("This name is reserved")).toBeVisible();
  await expect(page.getByLabel("Team name", { exact: true })).toHaveValue("Onboarding");
});

test("the team switcher lists every team the user belongs to", async ({ page }) => {
  const id = await signUp(page);
  await createTeamAndWorkspace(page, `Alpha ${id}`);
  await page.getByRole("link", { name: "Skip for now" }).click();

  await page.getByRole("button", { name: /Switch team/ }).click();
  await page.getByRole("menuitem", { name: "Create team" }).click();
  await createTeamAndWorkspace(page, `Beta ${id}`);
  await page.getByRole("link", { name: "Skip for now" }).click();

  await page.getByRole("button", { name: /Switch team/ }).click();
  await expect(page.getByRole("menuitem", { name: `Alpha ${id}` })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: `Beta ${id}` })).toBeVisible();
});
```

- [ ] **Step 3: Run**

Run: `pnpm test:e2e`
Expected: `12 passed`. (If a manually started server is on :3100, stop it first — gotcha 8.)

- [ ] **Step 4: Env template**

Replace `.env.example`:

```bash
# Data backend: "mock" (default, M0–M3) or "supabase" (M4+)
DATA_BACKEND=mock

# Mock backend only: JSON file holding all data (seeded with a demo account when missing)
MOCK_DB_PATH=.data/mock-db.json
# Mock backend only: HMAC secret for session cookies (any long random string)
SESSION_SECRET=change-me-to-a-long-random-string
```

- [ ] **Step 5: Docs** — in `README.md` under **Develop**, add: "The mock backend seeds `.data/mock-db.json` on first run with `demo@trackaai.test` / `demo-password`; delete the file to reset." In this file's status table mark M1 `✅ Done` and M2 `Planned when M1 is merged`.

- [ ] **Step 6: Full verification**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e`
Expected: 106 unit + 12 e2e green.

- [ ] **Step 7: Commit, push the branch, open the PR**

```bash
git add -A
git commit -m "test(e2e): cover sign-up, sign-in and onboarding; document mock mode"
git push -u origin m1-mock-data-onboarding
gh pr create --base main --title "M1: mock data layer + onboarding" --body "..."
```
Then confirm CI is green on the PR.

---

## M1 Definition of Done

- Sign up → create team → first workspace → invite or skip → land on a board with Backlog · Todo · In Progress · In Review · Done — covered by e2e.
- Demo account signs in to a seeded Acme board with `ENG-1…5`; the team switcher lists every team and links to creating another.
- All data flows through `getRepositories()`; the mock backend persists to `.data/mock-db.json` and can be reset by deleting it; `DATA_BACKEND=supabase` fails loudly until M4.
- Role checks go through `permissions.ts`; stale session cookies are cleared instead of looping.
- 106 unit tests + 12 e2e tests green locally and in CI.

## Next up: M2

Planned here once M1 is merged: workspace + board CRUD in the sidebar tree, dnd-kit Kanban with fractional positions and optimistic moves, task create dialog (+ quick-add and the `C` shortcut), URL-addressable task sheet (`?task=ENG-12`), labels, comments and board filters.
