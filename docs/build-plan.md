# TrackaAI Build Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** [`docs/prd.md`](./prd.md) · **Roadmap:** [`docs/plan.md`](./plan.md)

This file holds the detailed, task-level plan for the **current** milestone. Each later milestone (M1–M10 in `plan.md`) is appended here as a new section right before work on it starts, so it can build on the real code from the previous one.

| Milestone | Status |
|---|---|
| M0 — Foundation | ✅ Done |
| M1 — Mock data layer + onboarding | ✅ Done |
| M2 — Workspaces, boards & Kanban | ✅ Done |
| M3 — Team & user management | ✅ Done |
| M4 — Supabase (hosted, no Docker) | ✅ Done |
| M5 — Emails (Resend) | ⏭️ Skipped (decision) |
| M6 — Plans & billing (simulated) | ✅ Done |
| M7 — AI I: task writer & breakdown | ✅ Done |
| M8 — AI II: board copilot | ✅ Done |
| M9 — AI III: AI teammate | ✅ Done |
| M10 — Hardening & launch | 🚧 In progress (speed, errors, a11y, rate limits, worker token done; deploy left) |

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

---

# M2 — Workspaces, boards & Kanban Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The full task lifecycle on mock data: workspace and board CRUD from the sidebar; a drag & drop Kanban (cards within/across columns, column reordering) with optimistic updates; column add/rename/delete; a create-task dialog (also on `C`) and per-column quick-add; a URL-addressable task sheet (`?task=ENG-12`) with status, priority, assignee, labels, due date, Markdown description and comments; board filters (assignee, priority, labels, search) kept in the URL; and a real **My tasks** page.

**Architecture:** Server Actions in `src/server/actions/{workspaces,boards,tasks,comments}.ts` resolve every id to its team through new guards (`requireWorkspaceAccess` / `requireBoardAccess` / `requireColumnAccess` / `requireTaskAccess`), check roles with `permissions.ts`, mutate through the repositories, then call Next 16's `refresh()` (or `revalidatePath(…, "layout")` + `redirect` when navigating). The board is one client component (`BoardView`) that keeps `useOptimistic` copies of tasks and columns (pure reducers in `board-state.ts`), runs every mutation in one `useTransition` (its pending flag is `aria-busy` + a "Saving…" status), and uses dnd-kit (`@dnd-kit/core` + `sortable`). The server — not the client — computes fractional positions inside a single store write from a target **index**, so concurrent moves can't collide; `indexInFullList` maps a drop among filtered (visible) cards back to an index in the full column.

**Product decisions to confirm in review:**
- Every new team gets four labels (Bug, Feature, Improvement, Docs); creating/editing labels arrives with team settings in M3.
- Members can create, edit, move and delete tasks and comment; owners/admins additionally manage workspaces, boards and columns and can delete anyone's comment.
- Quick-add inserts at the **top** of a column; the dialog and status changes append at the **bottom**.
- A column can only be deleted when empty and never the last one; deleting a board or workspace cascades after a confirmation dialog.
- A workspace's key prefix can't be changed (task keys stay stable); the PRD's workspace icon is deferred.
- Assignees are team members only (AI teammates arrive in M9); sub-task UI arrives with the AI breakdown in M7.

**New dependencies:** `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`, `react-markdown`, `remark-gfm`; shadcn `select`, `tabs`, `alert-dialog`.

## Global Constraints

- Everything in M0/M1's Global Constraints still applies. Branch: `git switch -c m2-kanban` from an up-to-date `main`; finish with a PR.
- Read `node_modules/next/dist/docs/01-app/02-guides/interactive-apps.md` (optimistic UI, transitions, form lifecycle) before Tasks 6–7 (AGENTS.md).
- Server actions called from event handlers return `ActionResult` (`{ ok } | { ok: false, error }`) for a toast; form actions return `FormState` (now with `ok` so dialogs can close).
- Nothing on the board mutates without an optimistic update **and** an error toast when the server refuses (the optimistic state then reverts on its own).

## Verified gotchas (found while dry-running this plan)

1. A server action that ends in `redirect()` keeps the shared `[team]` layout, so the sidebar stayed stale after creating a workspace/board → call `revalidatePath(teamPath(slug), "layout")` before redirecting. Actions that stay on the page use `refresh()` from `next/cache`.
2. E2E reloads right after a drop raced the still-running server action (the optimistic order showed, then reverted after reload) → the board sets `aria-busy` while its mutation transition is pending, and the `saved(page)` helper waits for it before every reload.
3. Optimistic quick-add tasks and new columns carry temporary `draft-…` ids until `refresh()` replaces them; clicking a draft column's menu raced its replacement → drafts are `aria-busy`, can't be dragged and hide their actions.
4. Radix focuses the first input when a sheet opens and *selects its text* (the task title) → `onOpenAutoFocus` prevents that and focuses the panel instead.
5. While the (modal) task sheet is open, Radix hides the rest of the page from the accessibility tree; Playwright `getByRole` can't see the board until the sheet closes (Escape).
6. A controlled, debounced search input fought URL changes (e.g. Back) by re-pushing its stale local query → the input is uncontrolled and the debounce timer reads the latest filters from a ref.
7. `useSortable({ disabled: true })` also disables *dropping* → columns use `disabled: { draggable: !canEdit, droppable: false }` so members can still drop cards into them.
8. `mock-db.json` files from M1 have no `labels`/`comments` arrays → the store merges loaded files over `emptyDb()`. Teams created before M2 have no labels; delete `.data/` to reseed.
9. `shadcn add select tabs alert-dialog` re-touches `button.tsx`; after the M0 gotcha-4 `cn` rewrite it's byte-identical again.

Preventive (known library behaviour, not observed failing): a stable `id` on `DndContext` keeps its generated ARIA ids identical between SSR and hydration; `draggable={false}` on the card's stretched `<Link>` stops the browser's native link drag from cancelling dnd-kit's pointer events.

## File map (end of M2)

```
src/
  app/[team]/page.tsx                        My tasks list (Task 7)
  app/[team]/layout.tsx                      passes canManage to the sidebar (Task 7)
  app/[team]/board/[boardId]/page.tsx        loads board data, opens ?task= (Task 6)
  app/globals.css                            --label-* colour tokens (Task 5)
  components/
    board/board-state.ts (+test)             optimistic reducers, planTaskMove (Task 5)
    board/board-view.tsx                     BoardView: dnd, optimistic state, wiring (Task 6)
    board/board-column.tsx, task-card.tsx, inline-input.tsx       (Task 6)
    board/board-toolbar.tsx, board-header.tsx                     (Task 6)
    board/create-task-dialog.tsx, task-sheet.tsx                  (Task 6)
    tasks/priority.tsx, label-chip.tsx, member-avatar.tsx, markdown.tsx   (Task 5)
    forms/use-form-action.ts, fields.tsx (+SelectField)                   (Task 5)
    shell/workspace-actions.tsx, board-link.tsx, app-sidebar.tsx          (Task 7)
    onboarding/create-workspace-form.tsx     takes the action as a prop (Task 7)
    ui/select.tsx, tabs.tsx, alert-dialog.tsx  shadcn (Task 5)
  lib/
    domain/positions.ts (+test)              byPosition, positionAt, indexInFullList (Task 1)
    domain/board-filters.ts (+test)          parse/serialize/filter (Task 1)
    domain/task-refs.ts (+test)              invalidTaskRef (Task 1)
    domain/schemas.ts, constants.ts          labels, comments, update inputs (Task 1)
    forms.ts                                 + ok, ActionResult (Task 4)
  server/
    actions/shared.ts                        helpers for the action modules (Task 4)
    actions/workspaces.ts, boards.ts, tasks.ts, comments.ts        (Task 4)
    auth/guards.ts                           entity → team access guards (Task 4)
    auth/permissions.ts (+test)              new actions (Task 3)
    data/types.ts                            + labels, comments, column/task ops (Task 2)
    data/mock/{db,store,repositories,seed}.ts (+tests)             (Tasks 2–3)
e2e/helpers.ts, board.spec.ts                (Task 8)
```

---

### Task 1: Domain — ordering, filters, task refs, labels & comments

**Files:**
- Create: `src/lib/domain/positions.ts`, `src/lib/domain/board-filters.ts`, `src/lib/domain/task-refs.ts` (+ a `.test.ts` for each)
- Modify: `src/lib/domain/constants.ts`, `src/lib/domain/schemas.ts`, `src/lib/domain/schemas.test.ts`, `src/lib/domain/index.ts`

**Interfaces:**
- Produces: `byPosition`, `positionAt(sortedPositions, index)`, `indexInFullList(fullIds, visibleIdsAfterDrop, movedId)`; `type BoardFilters`, `EMPTY_FILTERS`, `parseBoardFilters(params)`, `serializeBoardFilters(filters, base?)` (URL keys `assignee`, `priority`, `label`, `q`; keeps other params such as `task`), `isFiltered`, `filterTasks(tasks, filters, currentUserId)`; `invalidTaskRef(patch, { memberIds, labelIds }) → "assignee" | "labelIds" | null`; `LABEL_COLORS`, `DEFAULT_LABELS`; schemas/types `labelSchema`/`Label`, `LabelColor`, `commentSchema`/`Comment`, `CommentAuthor`, `updateWorkspaceInputSchema`, `updateBoardInputSchema`, `columnNameSchema`, `createCommentInputSchema`.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/domain/positions.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { byPosition, indexInFullList, positionAt } from "./positions";

describe("positionAt", () => {
  const sorted = ["a0", "a1", "a2"];

  it("places items at the start, between neighbours and at the end", () => {
    expect(positionAt(sorted, 0) < "a0").toBe(true);
    const middle = positionAt(sorted, 1);
    expect(middle > "a0" && middle < "a1").toBe(true);
    expect(positionAt(sorted, 3) > "a2").toBe(true);
  });

  it("clamps out-of-range indexes and handles an empty list", () => {
    expect(positionAt(sorted, -5) < "a0").toBe(true);
    expect(positionAt(sorted, 99) > "a2").toBe(true);
    expect(typeof positionAt([], 0)).toBe("string");
  });
});

describe("byPosition", () => {
  it("sorts by code unit, not locale", () => {
    const items = [{ position: "a" }, { position: "Zz" }, { position: "a0" }];
    expect([...items].sort(byPosition).map((i) => i.position)).toEqual(["Zz", "a", "a0"]);
  });
});

describe("indexInFullList", () => {
  const full = ["t1", "t2", "t3", "t4"]; // column order, moved item excluded

  it("uses the visible neighbour before the drop point", () => {
    // Visible (filtered) list after the drop: t1, X, t4 → X goes right after t1.
    expect(indexInFullList(full, ["t1", "X", "t4"], "X")).toBe(1);
  });

  it("uses the neighbour after when dropped first", () => {
    expect(indexInFullList(full, ["X", "t3"], "X")).toBe(2);
  });

  it("appends when the visible list has no other items", () => {
    expect(indexInFullList(full, ["X"], "X")).toBe(4);
    expect(indexInFullList([], ["X"], "X")).toBe(0);
  });

  it("matches the visible index when nothing is filtered", () => {
    expect(indexInFullList(full, ["t1", "t2", "X", "t3", "t4"], "X")).toBe(2);
  });
});
```

Create `src/lib/domain/board-filters.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  EMPTY_FILTERS,
  filterTasks,
  isFiltered,
  parseBoardFilters,
  serializeBoardFilters,
  type BoardFilters,
} from "./board-filters";
import type { Task } from "./schemas";

function task(overrides: Partial<Task>): Task {
  return {
    id: "t",
    boardId: "b",
    columnId: "c",
    number: 1,
    key: "ENG-1",
    title: "Task",
    description: "",
    priority: "none",
    assignee: null,
    labelIds: [],
    dueDate: null,
    position: "a0",
    parentId: null,
    createdBy: "u1",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

const TASKS = [
  task({ id: "a", key: "ENG-1", title: "Fix login", priority: "high", assignee: { kind: "user", userId: "me" }, labelIds: ["bug"] }),
  task({ id: "b", key: "ENG-2", title: "Write docs", priority: "low", assignee: { kind: "user", userId: "ann" }, labelIds: ["docs"] }),
  task({ id: "c", key: "ENG-3", title: "Refactor", priority: "none" }),
];

const ids = (filters: Partial<BoardFilters>) =>
  filterTasks(TASKS, { ...EMPTY_FILTERS, ...filters }, "me").map((t) => t.id);

describe("filterTasks", () => {
  it("returns everything without filters", () => {
    expect(ids({})).toEqual(["a", "b", "c"]);
  });

  it("filters by assignee: me, unassigned or a specific user", () => {
    expect(ids({ assignee: "me" })).toEqual(["a"]);
    expect(ids({ assignee: "none" })).toEqual(["c"]);
    expect(ids({ assignee: "ann" })).toEqual(["b"]);
  });

  it("matches any selected priority and any selected label", () => {
    expect(ids({ priorities: ["high", "none"] })).toEqual(["a", "c"]);
    expect(ids({ labelIds: ["docs", "bug"] })).toEqual(["a", "b"]);
  });

  it("searches title and key, case-insensitively", () => {
    expect(ids({ query: "login" })).toEqual(["a"]);
    expect(ids({ query: "eng-3" })).toEqual(["c"]);
  });

  it("combines filters with AND", () => {
    expect(ids({ priorities: ["high", "low"], labelIds: ["docs"] })).toEqual(["b"]);
  });
});

describe("URL round-trip", () => {
  it("parses known values and drops unknown priorities", () => {
    const params = new URLSearchParams("assignee=me&priority=high,bogus,low&label=l1,l2&q=%20login%20&task=ENG-1");
    expect(parseBoardFilters(params)).toEqual({
      assignee: "me",
      priorities: ["high", "low"],
      labelIds: ["l1", "l2"],
      query: "login",
    });
  });

  it("writes only non-default filters and keeps other params", () => {
    const base = new URLSearchParams("task=ENG-1&priority=urgent");
    const next = serializeBoardFilters({ ...EMPTY_FILTERS, priorities: ["high"], query: "x" }, base);
    expect(next.toString()).toBe("task=ENG-1&priority=high&q=x");
    expect(serializeBoardFilters(EMPTY_FILTERS, base).toString()).toBe("task=ENG-1");
  });

  it("knows when any filter is active", () => {
    expect(isFiltered(EMPTY_FILTERS)).toBe(false);
    expect(isFiltered({ ...EMPTY_FILTERS, query: "x" })).toBe(true);
  });
});
```

Create `src/lib/domain/task-refs.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { invalidTaskRef } from "./task-refs";

const context = { memberIds: new Set(["u1"]), labelIds: new Set(["l1", "l2"]) };

describe("invalidTaskRef", () => {
  it("accepts members, team labels, null assignees and untouched fields", () => {
    expect(invalidTaskRef({ assignee: { kind: "user", userId: "u1" }, labelIds: ["l1"] }, context)).toBeNull();
    expect(invalidTaskRef({ assignee: null }, context)).toBeNull();
    expect(invalidTaskRef({}, context)).toBeNull();
  });

  it("rejects non-members, agents (until M9) and foreign labels", () => {
    expect(invalidTaskRef({ assignee: { kind: "user", userId: "x" } }, context)).toBe("assignee");
    expect(invalidTaskRef({ assignee: { kind: "agent", agentId: "a1" } }, context)).toBe("assignee");
    expect(invalidTaskRef({ labelIds: ["l1", "other"] }, context)).toBe("labelIds");
  });
});
```

Replace `src/lib/domain/schemas.test.ts` (M1 tests plus labels and comments):

```ts
import { describe, expect, it } from "vitest";
import {
  assigneeSchema,
  createCommentInputSchema,
  createInvitesInputSchema,
  createTaskInputSchema,
  keyPrefixSchema,
  labelSchema,
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

describe("labels and comments", () => {
  it("accepts palette colours only", () => {
    expect(labelSchema.safeParse({ id: "l", teamId: "t", name: "Bug", color: "red" }).success).toBe(true);
    expect(labelSchema.safeParse({ id: "l", teamId: "t", name: "Bug", color: "#ff0000" }).success).toBe(false);
  });

  it("trims comment bodies and rejects blank ones", () => {
    expect(createCommentInputSchema.parse({ taskId: "t", body: "  hi  " })).toEqual({ taskId: "t", body: "hi" });
    expect(createCommentInputSchema.safeParse({ taskId: "t", body: "   " }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm test src/lib/domain`
Expected: FAIL — `Failed to resolve import "./positions"` (and `./board-filters`, `./task-refs`); `labelSchema` is undefined.

- [ ] **Step 3: Implement**

Create `src/lib/domain/positions.ts`:

```ts
import { generateKeyBetween } from "fractional-indexing";

// Fractional-index keys compare by code unit, never by locale.
export function byPosition(a: { position: string }, b: { position: string }): number {
  return a.position < b.position ? -1 : a.position > b.position ? 1 : 0;
}

/** A key that sorts at `index` within `sortedPositions` (clamped to the list). */
export function positionAt(sortedPositions: readonly string[], index: number): string {
  const i = Math.max(0, Math.min(index, sortedPositions.length));
  return generateKeyBetween(sortedPositions[i - 1] ?? null, sortedPositions[i] ?? null);
}

/**
 * Where a dropped item lands in the full, unfiltered column (`fullIds`, moved
 * item excluded), given the visible list after the drop (`visibleIds`, moved
 * item included). Anchors on the visible neighbour before the drop point, else
 * the one after, else appends.
 */
export function indexInFullList(fullIds: readonly string[], visibleIds: readonly string[], movedId: string): number {
  const at = visibleIds.indexOf(movedId);
  const before = visibleIds.slice(0, at).reverse().find((id) => fullIds.includes(id));
  if (before) return fullIds.indexOf(before) + 1;
  const after = visibleIds.slice(at + 1).find((id) => fullIds.includes(id));
  if (after) return fullIds.indexOf(after);
  return fullIds.length;
}
```

Create `src/lib/domain/board-filters.ts`:

```ts
import { PRIORITIES, type Priority, type Task } from "./schemas";

/** `assignee` is "any", "me", "none" (unassigned) or a user id. */
export type BoardFilters = {
  assignee: string;
  priorities: Priority[];
  labelIds: string[];
  query: string;
};

export const EMPTY_FILTERS: BoardFilters = { assignee: "any", priorities: [], labelIds: [], query: "" };

const list = (value: string | null) => (value ? value.split(",").filter(Boolean) : []);

export function parseBoardFilters(params: URLSearchParams): BoardFilters {
  return {
    assignee: params.get("assignee") || "any",
    priorities: list(params.get("priority")).filter((p): p is Priority =>
      (PRIORITIES as readonly string[]).includes(p),
    ),
    labelIds: list(params.get("label")),
    query: (params.get("q") ?? "").trim(),
  };
}

/** Returns `base` with the filter params replaced; unrelated params (e.g. `task`) are kept. */
export function serializeBoardFilters(filters: BoardFilters, base = new URLSearchParams()): URLSearchParams {
  const params = new URLSearchParams(base);
  for (const key of ["assignee", "priority", "label", "q"]) params.delete(key);
  if (filters.assignee !== "any") params.set("assignee", filters.assignee);
  if (filters.priorities.length) params.set("priority", filters.priorities.join(","));
  if (filters.labelIds.length) params.set("label", filters.labelIds.join(","));
  if (filters.query) params.set("q", filters.query);
  return params;
}

export function isFiltered(filters: BoardFilters): boolean {
  return serializeBoardFilters(filters).size > 0;
}

export function filterTasks(tasks: Task[], filters: BoardFilters, currentUserId: string): Task[] {
  const query = filters.query.toLowerCase();
  const assigneeId = filters.assignee === "me" ? currentUserId : filters.assignee;

  return tasks.filter((task) => {
    if (filters.assignee === "none" && task.assignee !== null) return false;
    if (filters.assignee !== "any" && filters.assignee !== "none") {
      if (task.assignee?.kind !== "user" || task.assignee.userId !== assigneeId) return false;
    }
    if (filters.priorities.length && !filters.priorities.includes(task.priority)) return false;
    if (filters.labelIds.length && !task.labelIds.some((id) => filters.labelIds.includes(id))) return false;
    if (query && !task.title.toLowerCase().includes(query) && !task.key.toLowerCase().includes(query)) {
      return false;
    }
    return true;
  });
}
```

Create `src/lib/domain/task-refs.ts`:

```ts
import type { UpdateTaskInput } from "./schemas";

/**
 * Returns the first field of a task patch that points outside the team
 * (assignee not a member, label from another team), or null if all is well.
 * AI-agent assignees are rejected until agents exist (M9).
 */
export function invalidTaskRef(
  patch: Pick<UpdateTaskInput, "assignee" | "labelIds">,
  context: { memberIds: ReadonlySet<string>; labelIds: ReadonlySet<string> },
): "assignee" | "labelIds" | null {
  if (patch.assignee && (patch.assignee.kind !== "user" || !context.memberIds.has(patch.assignee.userId))) {
    return "assignee";
  }
  if (patch.labelIds?.some((id) => !context.labelIds.has(id))) return "labelIds";
  return null;
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

// Label colours map to --label-<name> CSS variables in globals.css.
export const LABEL_COLORS = ["gray", "red", "orange", "yellow", "green", "blue", "purple", "pink"] as const;

// Seeded on every new team; editable from team settings in M3.
export const DEFAULT_LABELS = [
  { name: "Bug", color: "red" },
  { name: "Feature", color: "purple" },
  { name: "Improvement", color: "blue" },
  { name: "Docs", color: "gray" },
] as const;
```

Replace `src/lib/domain/schemas.ts`:

```ts
import { z } from "zod";
import { LABEL_COLORS, MAX_INVITES_PER_BATCH, RESERVED_SLUGS } from "./constants";

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

export const labelColorSchema = z.enum(LABEL_COLORS);

export const labelSchema = z.object({
  id: idSchema,
  teamId: idSchema,
  name: z.string().trim().min(1).max(30),
  color: labelColorSchema,
});

export const commentAuthorSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("user"), userId: idSchema }),
  z.object({ kind: z.literal("agent"), agentId: idSchema }),
]);

export const commentSchema = z.object({
  id: idSchema,
  taskId: idSchema,
  author: commentAuthorSchema,
  body: z.string().trim().min(1, "Write something first").max(10_000),
  createdAt: timestampSchema,
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

export const updateWorkspaceInputSchema = workspaceSchema.pick({ name: true });

export const updateBoardInputSchema = boardSchema.pick({ name: true, description: true }).partial();

export const columnNameSchema = columnSchema.shape.name;

export const createCommentInputSchema = commentSchema.pick({ taskId: true, body: true });

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
export type LabelColor = z.infer<typeof labelColorSchema>;
export type Label = z.infer<typeof labelSchema>;
export type CommentAuthor = z.infer<typeof commentAuthorSchema>;
export type Comment = z.infer<typeof commentSchema>;
export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceInputSchema>;
export type UpdateBoardInput = z.infer<typeof updateBoardInputSchema>;
export type CreateCommentInput = z.infer<typeof createCommentInputSchema>;
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

Replace `src/lib/domain/index.ts`:

```ts
export * from "./constants";
export * from "./schemas";
export * from "./task-key";
export * from "./text";
export * from "./board-filters";
export * from "./positions";
export * from "./task-refs";
```

- [ ] **Step 4: Verify**

Run: `pnpm test && pnpm lint && pnpm typecheck`
Expected: 125 tests pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(domain): add ordering, board filters, task refs, labels and comments"
```

---

### Task 2: Data layer — labels, comments, column ops, index-based moves, cascades

**Files:**
- Modify: `src/server/data/types.ts`, `src/server/data/mock/db.ts`, `src/server/data/mock/store.ts`, `src/server/data/mock/store.test.ts`, `src/server/data/mock/repositories.ts`, `src/server/data/mock/repositories.test.ts`

**Interfaces:**
- Produces: `type TeamMember = Membership & { user }`; `teams.get`; `memberships.listMembers`; `workspaces.update`/`delete`; `boards.update`/`delete`/`getColumn`/`createColumn`/`renameColumn`/`moveColumn(id, index)`/`deleteColumn` (ConflictError when it has tasks or is the last); `tasks.create({ …, placement?: "start" | "end" })`, `tasks.get`, `tasks.listAssignedTo(teamId, userId)`, `tasks.move(id, { columnId, index })` (**replaces** M1's `{ columnId, position }`), `tasks.delete` (comments go too; sub-tasks detach); `labels.listForTeam`; `comments.listForTask`/`get`/`create`/`delete`. `teams.create` seeds `DEFAULT_LABELS`. Stored files missing newer collections load with them defaulted (gotcha 8).

- [ ] **Step 1: Write the failing tests**

Replace `src/server/data/mock/repositories.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_COLUMNS, DEFAULT_LABELS, createTaskInputSchema, type User } from "@/lib/domain";
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
    const moved = await repos.tasks.move(task.id, { columnId: columns[2].id, index: 0 });
    expect(moved.columnId).toBe(columns[2].id);
    expect(await repos.tasks.get(task.id)).toEqual(moved);
  });

  it("inserts quick-added tasks at the start and moves by index", async () => {
    const { board, columns } = await setupBoard();
    const [todo] = columns;
    const a = await repos.tasks.create(taskInput(board.id, todo.id, "A"));
    const b = await repos.tasks.create(taskInput(board.id, todo.id, "B"));
    const top = await repos.tasks.create({ ...taskInput(board.id, todo.id, "Top"), placement: "start" });
    const titles = async () => (await repos.tasks.listForBoard(board.id)).map((t) => t.title);
    expect(await titles()).toEqual(["Top", "A", "B"]);

    await repos.tasks.move(top.id, { columnId: todo.id, index: 2 }); // index among the others
    expect(await titles()).toEqual(["A", "B", "Top"]);
    await repos.tasks.move(b.id, { columnId: todo.id, index: 0 });
    expect(await titles()).toEqual(["B", "A", "Top"]);
    expect(a.key).toBe("ENG-1");
  });

  it("deletes a task with its comments and detaches sub-tasks", async () => {
    const { board, columns } = await setupBoard();
    const parent = await repos.tasks.create(taskInput(board.id, columns[0].id, "Parent"));
    const child = await repos.tasks.create({
      ...taskInput(board.id, columns[0].id, "Child"),
      parentId: parent.id,
    });
    await repos.comments.create({ taskId: parent.id, body: "hi", author: { kind: "user", userId: owner.id } });
    await repos.tasks.delete(parent.id);
    expect(await repos.tasks.get(parent.id)).toBeNull();
    expect((await repos.tasks.get(child.id))?.parentId).toBeNull();
    expect(await repos.comments.listForTask(parent.id)).toEqual([]);
  });

  it("lists tasks assigned to a user across the team's boards", async () => {
    const { team, board, columns } = await setupBoard();
    const mine = await repos.tasks.create({
      ...taskInput(board.id, columns[0].id, "Mine"),
      assignee: { kind: "user", userId: owner.id },
    });
    await repos.tasks.create(taskInput(board.id, columns[0].id, "Nobody's"));
    expect((await repos.tasks.listAssignedTo(team.id, owner.id)).map((t) => t.id)).toEqual([mine.id]);
  });
});

describe("columns", () => {
  it("adds, renames and reorders columns", async () => {
    const { board } = await setupBoard();
    const added = await repos.boards.createColumn(board.id, "QA");
    await repos.boards.renameColumn(added.id, "Testing");
    await repos.boards.moveColumn(added.id, 0);
    const names = (await repos.boards.listColumns(board.id)).map((c) => c.name);
    expect(names).toEqual(["Testing", ...DEFAULT_COLUMNS]);
    expect(await repos.boards.getColumn(added.id)).toMatchObject({ name: "Testing" });
  });

  it("refuses to delete a column that still has tasks, or the last column", async () => {
    const { board, columns } = await setupBoard();
    await repos.tasks.create(taskInput(board.id, columns[0].id, "Busy"));
    await expect(repos.boards.deleteColumn(columns[0].id)).rejects.toBeInstanceOf(ConflictError);
    for (const column of columns.slice(1, -1)) await repos.boards.deleteColumn(column.id);
    await repos.tasks.delete((await repos.tasks.listForBoard(board.id))[0].id);
    await repos.boards.deleteColumn(columns[0].id);
    const [last] = await repos.boards.listColumns(board.id);
    await expect(repos.boards.deleteColumn(last.id)).rejects.toBeInstanceOf(ConflictError);
  });
});

describe("updates and cascading deletes", () => {
  it("renames workspaces and boards", async () => {
    const { workspace, board } = await setupBoard();
    expect(await repos.workspaces.update(workspace.id, { name: "Platform" })).toMatchObject({ name: "Platform" });
    expect(await repos.boards.update(board.id, { description: "Sprint work" })).toMatchObject({
      name: "Eng",
      description: "Sprint work",
    });
  });

  it("deleting a workspace removes its boards, columns and tasks", async () => {
    const { workspace, board, columns } = await setupBoard();
    const task = await repos.tasks.create(taskInput(board.id, columns[0].id, "Gone"));
    await repos.workspaces.delete(workspace.id);
    expect(await repos.workspaces.get(workspace.id)).toBeNull();
    expect(await repos.boards.get(board.id)).toBeNull();
    expect(await repos.boards.listColumns(board.id)).toEqual([]);
    expect(await repos.tasks.get(task.id)).toBeNull();
  });

  it("deleting a board keeps its workspace", async () => {
    const { workspace, board } = await setupBoard();
    await repos.boards.delete(board.id);
    expect(await repos.boards.listForWorkspace(workspace.id)).toEqual([]);
    expect(await repos.workspaces.get(workspace.id)).not.toBeNull();
  });
});

describe("labels, comments and members", () => {
  it("seeds the default labels on team creation", async () => {
    const { team } = await setupBoard();
    const labels = await repos.labels.listForTeam(team.id);
    expect(labels.map((l) => l.name)).toEqual(DEFAULT_LABELS.map((l) => l.name));
  });

  it("stores comments oldest first", async () => {
    const { board, columns } = await setupBoard();
    const task = await repos.tasks.create(taskInput(board.id, columns[0].id, "Talk"));
    const author = { kind: "user" as const, userId: owner.id };
    const first = await repos.comments.create({ taskId: task.id, body: "first", author });
    await repos.comments.create({ taskId: task.id, body: "second", author });
    expect((await repos.comments.listForTask(task.id)).map((c) => c.body)).toEqual(["first", "second"]);
    expect(await repos.comments.get(first.id)).toEqual(first);
    await repos.comments.delete(first.id);
    expect((await repos.comments.listForTask(task.id)).map((c) => c.body)).toEqual(["second"]);
  });

  it("lists members with their user records", async () => {
    const { team } = await setupBoard();
    expect(await repos.teams.get(team.id)).toEqual(team);
    const [member] = await repos.memberships.listMembers(team.id);
    expect(member).toMatchObject({ role: "owner", user: { id: owner.id, name: "Owner" } });
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

Replace `src/server/data/mock/store.test.ts`:

```ts
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { emptyDb, type MockDb } from "./db";
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

  it("fills in collections added after the file was written", async () => {
    const older: Partial<MockDb> = emptyDb();
    delete older.labels;
    delete older.comments;
    await createFileStore(file, () => older as MockDb).read(() => null);
    const store = createFileStore(file, emptyDb);
    expect(await store.read((db) => [db.labels, db.comments])).toEqual([[], []]);
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

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm test src/server/data`
Expected: FAIL — 13 tests (e.g. `repos.tasks.get is not a function`, `repos.labels` undefined, `db.labels` undefined).

- [ ] **Step 3: Implement**

Replace `src/server/data/types.ts`:

```ts
import type {
  Board,
  Column,
  Comment,
  CommentAuthor,
  CreateCommentInput,
  CreateBoardInput,
  CreateInvitesInput,
  CreateTaskInput,
  CreateTeamInput,
  CreateWorkspaceInput,
  Invite,
  Label,
  Membership,
  Role,
  SignInInput,
  SignUpInput,
  Task,
  Team,
  UpdateBoardInput,
  UpdateTaskInput,
  UpdateWorkspaceInput,
  User,
  Workspace,
} from "@/lib/domain";

export type TeamMember = Membership & { user: User };

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
  /** Creates the team, makes `ownerId` its owner and seeds DEFAULT_LABELS. */
  create(input: CreateTeamInput & { ownerId: string }): Promise<Team>;
  get(id: string): Promise<Team | null>;
  getBySlug(slug: string): Promise<Team | null>;
  listForUser(userId: string): Promise<Team[]>;
}

export interface MembershipsRepo {
  list(teamId: string): Promise<Membership[]>;
  get(teamId: string, userId: string): Promise<Membership | null>;
  /** Memberships joined with their users, ordered by name. */
  listMembers(teamId: string): Promise<TeamMember[]>;
  setRole(teamId: string, userId: string, role: Role): Promise<Membership>;
  remove(teamId: string, userId: string): Promise<void>;
}

export interface WorkspacesRepo {
  create(input: CreateWorkspaceInput): Promise<Workspace>;
  get(id: string): Promise<Workspace | null>;
  listForTeam(teamId: string): Promise<Workspace[]>;
  update(id: string, patch: UpdateWorkspaceInput): Promise<Workspace>;
  /** Deletes the workspace with all of its boards, columns, tasks and comments. */
  delete(id: string): Promise<void>;
}

export interface BoardsRepo {
  /** Creates the board and seeds DEFAULT_COLUMNS. */
  create(input: CreateBoardInput): Promise<Board>;
  get(id: string): Promise<Board | null>;
  listForWorkspace(workspaceId: string): Promise<Board[]>;
  update(id: string, patch: UpdateBoardInput): Promise<Board>;
  /** Deletes the board with its columns, tasks and comments. */
  delete(id: string): Promise<void>;
  listColumns(boardId: string): Promise<Column[]>;
  getColumn(id: string): Promise<Column | null>;
  /** Appends a column at the end of the board. */
  createColumn(boardId: string, name: string): Promise<Column>;
  renameColumn(id: string, name: string): Promise<Column>;
  /** Moves the column to `index` among the board's other columns. */
  moveColumn(id: string, index: number): Promise<Column>;
  /** Throws ConflictError("column") if the column still has tasks or is the board's last. */
  deleteColumn(id: string): Promise<void>;
}

export interface TasksRepo {
  /**
   * Allocates the next task number for the board's workspace and places the
   * task at the end of its column (or the start, for quick-add).
   */
  create(input: CreateTaskInput & { createdBy: string; placement?: "start" | "end" }): Promise<Task>;
  get(id: string): Promise<Task | null>;
  getByKey(workspaceId: string, key: string): Promise<Task | null>;
  listForBoard(boardId: string): Promise<Task[]>;
  /** Tasks in any of the team's boards assigned to the user, most recently updated first. */
  listAssignedTo(teamId: string, userId: string): Promise<Task[]>;
  update(id: string, patch: UpdateTaskInput): Promise<Task>;
  /** Moves the task to `index` among the other tasks of `columnId` (same board). */
  move(id: string, to: { columnId: string; index: number }): Promise<Task>;
  /** Deletes the task and its comments; its sub-tasks become top-level. */
  delete(id: string): Promise<void>;
}

export interface LabelsRepo {
  listForTeam(teamId: string): Promise<Label[]>;
}

export interface CommentsRepo {
  /** Oldest first. */
  listForTask(taskId: string): Promise<Comment[]>;
  get(id: string): Promise<Comment | null>;
  create(input: CreateCommentInput & { author: CommentAuthor }): Promise<Comment>;
  delete(id: string): Promise<void>;
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
  labels: LabelsRepo;
  comments: CommentsRepo;
}
```

Replace `src/server/data/mock/db.ts`:

```ts
import type {
  Board,
  Column,
  Comment,
  Invite,
  Label,
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
  labels: Label[];
  comments: Comment[];
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
    labels: [],
    comments: [],
  };
}
```

Replace `src/server/data/mock/store.ts`:

```ts
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { emptyDb, type MockDb } from "./db";

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
      // Files written by an older milestone lack newer collections; default them.
      return { ...emptyDb(), ...(JSON.parse(await readFile(filePath, "utf8")) as Partial<MockDb>) };
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

Replace `src/server/data/mock/repositories.ts`:

```ts
import { randomBytes, randomUUID } from "node:crypto";
import { generateNKeysBetween } from "fractional-indexing";
import {
  DEFAULT_COLUMNS,
  DEFAULT_LABELS,
  INVITE_TTL_DAYS,
  byPosition,
  formatTaskKey,
  positionAt,
  type Column,
  type Comment,
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

/** Sorted positions of a column's tasks, optionally leaving one task out (the one being moved). */
function taskPositions(db: MockDb, columnId: string, excludeId?: string): string[] {
  return db.tasks
    .filter((t) => t.columnId === columnId && t.id !== excludeId)
    .sort(byPosition)
    .map((t) => t.position);
}

function deleteTasks(db: MockDb, taskIds: Set<string>) {
  db.tasks = db.tasks.filter((t) => !taskIds.has(t.id));
  db.comments = db.comments.filter((c) => !taskIds.has(c.taskId));
  for (const task of db.tasks) {
    if (task.parentId && taskIds.has(task.parentId)) task.parentId = null;
  }
}

function deleteBoards(db: MockDb, boardIds: Set<string>) {
  deleteTasks(db, new Set(db.tasks.filter((t) => boardIds.has(t.boardId)).map((t) => t.id)));
  db.columns = db.columns.filter((c) => !boardIds.has(c.boardId));
  db.boards = db.boards.filter((b) => !boardIds.has(b.id));
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
          for (const label of DEFAULT_LABELS) db.labels.push({ id: newId(), teamId: team.id, ...label });
          return team;
        }),
      get: (id) => store.read((db) => db.teams.find((t) => t.id === id) ?? null),
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
      listMembers: (teamId) =>
        store.read((db) =>
          db.memberships
            .filter((m) => m.teamId === teamId)
            .flatMap((m) => {
              const user = db.users.find((u) => u.id === m.userId);
              return user ? [{ ...m, user }] : [];
            })
            .sort((a, b) => a.user.name.localeCompare(b.user.name)),
        ),
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
      update: (id, patch) =>
        store.write((db) => {
          const workspace = find(db.workspaces, (w) => w.id === id, "Workspace", id);
          Object.assign(workspace, patch);
          return workspace;
        }),
      delete: (id) =>
        store.write((db) => {
          deleteBoards(db, new Set(db.boards.filter((b) => b.workspaceId === id).map((b) => b.id)));
          db.workspaces = db.workspaces.filter((w) => w.id !== id);
        }),
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
      update: (id, patch) =>
        store.write((db) => {
          const board = find(db.boards, (b) => b.id === id, "Board", id);
          Object.assign(board, patch);
          return board;
        }),
      delete: (id) => store.write((db) => deleteBoards(db, new Set([id]))),
      listColumns: (boardId) =>
        store.read((db) => db.columns.filter((c) => c.boardId === boardId).sort(byPosition)),
      getColumn: (id) => store.read((db) => db.columns.find((c) => c.id === id) ?? null),
      createColumn: (boardId, name) =>
        store.write((db) => {
          find(db.boards, (b) => b.id === boardId, "Board", boardId);
          const positions = db.columns.filter((c) => c.boardId === boardId).sort(byPosition).map((c) => c.position);
          const column = { id: newId(), boardId, name, position: positionAt(positions, positions.length) };
          db.columns.push(column);
          return column;
        }),
      renameColumn: (id, name) =>
        store.write((db) => {
          const column = find(db.columns, (c) => c.id === id, "Column", id);
          column.name = name;
          return column;
        }),
      moveColumn: (id, index) =>
        store.write((db) => {
          const column = find(db.columns, (c) => c.id === id, "Column", id);
          const others = db.columns
            .filter((c) => c.boardId === column.boardId && c.id !== id)
            .sort(byPosition)
            .map((c) => c.position);
          column.position = positionAt(others, index);
          return column;
        }),
      deleteColumn: (id) =>
        store.write((db) => {
          const column = find(db.columns, (c) => c.id === id, "Column", id);
          if (db.tasks.some((t) => t.columnId === id)) {
            throw new ConflictError("column", "Move or delete this column's tasks first");
          }
          if (db.columns.filter((c) => c.boardId === column.boardId).length === 1) {
            throw new ConflictError("column", "A board needs at least one column");
          }
          db.columns = db.columns.filter((c) => c.id !== id);
        }),
    },

    tasks: {
      create: ({ placement = "end", ...input }) =>
        store.write((db) => {
          const board = find(db.boards, (b) => b.id === input.boardId, "Board", input.boardId);
          const workspace = find(db.workspaces, (w) => w.id === board.workspaceId, "Workspace", board.workspaceId);
          findColumn(db, board.id, input.columnId);
          const positions = taskPositions(db, input.columnId);
          const number = workspace.nextTaskNumber++;
          const timestamp = now();
          const task: Task = {
            ...input,
            id: newId(),
            number,
            key: formatTaskKey(workspace.keyPrefix, number),
            position: positionAt(positions, placement === "start" ? 0 : positions.length),
            createdAt: timestamp,
            updatedAt: timestamp,
          };
          db.tasks.push(task);
          return task;
        }),
      get: (id) => store.read((db) => db.tasks.find((t) => t.id === id) ?? null),
      getByKey: (workspaceId, key) =>
        store.read((db) => {
          const boardIds = new Set(db.boards.filter((b) => b.workspaceId === workspaceId).map((b) => b.id));
          const wanted = key.trim().toUpperCase();
          return db.tasks.find((t) => boardIds.has(t.boardId) && t.key === wanted) ?? null;
        }),
      listForBoard: (boardId) =>
        store.read((db) => db.tasks.filter((t) => t.boardId === boardId).sort(byPosition)),
      listAssignedTo: (teamId, userId) =>
        store.read((db) => {
          const workspaceIds = new Set(db.workspaces.filter((w) => w.teamId === teamId).map((w) => w.id));
          const boardIds = new Set(db.boards.filter((b) => workspaceIds.has(b.workspaceId)).map((b) => b.id));
          return db.tasks
            .filter((t) => boardIds.has(t.boardId) && t.assignee?.kind === "user" && t.assignee.userId === userId)
            .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
        }),
      update: (id, patch) =>
        store.write((db) => {
          const task = find(db.tasks, (t) => t.id === id, "Task", id);
          Object.assign(task, patch, { updatedAt: now() });
          return task;
        }),
      move: (id, { columnId, index }) =>
        store.write((db) => {
          const task = find(db.tasks, (t) => t.id === id, "Task", id);
          findColumn(db, task.boardId, columnId);
          const position = positionAt(taskPositions(db, columnId, id), index);
          Object.assign(task, { columnId, position, updatedAt: now() });
          return task;
        }),
      delete: (id) => store.write((db) => deleteTasks(db, new Set([id]))),
    },

    labels: {
      listForTeam: (teamId) => store.read((db) => db.labels.filter((l) => l.teamId === teamId)),
    },

    comments: {
      listForTask: (taskId) =>
        store.read((db) => db.comments.filter((c) => c.taskId === taskId).sort(byCreatedAt)),
      get: (id) => store.read((db) => db.comments.find((c) => c.id === id) ?? null),
      create: ({ taskId, body, author }) =>
        store.write((db) => {
          find(db.tasks, (t) => t.id === taskId, "Task", taskId);
          const comment: Comment = { id: newId(), taskId, body, author, createdAt: now() };
          db.comments.push(comment);
          return comment;
        }),
      delete: (id) =>
        store.write((db) => {
          db.comments = db.comments.filter((c) => c.id !== id);
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
Expected: 137 tests pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(data): add labels, comments, column ops and index-based task moves"
```

---

### Task 3: Permissions + richer seed data

**Files:**
- Modify: `src/server/auth/permissions.ts`, `src/server/auth/permissions.test.ts`, `src/server/data/mock/seed.ts`, `src/server/data/mock/seed.test.ts`

**Interfaces:**
- Produces: actions `task:update`, `task:delete`, `comment:create` (everyone) and `comment:moderate`, `workspace:update`, `workspace:delete`, `board:update`, `board:delete`, `column:manage` (owners/admins). The demo board's tasks now carry labels, two are assigned to the demo user and ENG-4 has a Markdown description (ENG-5 becomes "Fix flaky CI").

- [ ] **Step 1: Write the failing tests**

Replace `src/server/auth/permissions.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { ForbiddenError, assertCan, can } from "./permissions";

describe("can", () => {
  it.each(["team:read", "task:create", "task:update", "task:delete", "comment:create"] as const)(
    "lets every role %s",
    (action) => {
      for (const role of ["owner", "admin", "member"] as const) expect(can(role, action)).toBe(true);
    },
  );

  it.each([
    "workspace:create",
    "workspace:update",
    "workspace:delete",
    "board:create",
    "board:update",
    "board:delete",
    "column:manage",
    "comment:moderate",
    "member:invite",
  ] as const)("limits %s to owners and admins", (action) => {
    expect(can("owner", action)).toBe(true);
    expect(can("admin", action)).toBe(true);
    expect(can("member", action)).toBe(false);
  });
});

describe("assertCan", () => {
  it("throws ForbiddenError when the role lacks the permission", () => {
    expect(() => assertCan("member", "member:invite")).toThrow(ForbiddenError);
    expect(() => assertCan("admin", "member:invite")).not.toThrow();
  });
});
```

Replace `src/server/data/mock/seed.test.ts`:

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
    expect(tasks.map((t) => t.key)).toContain("ENG-1");
    expect(tasks.some((t) => t.labelIds.length > 0)).toBe(true);
    expect((await repos.tasks.listAssignedTo(team.id, user!.id)).length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm test src/server`
Expected: FAIL — 10 tests (`can("member", "task:update")` is false; seed has no labels or assignees).

- [ ] **Step 3: Implement**

Replace `src/server/auth/permissions.ts`:

```ts
import type { Role } from "@/lib/domain";

// Single source of truth for role checks. M3 adds member-management actions.
const EVERYONE = ["owner", "admin", "member"] as const;
const MANAGERS = ["owner", "admin"] as const;

const RULES = {
  "team:read": EVERYONE,
  "task:create": EVERYONE,
  "task:update": EVERYONE,
  "task:delete": EVERYONE,
  "comment:create": EVERYONE,
  "comment:moderate": MANAGERS, // delete other people's comments
  "workspace:create": MANAGERS,
  "workspace:update": MANAGERS,
  "workspace:delete": MANAGERS,
  "board:create": MANAGERS,
  "board:update": MANAGERS,
  "board:delete": MANAGERS,
  "column:manage": MANAGERS,
  "member:invite": MANAGERS,
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

Replace `src/server/data/mock/seed.ts`:

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

const DEMO_TASKS: {
  column: number;
  title: string;
  priority: Priority;
  labels?: string[];
  mine?: boolean;
  description?: string;
}[] = [
  { column: 0, title: "Write onboarding copy", priority: "low", labels: ["Docs"] },
  { column: 0, title: "Pick an analytics provider", priority: "none" },
  { column: 1, title: "Add password reset", priority: "medium", labels: ["Feature"], mine: true },
  {
    column: 2,
    title: "Build the Kanban board",
    priority: "high",
    labels: ["Feature"],
    mine: true,
    description: "Drag & drop between columns.\n\n- [x] Columns\n- [ ] Cards",
  },
  { column: 3, title: "Fix flaky CI", priority: "urgent", labels: ["Bug"] },
];

export async function seedDb(): Promise<MockDb> {
  const store = createMemoryStore(emptyDb());
  const repos = createMockRepositories(store);

  const user = await repos.auth.signUp(DEMO_USER);
  const team = await repos.teams.create({ name: "Acme", slug: "acme", ownerId: user.id });
  const workspace = await repos.workspaces.create({ teamId: team.id, name: "Engineering", keyPrefix: "ENG" });
  const board = await repos.boards.create({ workspaceId: workspace.id, name: "Engineering", description: null });
  const columns = await repos.boards.listColumns(board.id);
  const labels = await repos.labels.listForTeam(team.id);

  for (const task of DEMO_TASKS) {
    await repos.tasks.create({
      ...createTaskInputSchema.parse({
        boardId: board.id,
        columnId: columns[task.column].id,
        title: task.title,
        priority: task.priority,
        description: task.description,
        labelIds: labels.filter((l) => task.labels?.includes(l.name)).map((l) => l.id),
        assignee: task.mine ? { kind: "user", userId: user.id } : null,
      }),
      createdBy: user.id,
    });
  }

  return store.snapshot();
}
```

- [ ] **Step 4: Verify**

Run: `pnpm test && pnpm lint && pnpm typecheck`
Expected: 147 tests pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(auth): add task, board and column permissions; seed labelled demo tasks"
```

---

### Task 4: Access guards + server actions

**Files:**
- Create: `src/server/actions/shared.ts`, `src/server/actions/workspaces.ts`, `src/server/actions/boards.ts`, `src/server/actions/tasks.ts`, `src/server/actions/comments.ts`
- Modify: `src/lib/forms.ts`, `src/server/auth/guards.ts`, `src/server/actions/onboarding.ts`

**Interfaces:**
- Consumes: Tasks 1–3.
- Produces: `FormState.ok`, `type ActionResult`; guards `requireWorkspaceAccess(id)`, `requireBoardAccess(id)`, `requireColumnAccess(id)`, `requireTaskAccess(id)` (all 404 for other teams); helpers `conflictToFormState`, `zodToFormState`, `toActionError`, `createWorkspaceWithBoard`, `assertTaskRefs`; actions — form: `createWorkspaceAction`, `renameWorkspaceAction`, `createBoardAction`, `updateBoardAction`, `createTaskAction`, `addCommentAction`; imperative: `deleteWorkspaceAction(id)`, `deleteBoardAction(id)`, `addColumnAction(boardId, name)`, `renameColumnAction(id, name)`, `moveColumnAction(id, index)`, `deleteColumnAction(id)`, `quickAddTaskAction(columnId, title)`, `updateTaskAction(id, patch)`, `moveTaskAction(id, columnId, index)`, `deleteTaskAction(id)`, `deleteCommentAction(id)`. Onboarding now reuses `createWorkspaceWithBoard`.

These are thin glue over tested domain/data code and are covered end-to-end in Task 8; there is no unit test step.

- [ ] **Step 1: Forms and guards**

Replace `src/lib/forms.ts`:

```ts
// Shape returned by server actions used with useActionState.
export type FormState = {
  /** Set on success by actions that don't redirect, so dialogs know to close. */
  ok?: boolean;
  fieldErrors?: Partial<Record<string, string[]>>;
  formError?: string;
  /** Echoed back so inputs keep their values after a failed submit. */
  values?: Record<string, string>;
};

export const initialFormState: FormState = {};

/** Result of a server action called from an event handler (drag, select, delete…). */
export type ActionResult = { ok: true } | { ok: false; error: string };

export function formValues<K extends string>(formData: FormData, keys: readonly K[]): Record<K, string> {
  return Object.fromEntries(keys.map((key) => [key, formData.get(key)?.toString() ?? ""])) as Record<
    K,
    string
  >;
}
```

Replace `src/server/auth/guards.ts`:

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

// The helpers below resolve an entity id up to its team and check membership,
// so server actions can trust ids coming from the client. Unknown ids and
// other teams' ids both 404.

export const requireWorkspaceAccess = cache(async (workspaceId: string) => {
  const user = await requireUser();
  const repos = getRepositories();
  const workspace = await repos.workspaces.get(workspaceId);
  const team = workspace ? await repos.teams.get(workspace.teamId) : null;
  const membership = team ? await repos.memberships.get(team.id, user.id) : null;
  if (!workspace || !team || !membership) notFound();
  return { user, team, membership, workspace };
});

export const requireBoardAccess = cache(async (boardId: string) => {
  const board = await getRepositories().boards.get(boardId);
  if (!board) notFound();
  return { ...(await requireWorkspaceAccess(board.workspaceId)), board };
});

export const requireColumnAccess = cache(async (columnId: string) => {
  const column = await getRepositories().boards.getColumn(columnId);
  if (!column) notFound();
  return { ...(await requireBoardAccess(column.boardId)), column };
});

export const requireTaskAccess = cache(async (taskId: string) => {
  const task = await getRepositories().tasks.get(taskId);
  if (!task) notFound();
  return { ...(await requireBoardAccess(task.boardId)), task };
});
```

- [ ] **Step 2: Shared helpers and onboarding**

Create `src/server/actions/shared.ts`:

```ts
import "server-only";
import { z } from "zod";
import type { CreateWorkspaceInput, UpdateTaskInput } from "@/lib/domain";
import { invalidTaskRef } from "@/lib/domain";
import type { ActionResult, FormState } from "@/lib/forms";
import { ForbiddenError } from "@/server/auth/permissions";
import { ConflictError, NotFoundError, getRepositories } from "@/server/data";

// Helpers for the "use server" modules in this folder (not an action module itself).

export function conflictToFormState(error: unknown, values: Record<string, string>): FormState {
  if (error instanceof ConflictError) return { fieldErrors: { [error.field]: [error.message] }, values };
  throw error;
}

export function zodToFormState(error: z.ZodError, values: Record<string, string>): FormState {
  return { fieldErrors: z.flattenError(error).fieldErrors, values };
}

/** Maps expected failures to a message for a toast; rethrows anything else. */
export function toActionError(error: unknown): ActionResult {
  if (error instanceof ConflictError || error instanceof ForbiddenError) return { ok: false, error: error.message };
  if (error instanceof NotFoundError) return { ok: false, error: "This item no longer exists." };
  if (error instanceof z.ZodError) return { ok: false, error: error.issues[0]?.message ?? "Invalid input" };
  throw error;
}

/** Creates a workspace plus its default board (PRD §5.1). */
export async function createWorkspaceWithBoard(input: CreateWorkspaceInput) {
  const repos = getRepositories();
  const workspace = await repos.workspaces.create(input);
  const board = await repos.boards.create({ workspaceId: workspace.id, name: workspace.name, description: null });
  return { workspace, board };
}

/** Rejects assignees who aren't team members and labels from other teams. */
export async function assertTaskRefs(teamId: string, patch: Pick<UpdateTaskInput, "assignee" | "labelIds">) {
  const repos = getRepositories();
  const [members, labels] = await Promise.all([repos.memberships.list(teamId), repos.labels.listForTeam(teamId)]);
  const field = invalidTaskRef(patch, {
    memberIds: new Set(members.map((m) => m.userId)),
    labelIds: new Set(labels.map((l) => l.id)),
  });
  if (field) throw new ConflictError(field, field === "assignee" ? "Pick a member of this team" : "Unknown label");
}
```

Replace `src/server/actions/onboarding.ts`:

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
import { getRepositories } from "@/server/data";
import { conflictToFormState, createWorkspaceWithBoard } from "./shared";

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

  let boardId: string;
  try {
    boardId = (await createWorkspaceWithBoard(parsed.data)).board.id;
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

- [ ] **Step 3: Action modules** (note `revalidatePath(…, "layout")` before redirects — gotcha 1)

Create `src/server/actions/workspaces.ts`:

```ts
"use server";

import { refresh, revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createWorkspaceInputSchema, updateWorkspaceInputSchema } from "@/lib/domain";
import { formValues, type FormState } from "@/lib/forms";
import { boardPath, teamPath } from "@/lib/paths";
import { requireTeamMember, requireWorkspaceAccess } from "@/server/auth/guards";
import { assertCan } from "@/server/auth/permissions";
import { getRepositories } from "@/server/data";
import { conflictToFormState, createWorkspaceWithBoard, zodToFormState } from "./shared";

export async function createWorkspaceAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData, ["teamSlug", "name", "keyPrefix"]);
  const { team, membership } = await requireTeamMember(values.teamSlug);
  assertCan(membership.role, "workspace:create");
  const parsed = createWorkspaceInputSchema.safeParse({
    teamId: team.id,
    name: values.name,
    keyPrefix: values.keyPrefix.toUpperCase(),
  });
  if (!parsed.success) return zodToFormState(parsed.error, values);

  let boardId: string;
  try {
    boardId = (await createWorkspaceWithBoard(parsed.data)).board.id;
  } catch (error) {
    return conflictToFormState(error, values);
  }
  // Redirects keep the shared [team] layout; revalidate it so the sidebar shows the new workspace.
  revalidatePath(teamPath(team.slug), "layout");
  redirect(boardPath(team.slug, boardId));
}

export async function renameWorkspaceAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData, ["workspaceId", "name"]);
  const { membership } = await requireWorkspaceAccess(values.workspaceId);
  assertCan(membership.role, "workspace:update");
  const parsed = updateWorkspaceInputSchema.safeParse({ name: values.name });
  if (!parsed.success) return zodToFormState(parsed.error, values);

  await getRepositories().workspaces.update(values.workspaceId, parsed.data);
  refresh();
  return { ok: true };
}

export async function deleteWorkspaceAction(workspaceId: string): Promise<void> {
  const { team, membership } = await requireWorkspaceAccess(workspaceId);
  assertCan(membership.role, "workspace:delete");
  await getRepositories().workspaces.delete(workspaceId);
  revalidatePath(teamPath(team.slug), "layout");
  redirect(teamPath(team.slug));
}
```

Create `src/server/actions/boards.ts`:

```ts
"use server";

import { refresh, revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { columnNameSchema, createBoardInputSchema, updateBoardInputSchema } from "@/lib/domain";
import { formValues, type ActionResult, type FormState } from "@/lib/forms";
import { boardPath, teamPath } from "@/lib/paths";
import { requireBoardAccess, requireColumnAccess, requireWorkspaceAccess } from "@/server/auth/guards";
import { assertCan } from "@/server/auth/permissions";
import { getRepositories } from "@/server/data";
import { toActionError, zodToFormState } from "./shared";

export async function createBoardAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData, ["workspaceId", "name"]);
  const { team, membership } = await requireWorkspaceAccess(values.workspaceId);
  assertCan(membership.role, "board:create");
  const parsed = createBoardInputSchema.safeParse({ workspaceId: values.workspaceId, name: values.name });
  if (!parsed.success) return zodToFormState(parsed.error, values);

  const board = await getRepositories().boards.create(parsed.data);
  // Redirects keep the shared [team] layout; revalidate it so the sidebar lists the board.
  revalidatePath(teamPath(team.slug), "layout");
  redirect(boardPath(team.slug, board.id));
}

export async function updateBoardAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData, ["boardId", "name", "description"]);
  const { membership } = await requireBoardAccess(values.boardId);
  assertCan(membership.role, "board:update");
  const parsed = updateBoardInputSchema.safeParse({
    name: values.name,
    description: values.description.trim() || null,
  });
  if (!parsed.success) return zodToFormState(parsed.error, values);

  await getRepositories().boards.update(values.boardId, parsed.data);
  refresh();
  return { ok: true };
}

export async function deleteBoardAction(boardId: string): Promise<void> {
  const { team, membership } = await requireBoardAccess(boardId);
  assertCan(membership.role, "board:delete");
  await getRepositories().boards.delete(boardId);
  revalidatePath(teamPath(team.slug), "layout");
  redirect(teamPath(team.slug));
}

export async function addColumnAction(boardId: string, name: string): Promise<ActionResult> {
  try {
    const { membership } = await requireBoardAccess(boardId);
    assertCan(membership.role, "column:manage");
    await getRepositories().boards.createColumn(boardId, columnNameSchema.parse(name));
  } catch (error) {
    return toActionError(error);
  }
  refresh();
  return { ok: true };
}

export async function renameColumnAction(columnId: string, name: string): Promise<ActionResult> {
  try {
    const { membership } = await requireColumnAccess(columnId);
    assertCan(membership.role, "column:manage");
    await getRepositories().boards.renameColumn(columnId, columnNameSchema.parse(name));
  } catch (error) {
    return toActionError(error);
  }
  refresh();
  return { ok: true };
}

export async function moveColumnAction(columnId: string, index: number): Promise<ActionResult> {
  try {
    const { membership } = await requireColumnAccess(columnId);
    assertCan(membership.role, "column:manage");
    await getRepositories().boards.moveColumn(columnId, index);
  } catch (error) {
    return toActionError(error);
  }
  refresh();
  return { ok: true };
}

export async function deleteColumnAction(columnId: string): Promise<ActionResult> {
  try {
    const { membership } = await requireColumnAccess(columnId);
    assertCan(membership.role, "column:manage");
    await getRepositories().boards.deleteColumn(columnId);
  } catch (error) {
    return toActionError(error);
  }
  refresh();
  return { ok: true };
}
```

Create `src/server/actions/tasks.ts`:

```ts
"use server";

import { refresh } from "next/cache";
import { createTaskInputSchema, updateTaskInputSchema, type UpdateTaskInput } from "@/lib/domain";
import { formValues, type ActionResult, type FormState } from "@/lib/forms";
import { requireBoardAccess, requireColumnAccess, requireTaskAccess } from "@/server/auth/guards";
import { assertCan } from "@/server/auth/permissions";
import { getRepositories } from "@/server/data";
import { assertTaskRefs, conflictToFormState, toActionError, zodToFormState } from "./shared";

export async function createTaskAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData, ["boardId", "columnId", "title", "description", "priority", "assignee"]);
  const { user, team, membership } = await requireBoardAccess(values.boardId);
  assertCan(membership.role, "task:create");
  const parsed = createTaskInputSchema.safeParse({
    boardId: values.boardId,
    columnId: values.columnId,
    title: values.title,
    description: values.description,
    priority: values.priority || undefined,
    assignee: values.assignee && values.assignee !== "none" ? { kind: "user", userId: values.assignee } : null,
  });
  if (!parsed.success) return zodToFormState(parsed.error, values);

  try {
    await assertTaskRefs(team.id, parsed.data);
    await getRepositories().tasks.create({ ...parsed.data, createdBy: user.id });
  } catch (error) {
    return conflictToFormState(error, values);
  }
  refresh();
  return { ok: true };
}

/** Quick-add from the top of a column: title only, inserted first. */
export async function quickAddTaskAction(columnId: string, title: string): Promise<ActionResult> {
  try {
    const { user, membership, column } = await requireColumnAccess(columnId);
    assertCan(membership.role, "task:create");
    const input = createTaskInputSchema.parse({ boardId: column.boardId, columnId, title });
    await getRepositories().tasks.create({ ...input, createdBy: user.id, placement: "start" });
  } catch (error) {
    return toActionError(error);
  }
  refresh();
  return { ok: true };
}

export async function updateTaskAction(taskId: string, patch: UpdateTaskInput): Promise<ActionResult> {
  try {
    const { team, membership } = await requireTaskAccess(taskId);
    assertCan(membership.role, "task:update");
    const parsed = updateTaskInputSchema.parse(patch);
    await assertTaskRefs(team.id, parsed);
    await getRepositories().tasks.update(taskId, parsed);
  } catch (error) {
    return toActionError(error);
  }
  refresh();
  return { ok: true };
}

/** Moves a task to `index` among the other tasks of `columnId` (see indexInFullList). */
export async function moveTaskAction(taskId: string, columnId: string, index: number): Promise<ActionResult> {
  try {
    const { membership } = await requireTaskAccess(taskId);
    assertCan(membership.role, "task:update");
    await getRepositories().tasks.move(taskId, { columnId, index: Math.max(0, Math.trunc(index)) });
  } catch (error) {
    return toActionError(error);
  }
  refresh();
  return { ok: true };
}

export async function deleteTaskAction(taskId: string): Promise<ActionResult> {
  try {
    const { membership } = await requireTaskAccess(taskId);
    assertCan(membership.role, "task:delete");
    await getRepositories().tasks.delete(taskId);
  } catch (error) {
    return toActionError(error);
  }
  refresh();
  return { ok: true };
}
```

Create `src/server/actions/comments.ts`:

```ts
"use server";

import { refresh } from "next/cache";
import { createCommentInputSchema } from "@/lib/domain";
import { formValues, type ActionResult, type FormState } from "@/lib/forms";
import { requireTaskAccess } from "@/server/auth/guards";
import { ForbiddenError, assertCan, can } from "@/server/auth/permissions";
import { getRepositories } from "@/server/data";
import { toActionError, zodToFormState } from "./shared";

export async function addCommentAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData, ["taskId", "body"]);
  const { user, membership } = await requireTaskAccess(values.taskId);
  assertCan(membership.role, "comment:create");
  const parsed = createCommentInputSchema.safeParse(values);
  if (!parsed.success) return zodToFormState(parsed.error, values);

  await getRepositories().comments.create({ ...parsed.data, author: { kind: "user", userId: user.id } });
  refresh();
  return { ok: true };
}

/** Authors can delete their own comments; owners and admins can delete any. */
export async function deleteCommentAction(commentId: string): Promise<ActionResult> {
  try {
    const repos = getRepositories();
    const comment = await repos.comments.get(commentId);
    if (!comment) return { ok: false, error: "This item no longer exists." };
    const { user, membership } = await requireTaskAccess(comment.taskId);
    const isAuthor = comment.author.kind === "user" && comment.author.userId === user.id;
    if (!isAuthor && !can(membership.role, "comment:moderate")) {
      throw new ForbiddenError(membership.role, "comment:moderate");
    }
    await repos.comments.delete(commentId);
  } catch (error) {
    return toActionError(error);
  }
  refresh();
  return { ok: true };
}
```

- [ ] **Step 4: Verify**

Run: `pnpm test && pnpm lint && pnpm typecheck && pnpm build`
Expected: 147 tests pass; build clean.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(actions): add workspace, board, column, task and comment server actions"
```

---

### Task 5: UI foundations — deps, shadcn, task atoms, board state

**Files:**
- Create: `src/components/ui/{select,tabs,alert-dialog}.tsx` (shadcn), `src/components/tasks/priority.tsx`, `src/components/tasks/label-chip.tsx`, `src/components/tasks/member-avatar.tsx`, `src/components/tasks/markdown.tsx`, `src/components/forms/use-form-action.ts`, `src/components/board/board-state.ts` (+ `.test.ts`)
- Modify: `package.json`, `src/app/globals.css`, `src/components/forms/fields.tsx`

**Interfaces:**
- Produces: `PRIORITY_META`, `<PriorityIcon>`; `<LabelDot>`, `<LabelChip>`; `type MemberOption`, `<MemberAvatar>`; `<Markdown>` (GFM, no raw HTML); `useFormAction(action, onSuccess?)`; `<SelectField>`; `taskReducer`/`TaskAction`, `columnReducer`/`ColumnAction`, `groupTasks(columns, tasks)`, `planTaskMove(tasks, taskId, columnId, visibleIdsAfterDrop) → { index, position } | null`.

- [ ] **Step 1: Dependencies and shadcn components** (gotcha 9)

```bash
pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities react-markdown remark-gfm
pnpm dlx shadcn@4.21.0 add select tabs alert-dialog -y --overwrite
pnpm remove cn
grep -rl 'from "cn"' src | xargs sed -i '' 's#from "cn"#from "@/lib/utils"#'
git status --short src/components/ui   # expect only the three new files
```

- [ ] **Step 2: Label colour tokens** — in `src/app/globals.css` add these lines right after `:root {`:

```css
  --label-gray: oklch(0.55 0 0);
  --label-red: oklch(0.6 0.2 25);
  --label-orange: oklch(0.68 0.17 50);
  --label-yellow: oklch(0.75 0.15 90);
  --label-green: oklch(0.62 0.15 150);
  --label-blue: oklch(0.58 0.17 250);
  --label-purple: oklch(0.58 0.2 300);
  --label-pink: oklch(0.65 0.2 350);
```

and these right after `.dark {`:

```css
  --label-gray: oklch(0.65 0 0);
  --label-red: oklch(0.68 0.19 25);
  --label-orange: oklch(0.74 0.16 50);
  --label-yellow: oklch(0.82 0.14 90);
  --label-green: oklch(0.72 0.15 150);
  --label-blue: oklch(0.68 0.15 250);
  --label-purple: oklch(0.68 0.17 300);
  --label-pink: oklch(0.72 0.17 350);
```

- [ ] **Step 3: Task atoms and form helpers**

Create `src/components/tasks/priority.tsx`:

```tsx
import { Minus, SignalHigh, SignalLow, SignalMedium, TriangleAlert, type LucideIcon } from "lucide-react";
import type { Priority } from "@/lib/domain";
import { cn } from "@/lib/utils";

export const PRIORITY_META: Record<Priority, { label: string; icon: LucideIcon }> = {
  none: { label: "No priority", icon: Minus },
  low: { label: "Low", icon: SignalLow },
  medium: { label: "Medium", icon: SignalMedium },
  high: { label: "High", icon: SignalHigh },
  urgent: { label: "Urgent", icon: TriangleAlert },
};

export function PriorityIcon({ priority, className }: { priority: Priority; className?: string }) {
  const { label, icon: Icon } = PRIORITY_META[priority];
  return (
    <Icon
      role="img"
      aria-label={label}
      className={cn(
        "size-4 shrink-0",
        priority === "urgent" ? "text-destructive" : "text-muted-foreground",
        className,
      )}
    />
  );
}
```

Create `src/components/tasks/label-chip.tsx`:

```tsx
import type { Label } from "@/lib/domain";

export function LabelDot({ color }: { color: Label["color"] }) {
  return (
    <span
      aria-hidden
      className="size-2 shrink-0 rounded-full"
      style={{ backgroundColor: `var(--label-${color})` }}
    />
  );
}

export function LabelChip({ label }: { label: Pick<Label, "name" | "color"> }) {
  return (
    <span className="text-muted-foreground inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs">
      <LabelDot color={label.color} />
      {label.name}
    </span>
  );
}
```

Create `src/components/tasks/member-avatar.tsx`:

```tsx
import { cn } from "@/lib/utils";

/** Minimal member shape passed from server pages to client components. */
export type MemberOption = { id: string; name: string; email: string };

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function MemberAvatar({ member, className }: { member: Pick<MemberOption, "name">; className?: string }) {
  return (
    <span
      title={member.name}
      className={cn(
        "bg-muted text-muted-foreground inline-flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-medium",
        className,
      )}
    >
      {initials(member.name)}
    </span>
  );
}
```

Create `src/components/tasks/markdown.tsx`:

```tsx
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// react-markdown never renders raw HTML and strips unsafe URLs, so user input is safe here.
export function Markdown({ children }: { children: string }) {
  return (
    <div className="text-sm leading-relaxed break-words [&_a]:underline [&_a]:underline-offset-4 [&_blockquote]:text-muted-foreground [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_code]:bg-muted [&_code]:rounded [&_code]:px-1 [&_code]:font-mono [&_h1]:mt-3 [&_h1]:text-lg [&_h1]:font-semibold [&_h2]:mt-3 [&_h2]:font-semibold [&_h3]:mt-2 [&_h3]:font-medium [&_input]:mr-1.5 [&_li]:my-0.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-2 [&_pre]:bg-muted [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:p-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul:has(input)]:list-none [&_ul:has(input)]:pl-0">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}
```

Create `src/components/forms/use-form-action.ts`:

```ts
"use client";

import { startTransition, useActionState } from "react";
import { initialFormState, type FormState } from "@/lib/forms";

/**
 * useActionState for dialog forms: runs `onSuccess` (e.g. close the dialog)
 * inside a transition so it lands in the same frame as the refreshed page.
 */
export function useFormAction(
  action: (prev: FormState, formData: FormData) => Promise<FormState>,
  onSuccess?: () => void,
) {
  return useActionState(async (prev: FormState, formData: FormData) => {
    const next = await action(prev, formData);
    if (next.ok && onSuccess) startTransition(onSuccess);
    return next;
  }, initialFormState);
}
```

Replace `src/components/forms/fields.tsx` (adds `SelectField`):

```tsx
import type { ComponentProps, ReactNode } from "react";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

/** A labelled Radix Select that submits with its form under `name`. */
export function SelectField({
  name,
  label,
  options,
  defaultValue,
}: {
  name: string;
  label: string;
  options: { value: string; label: string }[];
  defaultValue: string;
}) {
  return (
    <Field>
      <FieldLabel htmlFor={name}>{label}</FieldLabel>
      <Select name={name} defaultValue={defaultValue}>
        <SelectTrigger id={name} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}
```

- [ ] **Step 4: Board state — write the failing test**

Create `src/components/board/board-state.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { Column, Task } from "@/lib/domain";
import { columnReducer, groupTasks, planTaskMove, taskReducer } from "./board-state";

function task(id: string, columnId: string, position: string): Task {
  return {
    id,
    boardId: "b",
    columnId,
    number: 1,
    key: `ENG-${id}`,
    title: id,
    description: "",
    priority: "none",
    assignee: null,
    labelIds: [],
    dueDate: null,
    position,
    parentId: null,
    createdBy: "u",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

const column = (id: string, position: string): Column => ({ id, boardId: "b", name: id, position });

const TASKS = [task("a", "todo", "a0"), task("b", "todo", "a1"), task("c", "todo", "a2"), task("d", "done", "a0")];

describe("groupTasks", () => {
  it("buckets tasks by column in position order, with empty columns present", () => {
    const grouped = groupTasks([column("todo", "a0"), column("done", "a1"), column("empty", "a2")], [...TASKS].reverse());
    expect(grouped.todo.map((t) => t.id)).toEqual(["a", "b", "c"]);
    expect(grouped.done.map((t) => t.id)).toEqual(["d"]);
    expect(grouped.empty).toEqual([]);
  });
});

describe("taskReducer", () => {
  it("moves, updates, adds and deletes", () => {
    const moved = taskReducer(TASKS, { type: "move", id: "a", columnId: "done", position: "a1" });
    expect(moved.find((t) => t.id === "a")).toMatchObject({ columnId: "done", position: "a1" });
    const updated = taskReducer(TASKS, { type: "update", id: "b", patch: { priority: "high" } });
    expect(updated.find((t) => t.id === "b")?.priority).toBe("high");
    expect(taskReducer(TASKS, { type: "add", task: task("e", "todo", "Zz") })).toHaveLength(5);
    expect(taskReducer(TASKS, { type: "delete", id: "a" }).map((t) => t.id)).toEqual(["b", "c", "d"]);
  });
});

describe("columnReducer", () => {
  const columns = [column("x", "a0"), column("y", "a1")];

  it("keeps columns sorted after a move and supports rename/add/delete", () => {
    expect(columnReducer(columns, { type: "move", id: "y", position: "Zz" }).map((c) => c.id)).toEqual(["y", "x"]);
    expect(columnReducer(columns, { type: "rename", id: "x", name: "X" })[0].name).toBe("X");
    expect(columnReducer(columns, { type: "add", column: column("z", "a2") }).map((c) => c.id)).toEqual(["x", "y", "z"]);
    expect(columnReducer(columns, { type: "delete", id: "x" }).map((c) => c.id)).toEqual(["y"]);
  });
});

describe("planTaskMove", () => {
  it("computes index and a position between the new neighbours", () => {
    const plan = planTaskMove(TASKS, "c", "todo", ["a", "c", "b"]);
    expect(plan?.index).toBe(1);
    expect(plan!.position > "a0" && plan!.position < "a1").toBe(true);
  });

  it("moves across columns", () => {
    expect(planTaskMove(TASKS, "a", "done", ["d", "a"])).toMatchObject({ index: 1 });
  });

  it("returns null when the task ends where it started", () => {
    expect(planTaskMove(TASKS, "b", "todo", ["a", "b", "c"])).toBeNull();
  });

  it("respects hidden (filtered-out) tasks", () => {
    // Only a and c visible; c dropped first → lands before a in the full list.
    expect(planTaskMove(TASKS, "c", "todo", ["c", "a"])).toMatchObject({ index: 0 });
  });
});
```

Run: `pnpm test src/components/board`
Expected: FAIL — `Failed to resolve import "./board-state"`.

- [ ] **Step 5: Implement**

Create `src/components/board/board-state.ts`:

```ts
import { byPosition, indexInFullList, positionAt, type Column, type Task } from "@/lib/domain";

// Pure helpers behind the board's optimistic UI (useOptimistic reducers) and drag & drop.

export type TaskAction =
  | { type: "move"; id: string; columnId: string; position: string }
  | { type: "update"; id: string; patch: Partial<Task> }
  | { type: "add"; task: Task }
  | { type: "delete"; id: string };

export function taskReducer(tasks: Task[], action: TaskAction): Task[] {
  switch (action.type) {
    case "move":
      return tasks.map((t) =>
        t.id === action.id ? { ...t, columnId: action.columnId, position: action.position } : t,
      );
    case "update":
      return tasks.map((t) => (t.id === action.id ? { ...t, ...action.patch } : t));
    case "add":
      return [...tasks, action.task];
    case "delete":
      return tasks.filter((t) => t.id !== action.id);
  }
}

export type ColumnAction =
  | { type: "move"; id: string; position: string }
  | { type: "rename"; id: string; name: string }
  | { type: "add"; column: Column }
  | { type: "delete"; id: string };

export function columnReducer(columns: Column[], action: ColumnAction): Column[] {
  switch (action.type) {
    case "move":
      return columns.map((c) => (c.id === action.id ? { ...c, position: action.position } : c)).sort(byPosition);
    case "rename":
      return columns.map((c) => (c.id === action.id ? { ...c, name: action.name } : c));
    case "add":
      return [...columns, action.column].sort(byPosition);
    case "delete":
      return columns.filter((c) => c.id !== action.id);
  }
}

/** Tasks per column id, each list in position order; every column gets a list. */
export function groupTasks(columns: Column[], tasks: Task[]): Record<string, Task[]> {
  const grouped: Record<string, Task[]> = Object.fromEntries(columns.map((c) => [c.id, []]));
  for (const task of [...tasks].sort(byPosition)) grouped[task.columnId]?.push(task);
  return grouped;
}

/**
 * Where `taskId` lands when dropped into `columnId`, given the column's visible
 * ids after the drop (filters may hide some tasks). Returns the index the
 * server expects (among the column's other tasks) and the matching position,
 * or null if the task ends where it started.
 */
export function planTaskMove(
  tasks: Task[],
  taskId: string,
  columnId: string,
  visibleIdsAfterDrop: string[],
): { index: number; position: string } | null {
  const task = tasks.find((t) => t.id === taskId);
  if (!task) return null;
  const others = tasks.filter((t) => t.columnId === columnId && t.id !== taskId).sort(byPosition);
  const index = indexInFullList(
    others.map((t) => t.id),
    visibleIdsAfterDrop,
    taskId,
  );
  if (task.columnId === columnId && others.filter((t) => t.position < task.position).length === index) {
    return null;
  }
  return { index, position: positionAt(others.map((t) => t.position), index) };
}
```

- [ ] **Step 6: Verify**

Run: `pnpm test && pnpm lint && pnpm typecheck`
Expected: 154 tests pass (17 files).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(ui): add task atoms, label tokens and optimistic board state"
```

---

### Task 6: The board — Kanban, quick-add, dialog, sheet, filters

**Files:**
- Create: `src/components/board/task-card.tsx`, `inline-input.tsx`, `board-column.tsx`, `board-toolbar.tsx`, `create-task-dialog.tsx`, `task-sheet.tsx`, `board-header.tsx`, `board-view.tsx` (all in `src/components/board/`)
- Modify: `src/app/[team]/board/[boardId]/page.tsx`

**Interfaces:**
- Consumes: Tasks 4–5.
- Produces: `<BoardView>`. Accessible names used by e2e: columns are `region`s named after the column (`aria-busy` while a draft); cards are `article`s with the title as a `link`; buttons **Add task to {column}**, **Column actions for {column}** (menu: **Rename**, **Delete column**), **Reorder {column}**, **Add column**, **Board actions** (menu: **Edit board**, **Delete board**), **New task**, **Assignee** / **Priority** / **Labels** filter menus, **Clear filters**; inputs **New task in {column}**, **New column name**, **Column name**, **Search tasks**; the create dialog **New task** (button **Create task**); the sheet is a dialog named after the task with comboboxes **Status**, **Priority**, **Assignee**, button **Labels**, inputs **Title**, **Due date**, **Description** (tabs **Write**/**Preview**, button **Save description**), **Comment** (button **Comment**), **Delete task** → alertdialog **Delete**. The board root is `data-slot="board"` with `aria-busy` while saving (gotcha 2).

- [ ] **Step 1: Cards, inline inputs and columns** (gotchas 3 and 7)

Create `src/components/board/task-card.tsx`:

```tsx
"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CalendarDays } from "lucide-react";
import Link from "next/link";
import { LabelChip } from "@/components/tasks/label-chip";
import { MemberAvatar, type MemberOption } from "@/components/tasks/member-avatar";
import { PriorityIcon } from "@/components/tasks/priority";
import type { Label, Task } from "@/lib/domain";
import { cn } from "@/lib/utils";

type CardProps = {
  task: Task;
  href: string;
  labels: Label[];
  assignee: MemberOption | undefined;
};

export function TaskCardView({ task, href, labels, assignee, className }: CardProps & { className?: string }) {
  const hasMeta = labels.length > 0 || assignee || task.dueDate;
  return (
    <article
      aria-busy={task.id.startsWith("draft-")}
      className={cn(
        "bg-card hover:border-ring/60 relative space-y-2 rounded-md border p-3 text-sm shadow-xs transition-colors",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-muted-foreground font-mono text-xs">{task.key}</span>
        <PriorityIcon priority={task.priority} />
      </div>
      {/* Stretched link: the whole card opens the task; drags start from the card. */}
      <Link href={href} scroll={false} draggable={false} className="block font-medium after:absolute after:inset-0">
        {task.title}
      </Link>
      {hasMeta && (
        <div className="flex flex-wrap items-center gap-1.5">
          {labels.map((label) => (
            <LabelChip key={label.id} label={label} />
          ))}
          {task.dueDate && (
            <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
              <CalendarDays className="size-3" />
              {task.dueDate}
            </span>
          )}
          {assignee && <MemberAvatar member={assignee} className="ml-auto" />}
        </div>
      )}
    </article>
  );
}

export function SortableTaskCard(props: CardProps) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: props.task.id,
    data: { type: "task" },
    // Optimistic quick-add drafts have no server id yet.
    disabled: props.task.id.startsWith("draft-"),
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn("touch-none", isDragging && "opacity-40")}
      {...attributes}
      {...listeners}
    >
      <TaskCardView {...props} />
    </div>
  );
}
```

Create `src/components/board/inline-input.tsx`:

```tsx
"use client";

import { useState, type ComponentProps } from "react";
import { Input } from "@/components/ui/input";

/**
 * A text input that commits on Enter (and optionally on blur) and cancels on
 * Escape. Used for quick-add, new columns and column renames.
 */
export function InlineInput({
  initialValue = "",
  onSubmit,
  onCancel,
  submitOnBlur = false,
  keepOpen = false,
  ...props
}: Omit<ComponentProps<typeof Input>, "onSubmit"> & {
  initialValue?: string;
  onSubmit: (value: string) => void;
  onCancel: () => void;
  submitOnBlur?: boolean;
  /** Clear and stay open after submitting (rapid entry). */
  keepOpen?: boolean;
}) {
  const [value, setValue] = useState(initialValue);

  function submit() {
    const trimmed = value.trim();
    if (!trimmed) return onCancel();
    onSubmit(trimmed);
    if (keepOpen) setValue("");
  }

  return (
    <Input
      autoFocus
      value={value}
      onChange={(event) => setValue(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          submit();
        } else if (event.key === "Escape") {
          event.preventDefault();
          onCancel();
        }
      }}
      onBlur={() => (submitOnBlur && value.trim() ? submit() : onCancel())}
      {...props}
    />
  );
}
```

Create `src/components/board/board-column.tsx`:

```tsx
"use client";

import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Ellipsis, GripVertical, Plus } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Column } from "@/lib/domain";
import { cn } from "@/lib/utils";
import { InlineInput } from "./inline-input";

type BoardColumnProps = {
  column: Column;
  /** Ids rendered in this column, in order (visible tasks only). */
  taskIds: string[];
  /** All tasks in the column, including filtered-out ones (gates column delete). */
  taskCount: number;
  /** Whether board filters are hiding some tasks. */
  filtered: boolean;
  canManage: boolean;
  renderTask: (taskId: string) => ReactNode;
  onQuickAdd: (title: string) => void;
  onRename: (name: string) => void;
  onDelete: () => void;
};

export function BoardColumn({
  column,
  taskIds,
  taskCount,
  filtered,
  canManage,
  renderTask,
  onQuickAdd,
  onRename,
  onDelete,
}: BoardColumnProps) {
  const [adding, setAdding] = useState(false);
  // Optimistically added columns have no server id until the add completes.
  const isDraft = column.id.startsWith("draft-");
  const canEdit = canManage && !isDraft;
  const [renaming, setRenaming] = useState(false);
  const { setNodeRef, setActivatorNodeRef, attributes, listeners, transform, transition, isDragging } =
    useSortable({
      id: column.id,
      data: { type: "column" },
      // Everyone can drop tasks here; only managers can drag the column itself.
      disabled: { draggable: !canEdit, droppable: isDraft },
    });

  return (
    <section
      ref={setNodeRef}
      aria-label={column.name}
      aria-busy={isDraft}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn("bg-muted/40 flex w-72 shrink-0 flex-col rounded-lg border", isDragging && "opacity-50")}
    >
      <header className="flex items-center gap-1.5 px-2 pt-2 pb-1">
        {canEdit && (
          <button
            ref={setActivatorNodeRef}
            type="button"
            aria-label={`Reorder ${column.name}`}
            className="text-muted-foreground hover:text-foreground cursor-grab touch-none"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-4" />
          </button>
        )}
        {renaming ? (
          <InlineInput
            aria-label="Column name"
            className="h-7"
            initialValue={column.name}
            submitOnBlur
            onSubmit={(name) => {
              setRenaming(false);
              if (name !== column.name) onRename(name);
            }}
            onCancel={() => setRenaming(false)}
          />
        ) : (
          <h2 className="truncate text-sm font-medium">{column.name}</h2>
        )}
        <Badge variant="secondary">{taskIds.length}</Badge>
        <div className="ml-auto flex items-center">
          {!isDraft && (
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              aria-label={`Add task to ${column.name}`}
              onClick={() => setAdding(true)}
            >
              <Plus />
            </Button>
          )}
          {canEdit && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-7" aria-label={`Column actions for ${column.name}`}>
                  <Ellipsis />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => setRenaming(true)}>Rename</DropdownMenuItem>
                <DropdownMenuItem variant="destructive" disabled={taskCount > 0} onSelect={onDelete}>
                  {taskCount > 0 ? "Delete (move tasks first)" : "Delete column"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </header>
      {adding && (
        <div className="px-2 pt-1">
          <InlineInput
            aria-label={`New task in ${column.name}`}
            placeholder="Task title, then Enter"
            keepOpen
            onSubmit={onQuickAdd}
            onCancel={() => setAdding(false)}
          />
        </div>
      )}
      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div className="flex min-h-24 flex-1 flex-col gap-2 overflow-y-auto p-2">
          {taskIds.map(renderTask)}
          {taskIds.length === 0 && (
            <p className="text-muted-foreground py-6 text-center text-xs">
              {filtered && taskCount > 0 ? "No matching tasks" : "No tasks"}
            </p>
          )}
        </div>
      </SortableContext>
    </section>
  );
}

export function AddColumn({ onAdd }: { onAdd: (name: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="w-72 shrink-0">
      {open ? (
        <InlineInput
          aria-label="New column name"
          placeholder="Column name, then Enter"
          onSubmit={(name) => {
            onAdd(name);
            setOpen(false);
          }}
          onCancel={() => setOpen(false)}
        />
      ) : (
        <Button variant="ghost" className="text-muted-foreground w-full justify-start" onClick={() => setOpen(true)}>
          <Plus />
          Add column
        </Button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Toolbar, create dialog and task sheet** (gotchas 4 and 6)

Create `src/components/board/board-toolbar.tsx`:

```tsx
"use client";

import { Plus, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { LabelDot } from "@/components/tasks/label-chip";
import type { MemberOption } from "@/components/tasks/member-avatar";
import { PRIORITY_META, PriorityIcon } from "@/components/tasks/priority";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { EMPTY_FILTERS, PRIORITIES, isFiltered, type BoardFilters, type Label } from "@/lib/domain";

function toggle<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

function FilterTrigger({ label, count }: { label: string; count: number }) {
  return (
    <DropdownMenuTrigger asChild>
      <Button variant="outline" size="sm">
        {label}
        {count > 0 && <Badge variant="secondary">{count}</Badge>}
      </Button>
    </DropdownMenuTrigger>
  );
}

export function BoardToolbar({
  filters,
  onChange,
  members,
  labels,
  onNewTask,
  saving,
}: {
  filters: BoardFilters;
  onChange: (filters: BoardFilters) => void;
  members: MemberOption[];
  labels: Label[];
  onNewTask: () => void;
  saving: boolean;
}) {
  // Search is uncontrolled and debounced into the URL; the timer reads the
  // latest filters so a filter changed meanwhile isn't reverted.
  const latest = useRef(filters);
  useEffect(() => {
    latest.current = filters;
  });
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [searchKey, setSearchKey] = useState(0);

  const keepOpen = (event: Event) => event.preventDefault();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
        <Input
          aria-label="Search tasks"
          placeholder="Search tasks"
          className="h-8 w-48 pl-8"
          key={searchKey}
          defaultValue={filters.query}
          onChange={(event) => {
            const query = event.target.value.trim();
            clearTimeout(timer.current);
            timer.current = setTimeout(() => onChange({ ...latest.current, query }), 250);
          }}
        />
      </div>

      <DropdownMenu>
        <FilterTrigger label="Assignee" count={filters.assignee === "any" ? 0 : 1} />
        <DropdownMenuContent align="start">
          <DropdownMenuRadioGroup
            value={filters.assignee}
            onValueChange={(assignee) => onChange({ ...filters, assignee })}
          >
            <DropdownMenuRadioItem value="any">Anyone</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="me">Me</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="none">Unassigned</DropdownMenuRadioItem>
            {members.map((member) => (
              <DropdownMenuRadioItem key={member.id} value={member.id}>
                {member.name}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <FilterTrigger label="Priority" count={filters.priorities.length} />
        <DropdownMenuContent align="start">
          {PRIORITIES.map((priority) => (
            <DropdownMenuCheckboxItem
              key={priority}
              checked={filters.priorities.includes(priority)}
              onSelect={keepOpen}
              onCheckedChange={() => onChange({ ...filters, priorities: toggle(filters.priorities, priority) })}
            >
              <PriorityIcon priority={priority} />
              {PRIORITY_META[priority].label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <FilterTrigger label="Labels" count={filters.labelIds.length} />
        <DropdownMenuContent align="start">
          {labels.map((label) => (
            <DropdownMenuCheckboxItem
              key={label.id}
              checked={filters.labelIds.includes(label.id)}
              onSelect={keepOpen}
              onCheckedChange={() => onChange({ ...filters, labelIds: toggle(filters.labelIds, label.id) })}
            >
              <LabelDot color={label.color} />
              {label.name}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {isFiltered(filters) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            clearTimeout(timer.current);
            setSearchKey((key) => key + 1);
            onChange(EMPTY_FILTERS);
          }}
        >
          <X />
          Clear filters
        </Button>
      )}

      <span role="status" className="text-muted-foreground ml-auto text-xs">
        {saving ? "Saving…" : ""}
      </span>
      <Button size="sm" onClick={onNewTask}>
        <Plus />
        New task
        <kbd className="bg-primary-foreground/20 rounded px-1 font-mono text-[10px]">C</kbd>
      </Button>
    </div>
  );
}
```

Create `src/components/board/create-task-dialog.tsx`:

```tsx
"use client";

import { toast } from "sonner";
import { FormError, SelectField, TextField } from "@/components/forms/fields";
import { useFormAction } from "@/components/forms/use-form-action";
import type { MemberOption } from "@/components/tasks/member-avatar";
import { PRIORITY_META } from "@/components/tasks/priority";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { PRIORITIES, type Column } from "@/lib/domain";
import { createTaskAction } from "@/server/actions/tasks";

type CreateTaskDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  boardId: string;
  columns: Column[];
  members: MemberOption[];
  defaultColumnId: string;
};

export function CreateTaskDialog({ open, onOpenChange, ...props }: CreateTaskDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {open && <CreateTaskForm {...props} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function CreateTaskForm({
  boardId,
  columns,
  members,
  defaultColumnId,
  onDone,
}: Omit<CreateTaskDialogProps, "open" | "onOpenChange"> & { onDone: () => void }) {
  const [state, action, pending] = useFormAction(createTaskAction, () => {
    onDone();
    toast.success("Task created");
  });

  return (
    <form action={action} className="space-y-6">
      <DialogHeader>
        <DialogTitle>New task</DialogTitle>
        <DialogDescription>Press C on the board to open this anytime.</DialogDescription>
      </DialogHeader>
      <input type="hidden" name="boardId" value={boardId} />
      <FieldGroup>
        <TextField
          name="title"
          label="Title"
          required
          autoFocus
          defaultValue={state.values?.title}
          errors={state.fieldErrors?.title}
        />
        <Field>
          <FieldLabel htmlFor="description">Description</FieldLabel>
          <Textarea
            id="description"
            name="description"
            rows={4}
            placeholder="Markdown supported"
            defaultValue={state.values?.description}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <SelectField
            name="columnId"
            label="Status"
            defaultValue={state.values?.columnId || defaultColumnId}
            options={columns.map((column) => ({ value: column.id, label: column.name }))}
          />
          <SelectField
            name="priority"
            label="Priority"
            defaultValue={state.values?.priority || "none"}
            options={PRIORITIES.map((priority) => ({ value: priority, label: PRIORITY_META[priority].label }))}
          />
          <SelectField
            name="assignee"
            label="Assignee"
            defaultValue={state.values?.assignee || "none"}
            options={[
              { value: "none", label: "Unassigned" },
              ...members.map((member) => ({ value: member.id, label: member.name })),
            ]}
          />
        </div>
      </FieldGroup>
      <FormError message={state.fieldErrors?.assignee?.[0] ?? state.formError} />
      <DialogFooter>
        <Button type="submit" disabled={pending}>
          Create task
        </Button>
      </DialogFooter>
    </form>
  );
}
```

Create `src/components/board/task-sheet.tsx`:

```tsx
"use client";

import { Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { FormError } from "@/components/forms/fields";
import { useFormAction } from "@/components/forms/use-form-action";
import { LabelChip, LabelDot } from "@/components/tasks/label-chip";
import { Markdown } from "@/components/tasks/markdown";
import { MemberAvatar, type MemberOption } from "@/components/tasks/member-avatar";
import { PRIORITY_META, PriorityIcon } from "@/components/tasks/priority";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { PRIORITIES, type Column, type Comment, type Label, type Task, type UpdateTaskInput } from "@/lib/domain";
import { addCommentAction, deleteCommentAction } from "@/server/actions/comments";

type TaskSheetProps = {
  task: Task | undefined;
  columns: Column[];
  members: MemberOption[];
  labels: Label[];
  comments: Comment[];
  currentUserId: string;
  canModerate: boolean;
  onClose: () => void;
  onUpdate: (patch: UpdateTaskInput) => void;
  onMove: (columnId: string) => void;
  onDelete: () => void;
};

export function TaskSheet({ task, onClose, ...props }: TaskSheetProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  return (
    <Sheet open={Boolean(task)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        ref={contentRef}
        tabIndex={-1}
        // Radix would focus (and select) the title input; start on the panel instead.
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          contentRef.current?.focus();
        }}
        className="w-full gap-0 overflow-y-auto outline-none sm:max-w-xl"
      >
        {/* Keyed so local drafts (title, description) reset when switching tasks. */}
        {task && <TaskSheetBody key={task.id} task={task} {...props} />}
      </SheetContent>
    </Sheet>
  );
}

function TaskSheetBody({
  task,
  columns,
  members,
  labels,
  comments,
  currentUserId,
  canModerate,
  onUpdate,
  onMove,
  onDelete,
}: Omit<TaskSheetProps, "task" | "onClose"> & { task: Task }) {
  const assigneeId = task.assignee?.kind === "user" ? task.assignee.userId : "none";

  return (
    <>
      <SheetHeader className="border-b pr-12">
        <SheetDescription className="font-mono">{task.key}</SheetDescription>
        <SheetTitle className="sr-only">{task.title}</SheetTitle>
        <TitleField title={task.title} onSave={(title) => onUpdate({ title })} />
      </SheetHeader>

      <div className="space-y-8 p-4">
        <dl className="grid grid-cols-[6rem_1fr] items-center gap-x-3 gap-y-2 text-sm">
          <dt className="text-muted-foreground">Status</dt>
          <dd>
            <Select value={task.columnId} onValueChange={onMove}>
              <SelectTrigger size="sm" aria-label="Status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {columns.map((column) => (
                  <SelectItem key={column.id} value={column.id}>
                    {column.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </dd>

          <dt className="text-muted-foreground">Priority</dt>
          <dd>
            <Select value={task.priority} onValueChange={(priority) => onUpdate({ priority: priority as Task["priority"] })}>
              <SelectTrigger size="sm" aria-label="Priority">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITIES.map((priority) => (
                  <SelectItem key={priority} value={priority}>
                    <PriorityIcon priority={priority} />
                    {PRIORITY_META[priority].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </dd>

          <dt className="text-muted-foreground">Assignee</dt>
          <dd>
            <Select
              value={assigneeId}
              onValueChange={(value) =>
                onUpdate({ assignee: value === "none" ? null : { kind: "user", userId: value } })
              }
            >
              <SelectTrigger size="sm" aria-label="Assignee">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unassigned</SelectItem>
                {members.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    <MemberAvatar member={member} className="size-5" />
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </dd>

          <dt className="text-muted-foreground">Labels</dt>
          <dd>
            <LabelsPicker labels={labels} selected={task.labelIds} onChange={(labelIds) => onUpdate({ labelIds })} />
          </dd>

          <dt className="text-muted-foreground">Due date</dt>
          <dd>
            <Input
              type="date"
              aria-label="Due date"
              className="h-8 w-44"
              value={task.dueDate ?? ""}
              onChange={(event) => onUpdate({ dueDate: event.target.value || null })}
            />
          </dd>
        </dl>

        <DescriptionField description={task.description} onSave={(description) => onUpdate({ description })} />

        <CommentsSection
          taskId={task.id}
          comments={comments}
          members={members}
          currentUserId={currentUserId}
          canModerate={canModerate}
        />

        <DeleteTaskButton taskKey={task.key} onConfirm={onDelete} />
      </div>
    </>
  );
}

function TitleField({ title, onSave }: { title: string; onSave: (title: string) => void }) {
  const [draft, setDraft] = useState(title);
  return (
    <Input
      aria-label="Title"
      className="-mx-2 h-auto border-transparent px-2 text-lg font-semibold shadow-none"
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onKeyDown={(event) => event.key === "Enter" && event.currentTarget.blur()}
      onBlur={() => {
        const next = draft.trim();
        if (!next) setDraft(title);
        else if (next !== title) onSave(next);
      }}
    />
  );
}

function LabelsPicker({
  labels,
  selected,
  onChange,
}: {
  labels: Label[];
  selected: string[];
  onChange: (labelIds: string[]) => void;
}) {
  const chosen = labels.filter((label) => selected.includes(label.id));
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" aria-label="Labels" className="h-auto min-h-8 flex-wrap justify-start">
          {chosen.length ? chosen.map((label) => <LabelChip key={label.id} label={label} />) : "Add labels"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {labels.map((label) => (
          <DropdownMenuCheckboxItem
            key={label.id}
            checked={selected.includes(label.id)}
            onSelect={(event) => event.preventDefault()}
            onCheckedChange={(checked) =>
              onChange(checked ? [...selected, label.id] : selected.filter((id) => id !== label.id))
            }
          >
            <LabelDot color={label.color} />
            {label.name}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function DescriptionField({ description, onSave }: { description: string; onSave: (value: string) => void }) {
  const [draft, setDraft] = useState(description);
  const [tab, setTab] = useState(description ? "preview" : "write");
  const dirty = draft !== description;

  return (
    <section className="space-y-2">
      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Description</h3>
          <TabsList>
            <TabsTrigger value="write">Write</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="write">
          <Textarea
            aria-label="Description"
            rows={6}
            placeholder="Add details. Markdown supported."
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
        </TabsContent>
        <TabsContent value="preview" className="min-h-10">
          {draft ? <Markdown>{draft}</Markdown> : <p className="text-muted-foreground text-sm">No description.</p>}
        </TabsContent>
      </Tabs>
      {dirty && (
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => {
              onSave(draft);
              setTab("preview");
            }}
          >
            Save description
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setDraft(description)}>
            Discard
          </Button>
        </div>
      )}
    </section>
  );
}

function CommentsSection({
  taskId,
  comments,
  members,
  currentUserId,
  canModerate,
}: {
  taskId: string;
  comments: Comment[];
  members: MemberOption[];
  currentUserId: string;
  canModerate: boolean;
}) {
  const [state, action, pending] = useFormAction(addCommentAction);
  const memberName = (userId: string) => members.find((m) => m.id === userId)?.name ?? "Former member";

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-medium">Comments</h3>
      {comments.length > 0 && (
        <ul className="space-y-3">
          {comments.map((comment) => {
            const name = comment.author.kind === "user" ? memberName(comment.author.userId) : "AI teammate";
            const isAuthor = comment.author.kind === "user" && comment.author.userId === currentUserId;
            return (
              <li key={comment.id} className="rounded-md border p-3">
                <div className="flex items-center gap-2 text-xs">
                  <MemberAvatar member={{ name }} className="size-5" />
                  <span className="font-medium">{name}</span>
                  <time dateTime={comment.createdAt} className="text-muted-foreground" suppressHydrationWarning>
                    {new Date(comment.createdAt).toLocaleString()}
                  </time>
                  {(isAuthor || canModerate) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="ml-auto size-6"
                      aria-label="Delete comment"
                      onClick={async () => {
                        const result = await deleteCommentAction(comment.id);
                        if (!result.ok) toast.error(result.error);
                      }}
                    >
                      <Trash2 />
                    </Button>
                  )}
                </div>
                <Markdown>{comment.body}</Markdown>
              </li>
            );
          })}
        </ul>
      )}
      <form action={action} className="space-y-2">
        <input type="hidden" name="taskId" value={taskId} />
        <Textarea
          name="body"
          aria-label="Comment"
          rows={3}
          placeholder="Leave a comment. Markdown supported."
          defaultValue={state.values?.body}
        />
        <FormError message={state.fieldErrors?.body?.[0]} />
        <Button type="submit" size="sm" disabled={pending}>
          Comment
        </Button>
      </form>
    </section>
  );
}

function DeleteTaskButton({ taskKey, onConfirm }: { taskKey: string; onConfirm: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-destructive">
          <Trash2 />
          Delete task
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {taskKey}?</AlertDialogTitle>
          <AlertDialogDescription>This also deletes its comments. It can&apos;t be undone.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

- [ ] **Step 3: Header and the board itself**

Create `src/components/board/board-header.tsx`:

```tsx
"use client";

import { Ellipsis } from "lucide-react";
import { startTransition, useState } from "react";
import { FormError, TextField } from "@/components/forms/fields";
import { useFormAction } from "@/components/forms/use-form-action";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import type { Board } from "@/lib/domain";
import { deleteBoardAction, updateBoardAction } from "@/server/actions/boards";

export function BoardHeader({
  board,
  workspaceName,
  canManage,
}: {
  board: Board;
  workspaceName: string;
  canManage: boolean;
}) {
  const [dialog, setDialog] = useState<"edit" | "delete" | null>(null);

  return (
    <div className="flex items-start gap-2">
      <div className="min-w-0">
        <p className="text-muted-foreground text-sm">{workspaceName}</p>
        <h1 className="text-xl font-semibold">{board.name}</h1>
        {board.description && <p className="text-muted-foreground text-sm">{board.description}</p>}
      </div>
      {canManage && (
        <>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8" aria-label="Board actions">
                <Ellipsis />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onSelect={() => setDialog("edit")}>Edit board</DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onSelect={() => setDialog("delete")}>
                Delete board
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Dialog open={dialog === "edit"} onOpenChange={(open) => setDialog(open ? "edit" : null)}>
            <DialogContent>
              {dialog === "edit" && <EditBoardForm board={board} onDone={() => setDialog(null)} />}
            </DialogContent>
          </Dialog>

          <AlertDialog open={dialog === "delete"} onOpenChange={(open) => setDialog(open ? "delete" : null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete {board.name}?</AlertDialogTitle>
                <AlertDialogDescription>
                  All of its columns, tasks and comments are deleted too. This can&apos;t be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  onClick={() => startTransition(() => deleteBoardAction(board.id))}
                >
                  Delete board
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </div>
  );
}

function EditBoardForm({ board, onDone }: { board: Board; onDone: () => void }) {
  const [state, action, pending] = useFormAction(updateBoardAction, onDone);
  return (
    <form action={action} className="space-y-6">
      <DialogHeader>
        <DialogTitle>Edit board</DialogTitle>
      </DialogHeader>
      <input type="hidden" name="boardId" value={board.id} />
      <FieldGroup>
        <TextField
          name="name"
          label="Board name"
          required
          defaultValue={state.values?.name ?? board.name}
          errors={state.fieldErrors?.name}
        />
        <Field>
          <FieldLabel htmlFor="description">Description</FieldLabel>
          <Textarea
            id="description"
            name="description"
            rows={3}
            defaultValue={state.values?.description ?? board.description ?? ""}
          />
        </Field>
      </FieldGroup>
      <FormError message={state.fieldErrors?.description?.[0]} />
      <DialogFooter>
        <Button type="submit" disabled={pending}>
          Save
        </Button>
      </DialogFooter>
    </form>
  );
}
```

Create `src/components/board/board-view.tsx`:

```tsx
"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import type { MemberOption } from "@/components/tasks/member-avatar";
import {
  filterTasks,
  isFiltered,
  parseBoardFilters,
  positionAt,
  serializeBoardFilters,
  type Board,
  type BoardFilters,
  type Column,
  type Comment,
  type Label,
  type Task,
  type UpdateTaskInput,
} from "@/lib/domain";
import type { ActionResult } from "@/lib/forms";
import { addColumnAction, deleteColumnAction, moveColumnAction, renameColumnAction } from "@/server/actions/boards";
import {
  deleteTaskAction,
  moveTaskAction,
  quickAddTaskAction,
  updateTaskAction,
} from "@/server/actions/tasks";
import { AddColumn, BoardColumn } from "./board-column";
import { BoardHeader } from "./board-header";
import { columnReducer, groupTasks, planTaskMove, taskReducer } from "./board-state";
import { BoardToolbar } from "./board-toolbar";
import { CreateTaskDialog } from "./create-task-dialog";
import { SortableTaskCard, TaskCardView } from "./task-card";
import { TaskSheet } from "./task-sheet";

export type BoardViewProps = {
  board: Board;
  workspaceName: string;
  columns: Column[];
  tasks: Task[];
  members: MemberOption[];
  labels: Label[];
  comments: Comment[];
  openTaskId: string | null;
  currentUserId: string;
  canManage: boolean;
  canModerate: boolean;
};

function isTyping(target: EventTarget | null) {
  return target instanceof HTMLElement && Boolean(target.closest("input, textarea, select, [contenteditable=true]"));
}

export function BoardView(props: BoardViewProps) {
  const { board, members, labels, currentUserId, canManage } = props;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [tasks, applyTask] = useOptimistic(props.tasks, taskReducer);
  const [columns, applyColumn] = useOptimistic(props.columns, columnReducer);
  const [createOpen, setCreateOpen] = useState(false);
  // Pending while any board mutation is in flight; drives aria-busy and "Saving…".
  const [saving, startSaving] = useTransition();
  // During a drag: visible task ids per column, rearranged as the card moves.
  const [dragItems, setDragItems] = useState<Record<string, string[]> | null>(null);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  const filters = useMemo(() => parseBoardFilters(new URLSearchParams(searchParams.toString())), [searchParams]);
  const visible = useMemo(
    () => groupTasks(columns, filterTasks(tasks, filters, currentUserId)),
    [columns, tasks, filters, currentUserId],
  );
  const counts = useMemo(() => groupTasks(columns, tasks), [columns, tasks]);
  const taskById = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks]);
  const items =
    dragItems ?? Object.fromEntries(Object.entries(visible).map(([id, list]) => [id, list.map((t) => t.id)]));

  const navigate = useCallback(
    (params: URLSearchParams) => {
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router],
  );
  const replaceParams = (update: (params: URLSearchParams) => void) => {
    const params = new URLSearchParams(searchParams.toString());
    update(params);
    navigate(params);
  };
  // Filters live in the URL so a filtered board can be shared or reloaded.
  const setFilters = useCallback(
    (next: BoardFilters) => navigate(serializeBoardFilters(next, new URLSearchParams(searchParams.toString()))),
    [navigate, searchParams],
  );
  const taskHref = (key: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("task", key);
    return `${pathname}?${params}`;
  };

  /** Applies an optimistic update, runs the action, and toasts on failure (the UI then reverts). */
  function mutate(optimistic: () => void, action: () => Promise<ActionResult>) {
    startSaving(async () => {
      optimistic();
      const result = await action();
      if (!result.ok) toast.error(result.error);
    });
  }

  // "C" opens the create dialog unless the user is typing or another dialog is open.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== "c" || event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTyping(event.target) || document.querySelector("[role=dialog], [role=alertdialog]")) return;
      event.preventDefault();
      setCreateOpen(true);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  // ---- drag & drop -------------------------------------------------------

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const containerOf = (id: string, source: Record<string, string[]>) =>
    id in source ? id : Object.keys(source).find((columnId) => source[columnId].includes(id));

  function onDragStart({ active }: DragStartEvent) {
    if (active.data.current?.type !== "task") return;
    setActiveTaskId(String(active.id));
    setDragItems(items);
  }

  function onDragOver({ active, over }: DragOverEvent) {
    if (!over || active.data.current?.type !== "task") return;
    setDragItems((current) => {
      if (!current) return current;
      const from = containerOf(String(active.id), current);
      const to = containerOf(String(over.id), current);
      if (!from || !to || from === to) return current;
      const target = current[to].filter((id) => id !== active.id);
      const overIndex = target.indexOf(String(over.id));
      target.splice(overIndex === -1 ? target.length : overIndex, 0, String(active.id));
      return { ...current, [from]: current[from].filter((id) => id !== active.id), [to]: target };
    });
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    const activeId = String(active.id);
    const current = dragItems;
    setDragItems(null);
    setActiveTaskId(null);
    if (!over) return;

    if (active.data.current?.type === "column") {
      const ids = columns.map((column) => column.id);
      const overColumn = containerOf(String(over.id), items) ?? String(over.id);
      const from = ids.indexOf(activeId);
      const to = ids.indexOf(overColumn);
      if (from === -1 || to === -1 || from === to) return;
      const others = columns.filter((column) => column.id !== activeId).map((column) => column.position);
      mutate(
        () => applyColumn({ type: "move", id: activeId, position: positionAt(others, to) }),
        () => moveColumnAction(activeId, to),
      );
      return;
    }

    if (!current) return;
    const columnId = containerOf(activeId, current);
    if (!columnId) return;
    let ids = current[columnId];
    const overIndex = ids.indexOf(String(over.id));
    if (overIndex !== -1) ids = arrayMove(ids, ids.indexOf(activeId), overIndex);

    const plan = planTaskMove(tasks, activeId, columnId, ids);
    if (!plan) return;
    mutate(
      () => applyTask({ type: "move", id: activeId, columnId, position: plan.position }),
      () => moveTaskAction(activeId, columnId, plan.index),
    );
  }

  // ---- task & column mutations --------------------------------------------

  function quickAdd(columnId: string, title: string) {
    const first = counts[columnId]?.[0];
    const now = new Date().toISOString();
    const draft: Task = {
      id: `draft-${crypto.randomUUID()}`,
      boardId: board.id,
      columnId,
      number: 0,
      key: "…",
      title,
      description: "",
      priority: "none",
      assignee: null,
      labelIds: [],
      dueDate: null,
      position: positionAt(first ? [first.position] : [], 0),
      parentId: null,
      createdBy: currentUserId,
      createdAt: now,
      updatedAt: now,
    };
    mutate(() => applyTask({ type: "add", task: draft }), () => quickAddTaskAction(columnId, title));
  }

  function addColumn(name: string) {
    const last = columns.at(-1);
    const column = { id: `draft-${crypto.randomUUID()}`, boardId: board.id, name, position: positionAt(last ? [last.position] : [], 1) };
    mutate(() => applyColumn({ type: "add", column }), () => addColumnAction(board.id, name));
  }

  const openTask = props.openTaskId ? taskById.get(props.openTaskId) : undefined;
  const closeTask = () => replaceParams((params) => params.delete("task"));

  function updateTask(patch: UpdateTaskInput) {
    if (!openTask) return;
    const id = openTask.id;
    mutate(() => applyTask({ type: "update", id, patch }), () => updateTaskAction(id, patch));
  }

  function moveTaskToColumn(columnId: string) {
    if (!openTask || columnId === openTask.columnId) return;
    const id = openTask.id;
    const others = (counts[columnId] ?? []).map((task) => task.position);
    mutate(
      () => applyTask({ type: "move", id, columnId, position: positionAt(others, others.length) }),
      () => moveTaskAction(id, columnId, others.length),
    );
  }

  function deleteTask() {
    if (!openTask) return;
    const { id, key } = openTask;
    closeTask();
    mutate(
      () => applyTask({ type: "delete", id }),
      async () => {
        const result = await deleteTaskAction(id);
        if (result.ok) toast.success(`Deleted ${key}`);
        return result;
      },
    );
  }

  const memberById = new Map(members.map((member) => [member.id, member]));
  const cardProps = (task: Task) => ({
    task,
    href: taskHref(task.key),
    labels: labels.filter((label) => task.labelIds.includes(label.id)),
    assignee: task.assignee?.kind === "user" ? memberById.get(task.assignee.userId) : undefined,
  });
  const activeTask = activeTaskId ? taskById.get(activeTaskId) : undefined;
  const defaultColumnId = (columns.find((column) => column.name === "Todo") ?? columns[0])?.id ?? "";

  return (
    <div data-slot="board" aria-busy={saving} className="flex min-h-0 flex-1 flex-col gap-4">
      <BoardHeader board={board} workspaceName={props.workspaceName} canManage={canManage} />
      <BoardToolbar
        filters={filters}
        onChange={setFilters}
        members={members}
        labels={labels}
        onNewTask={() => setCreateOpen(true)}
        saving={saving}
      />

      <DndContext
        id="board-dnd"
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={() => {
          setDragItems(null);
          setActiveTaskId(null);
        }}
      >
        <SortableContext items={columns.map((column) => column.id)} strategy={horizontalListSortingStrategy}>
          <div className="flex min-h-0 flex-1 items-start gap-3 overflow-x-auto pb-2">
            {columns.map((column) => (
              <BoardColumn
                key={column.id}
                column={column}
                taskIds={items[column.id] ?? []}
                taskCount={counts[column.id]?.length ?? 0}
                filtered={isFiltered(filters)}
                canManage={canManage}
                renderTask={(taskId) => {
                  const task = taskById.get(taskId);
                  return task ? <SortableTaskCard key={task.id} {...cardProps(task)} /> : null;
                }}
                onQuickAdd={(title) => quickAdd(column.id, title)}
                onRename={(name) =>
                  mutate(
                    () => applyColumn({ type: "rename", id: column.id, name }),
                    () => renameColumnAction(column.id, name),
                  )
                }
                onDelete={() =>
                  mutate(() => applyColumn({ type: "delete", id: column.id }), () => deleteColumnAction(column.id))
                }
              />
            ))}
            {canManage && <AddColumn onAdd={addColumn} />}
          </div>
        </SortableContext>
        <DragOverlay>
          {activeTask ? <TaskCardView {...cardProps(activeTask)} className="rotate-2 shadow-lg" /> : null}
        </DragOverlay>
      </DndContext>

      <CreateTaskDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        boardId={board.id}
        columns={columns}
        members={members}
        defaultColumnId={defaultColumnId}
      />
      <TaskSheet
        task={openTask}
        columns={columns}
        members={members}
        labels={labels}
        comments={props.comments}
        currentUserId={currentUserId}
        canModerate={props.canModerate}
        onClose={closeTask}
        onUpdate={updateTask}
        onMove={moveTaskToColumn}
        onDelete={deleteTask}
      />
    </div>
  );
}
```

- [ ] **Step 4: Board page**

Replace `src/app/[team]/board/[boardId]/page.tsx`:

```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BoardView } from "@/components/board/board-view";
import { requireTeamMember } from "@/server/auth/guards";
import { can } from "@/server/auth/permissions";
import { getRepositories } from "@/server/data";

export const metadata: Metadata = { title: "Board" };

export default async function BoardPage({ params, searchParams }: PageProps<"/[team]/board/[boardId]">) {
  const [{ team: teamSlug, boardId }, { task: taskKey }] = await Promise.all([params, searchParams]);
  const { user, team, membership } = await requireTeamMember(teamSlug);
  const repos = getRepositories();
  const board = await repos.boards.get(boardId);
  const workspace = board ? await repos.workspaces.get(board.workspaceId) : null;
  if (!board || !workspace || workspace.teamId !== team.id) notFound();

  const [columns, tasks, members, labels] = await Promise.all([
    repos.boards.listColumns(board.id),
    repos.tasks.listForBoard(board.id),
    repos.memberships.listMembers(team.id),
    repos.labels.listForTeam(team.id),
  ]);
  // ?task=ENG-12 opens the task sheet (PRD §5.3).
  const openTask =
    typeof taskKey === "string" ? (tasks.find((task) => task.key === taskKey.toUpperCase()) ?? null) : null;
  const comments = openTask ? await repos.comments.listForTask(openTask.id) : [];

  return (
    <BoardView
      board={board}
      workspaceName={workspace.name}
      columns={columns}
      tasks={tasks}
      members={members.map(({ user: member }) => ({ id: member.id, name: member.name, email: member.email }))}
      labels={labels}
      comments={comments}
      openTaskId={openTask?.id ?? null}
      currentUserId={user.id}
      canManage={can(membership.role, "column:manage")}
      canModerate={can(membership.role, "comment:moderate")}
    />
  );
}
```

- [ ] **Step 5: Verify**

Run: `rm -rf .next && pnpm test && pnpm lint && pnpm typecheck && pnpm build && pnpm test:e2e`
Expected: 154 unit tests; build clean; the 12 M1 e2e tests still pass. Manual: `pnpm dev`, sign in as the demo user, open the Engineering board, drag ENG-2 to Todo, press `C`, open a card and edit it.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(board): add drag-and-drop Kanban, quick-add, task dialog, task sheet and filters"
```

---

### Task 7: Sidebar management + My tasks

**Files:**
- Create: `src/components/shell/workspace-actions.tsx`, `src/components/shell/board-link.tsx`
- Modify: `src/components/onboarding/create-workspace-form.tsx`, `src/app/onboarding/[team]/workspace/page.tsx`, `src/components/shell/app-sidebar.tsx`, `src/app/[team]/layout.tsx`, `src/app/[team]/page.tsx`

**Interfaces:**
- Produces: `<NewWorkspaceButton teamSlug>` (sidebar group action **New workspace** → dialog **New workspace**, button **Create workspace**); `<WorkspaceMenu workspace>` (button **Workspace actions for {name}** → **New board** (dialog, button **Create board**), **Rename workspace** (button **Save**), **Delete workspace** (alertdialog)); `<BoardLink>` highlights the current board; `CreateWorkspaceForm` now takes `action` and `submitLabel` props; `AppSidebar` takes `canManage`. **My tasks** lists the caller's tasks with priority, key, labels, board and status, each linking to `…/board/[id]?task=KEY`.

- [ ] **Step 1: Reusable workspace form**

Replace `src/components/onboarding/create-workspace-form.tsx`:

```tsx
"use client";

import { useActionState, useState } from "react";
import { TextField } from "@/components/forms/fields";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { suggestKeyPrefix } from "@/lib/domain";
import { initialFormState, type FormState } from "@/lib/forms";

/** Used by onboarding (→ invite step) and the sidebar (→ new board); each passes its own action. */
export function CreateWorkspaceForm({
  teamSlug,
  action: workspaceAction,
  submitLabel = "Continue",
}: {
  teamSlug: string;
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  submitLabel?: string;
}) {
  const [state, action, pending] = useActionState(workspaceAction, initialFormState);
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
        {submitLabel}
      </Button>
    </form>
  );
}
```

Replace `src/app/onboarding/[team]/workspace/page.tsx`:

```tsx
import type { Metadata } from "next";
import { CreateWorkspaceForm } from "@/components/onboarding/create-workspace-form";
import { OnboardingStep } from "@/components/onboarding/onboarding-step";
import { createWorkspaceAction } from "@/server/actions/onboarding";
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
      <CreateWorkspaceForm teamSlug={team.slug} action={createWorkspaceAction} />
    </OnboardingStep>
  );
}
```

- [ ] **Step 2: Sidebar actions**

Create `src/components/shell/workspace-actions.tsx`:

```tsx
"use client";

import { Ellipsis, Plus } from "lucide-react";
import { startTransition, useState } from "react";
import { TextField } from "@/components/forms/fields";
import { useFormAction } from "@/components/forms/use-form-action";
import { CreateWorkspaceForm } from "@/components/onboarding/create-workspace-form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FieldGroup } from "@/components/ui/field";
import { SidebarGroupAction, SidebarMenuAction } from "@/components/ui/sidebar";
import type { Workspace } from "@/lib/domain";
import { createBoardAction } from "@/server/actions/boards";
import { createWorkspaceAction, deleteWorkspaceAction, renameWorkspaceAction } from "@/server/actions/workspaces";

export function NewWorkspaceButton({ teamSlug }: { teamSlug: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <SidebarGroupAction title="New workspace" aria-label="New workspace" onClick={() => setOpen(true)}>
        <Plus />
      </SidebarGroupAction>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New workspace</DialogTitle>
            <DialogDescription>It starts with a default board.</DialogDescription>
          </DialogHeader>
          {open && (
            <CreateWorkspaceForm teamSlug={teamSlug} action={createWorkspaceAction} submitLabel="Create workspace" />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export function WorkspaceMenu({ workspace }: { workspace: Pick<Workspace, "id" | "name"> }) {
  const [dialog, setDialog] = useState<"board" | "rename" | "delete" | null>(null);
  const close = () => setDialog(null);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuAction aria-label={`Workspace actions for ${workspace.name}`}>
            <Ellipsis />
          </SidebarMenuAction>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="start">
          <DropdownMenuItem onSelect={() => setDialog("board")}>New board</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setDialog("rename")}>Rename workspace</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setDialog("delete")}>
            Delete workspace
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={dialog === "board" || dialog === "rename"} onOpenChange={(open) => !open && close()}>
        <DialogContent>
          {dialog === "board" && <NewBoardForm workspaceId={workspace.id} />}
          {dialog === "rename" && <RenameWorkspaceForm workspace={workspace} onDone={close} />}
        </DialogContent>
      </Dialog>

      <AlertDialog open={dialog === "delete"} onOpenChange={(open) => !open && close()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {workspace.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Every board, task and comment in this workspace is deleted too. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => startTransition(() => deleteWorkspaceAction(workspace.id))}
            >
              Delete workspace
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function NewBoardForm({ workspaceId }: { workspaceId: string }) {
  const [state, action, pending] = useFormAction(createBoardAction);
  return (
    <form action={action} className="space-y-6">
      <DialogHeader>
        <DialogTitle>New board</DialogTitle>
        <DialogDescription>Starts with Backlog, Todo, In Progress, In Review and Done.</DialogDescription>
      </DialogHeader>
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <FieldGroup>
        <TextField
          name="name"
          label="Board name"
          required
          autoFocus
          defaultValue={state.values?.name}
          errors={state.fieldErrors?.name}
        />
      </FieldGroup>
      <DialogFooter>
        <Button type="submit" disabled={pending}>
          Create board
        </Button>
      </DialogFooter>
    </form>
  );
}

function RenameWorkspaceForm({ workspace, onDone }: { workspace: Pick<Workspace, "id" | "name">; onDone: () => void }) {
  const [state, action, pending] = useFormAction(renameWorkspaceAction, onDone);
  return (
    <form action={action} className="space-y-6">
      <DialogHeader>
        <DialogTitle>Rename workspace</DialogTitle>
        <DialogDescription>Task keys keep their prefix.</DialogDescription>
      </DialogHeader>
      <input type="hidden" name="workspaceId" value={workspace.id} />
      <FieldGroup>
        <TextField
          name="name"
          label="Workspace name"
          required
          autoFocus
          defaultValue={state.values?.name ?? workspace.name}
          errors={state.fieldErrors?.name}
        />
      </FieldGroup>
      <DialogFooter>
        <Button type="submit" disabled={pending}>
          Save
        </Button>
      </DialogFooter>
    </form>
  );
}
```

Create `src/components/shell/board-link.tsx`:

```tsx
"use client";

import { SquareKanban } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SidebarMenuSubButton } from "@/components/ui/sidebar";

export function BoardLink({ href, name }: { href: string; name: string }) {
  const pathname = usePathname();
  return (
    <SidebarMenuSubButton asChild isActive={pathname === href}>
      <Link href={href}>
        <SquareKanban />
        <span>{name}</span>
      </Link>
    </SidebarMenuSubButton>
  );
}
```

Replace `src/components/shell/app-sidebar.tsx`:

```tsx
import { Layers, LogOut } from "lucide-react";
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
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import type { Board, Team, User, Workspace } from "@/lib/domain";
import { boardPath } from "@/lib/paths";
import { signOutAction } from "@/server/actions/auth";
import { BoardLink } from "./board-link";
import { navItems } from "./nav-items";
import { TeamSwitcher } from "./team-switcher";
import { NewWorkspaceButton, WorkspaceMenu } from "./workspace-actions";

export type SidebarWorkspace = Workspace & { boards: Board[] };

export function AppSidebar({
  user,
  team,
  teams,
  workspaces,
  canManage,
}: {
  user: User;
  team: Team;
  teams: Team[];
  workspaces: SidebarWorkspace[];
  /** Owners and admins can create, rename and delete workspaces and boards. */
  canManage: boolean;
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
          {canManage && <NewWorkspaceButton teamSlug={team.slug} />}
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
                    {canManage && <WorkspaceMenu workspace={workspace} />}
                    <SidebarMenuSub>
                      {workspace.boards.map((board) => (
                        <SidebarMenuSubItem key={board.id}>
                          <BoardLink href={boardPath(team.slug, board.id)} name={board.name} />
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

Replace `src/app/[team]/layout.tsx`:

```tsx
import { AppHeader } from "@/components/shell/app-header";
import { AppSidebar } from "@/components/shell/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { requireTeamMember } from "@/server/auth/guards";
import { can } from "@/server/auth/permissions";
import { getRepositories } from "@/server/data";

export default async function TeamLayout({ children, params }: LayoutProps<"/[team]">) {
  const { user, team, membership } = await requireTeamMember((await params).team);
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
      <AppSidebar
        user={user}
        team={team}
        teams={teams}
        workspaces={tree}
        canManage={can(membership.role, "workspace:create")}
      />
      {/* min-w-0 keeps wide content (the board) from pushing the header off-screen. */}
      <SidebarInset className="min-w-0">
        <AppHeader teamSlug={team.slug} boards={boards} />
        <div className="flex min-h-0 flex-1 flex-col p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
```

- [ ] **Step 3: My tasks**

Replace `src/app/[team]/page.tsx`:

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { LabelChip } from "@/components/tasks/label-chip";
import { PriorityIcon } from "@/components/tasks/priority";
import { boardPath } from "@/lib/paths";
import { requireTeamMember } from "@/server/auth/guards";
import { getRepositories } from "@/server/data";

export const metadata: Metadata = { title: "My tasks" };

export default async function MyTasksPage({ params }: PageProps<"/[team]">) {
  const { user, team } = await requireTeamMember((await params).team);
  const repos = getRepositories();
  const [tasks, labels, workspaces] = await Promise.all([
    repos.tasks.listAssignedTo(team.id, user.id),
    repos.labels.listForTeam(team.id),
    repos.workspaces.listForTeam(team.id),
  ]);
  const boards = (await Promise.all(workspaces.map((w) => repos.boards.listForWorkspace(w.id)))).flat();
  const columns = (await Promise.all(boards.map((b) => repos.boards.listColumns(b.id)))).flat();
  const boardName = new Map(boards.map((b) => [b.id, b.name]));
  const columnName = new Map(columns.map((c) => [c.id, c.name]));

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      <h1 className="text-2xl font-semibold">My tasks</h1>
      {tasks.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Nothing assigned to you yet. Assign yourself a task from any board.
        </p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {tasks.map((task) => (
            <li key={task.id}>
              <Link
                href={`${boardPath(team.slug, task.boardId)}?task=${task.key}`}
                className="hover:bg-muted/50 flex items-center gap-3 px-4 py-3 text-sm"
              >
                <PriorityIcon priority={task.priority} />
                <span className="text-muted-foreground w-16 shrink-0 font-mono text-xs">{task.key}</span>
                <span className="min-w-0 flex-1 truncate font-medium">{task.title}</span>
                {labels
                  .filter((label) => task.labelIds.includes(label.id))
                  .map((label) => (
                    <LabelChip key={label.id} label={label} />
                  ))}
                <span className="text-muted-foreground hidden text-xs sm:inline">
                  {boardName.get(task.boardId)} · {columnName.get(task.columnId)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Verify**

Run: `rm -rf .next && pnpm test && pnpm lint && pnpm typecheck && pnpm build && pnpm test:e2e`
Expected: 154 unit tests; build clean; 12 e2e tests pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(shell): manage workspaces and boards from the sidebar; list my tasks"
```

---

### Task 8: E2E coverage, docs, PR

**Files:**
- Create: `e2e/board.spec.ts`
- Modify: `e2e/helpers.ts`, `README.md`, `docs/build-plan.md` (status table)

**Interfaces:**
- Produces: helpers `openFreshBoard(page)` (new user + team + empty ENG board, so mutating tests never share data), `column(page, name)`, `quickAdd(page, column, title)`, `drag(page, from, to, offsetY?)` (real pointer events past dnd-kit's 5px threshold), `saved(page)` (gotcha 2); 8 new e2e tests.

- [ ] **Step 1: Helpers and specs**

Replace `e2e/helpers.ts`:

```ts
import { expect, type Locator, type Page } from "@playwright/test";

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

/** Signs up a fresh user with their own team and lands on its empty "Engineering" board (keys ENG-n). */
export async function openFreshBoard(page: Page) {
  const id = await signUp(page);
  await createTeamAndWorkspace(page, `Team ${id}`);
  await page.getByRole("link", { name: "Skip for now" }).click();
  await expect(page.getByRole("region", { name: "Backlog" })).toBeVisible();
  return id;
}

export const column = (page: Page, name: string) => page.getByRole("region", { name, exact: true });

/** Adds a task at the top of a column and waits until the server has assigned its key. */
export async function quickAdd(page: Page, columnName: string, title: string) {
  await page.getByRole("button", { name: `Add task to ${columnName}` }).click();
  const input = page.getByLabel(`New task in ${columnName}`);
  await input.fill(title);
  await input.press("Enter");
  await input.press("Escape");
  await expect(column(page, columnName).getByRole("article").filter({ hasText: title })).toContainText(/ENG-\d+/);
}

/** Drags with real pointer events (dnd-kit needs movement past its 5px activation distance). */
export async function drag(page: Page, from: Locator, to: Locator, offsetY = 60) {
  const source = (await from.boundingBox())!;
  const target = (await to.boundingBox())!;
  await page.mouse.move(source.x + source.width / 2, source.y + source.height / 2);
  await page.mouse.down();
  await page.mouse.move(source.x + source.width / 2 + 10, source.y + source.height / 2, { steps: 5 });
  await page.mouse.move(target.x + target.width / 2, target.y + offsetY, { steps: 20 });
  await page.mouse.up();
}

/** Waits until the board has no mutation in flight (it sets aria-busy while saving). */
export async function saved(page: Page) {
  await expect(page.locator('[data-slot="board"]')).toHaveAttribute("aria-busy", "false");
}
```

Create `e2e/board.spec.ts`:

```ts
import { expect, test } from "@playwright/test";
import { column, drag, openFreshBoard, quickAdd, saved, signInAsDemo } from "./helpers";

test("C opens the create dialog and the task is edited in its sheet", async ({ page }) => {
  await openFreshBoard(page);
  await page.keyboard.press("c");
  const dialog = page.getByRole("dialog", { name: "New task" });
  await dialog.getByLabel("Title", { exact: true }).fill("Write the spec");
  await dialog.getByRole("button", { name: "Create task" }).click();
  await expect(dialog).toBeHidden();
  await expect(column(page, "Todo")).toContainText("ENG-1");

  await page.getByRole("link", { name: "Write the spec" }).click();
  await expect(page).toHaveURL(/\?task=ENG-1$/);
  const sheet = page.getByRole("dialog", { name: "Write the spec" });

  await sheet.getByRole("combobox", { name: "Priority" }).click();
  await page.getByRole("option", { name: "High" }).click();
  await sheet.getByRole("button", { name: "Labels" }).click();
  await page.getByRole("menuitemcheckbox", { name: "Bug" }).click();
  await page.keyboard.press("Escape");

  await sheet.getByRole("tab", { name: "Write" }).click();
  await sheet.getByLabel("Description").fill("Needs **tests**.");
  await sheet.getByRole("button", { name: "Save description" }).click();
  await expect(sheet.locator("strong", { hasText: "tests" })).toBeVisible();

  await sheet.getByLabel("Comment").fill("Looks *good*");
  await sheet.getByRole("button", { name: "Comment", exact: true }).click();
  await expect(sheet.locator("em", { hasText: "good" })).toBeVisible();

  await saved(page);
  await page.reload();
  const reopened = page.getByRole("dialog", { name: "Write the spec" });
  await expect(reopened.getByRole("combobox", { name: "Priority" })).toHaveText(/High/);
  await expect(reopened.locator("em", { hasText: "good" })).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(page).not.toHaveURL(/task=/);
  await expect(column(page, "Todo").getByRole("article")).toContainText("Bug");
});

test("dragging a card to another column persists", async ({ page }) => {
  await openFreshBoard(page);
  await quickAdd(page, "Backlog", "Drag me");
  await drag(page, column(page, "Backlog").getByRole("article").filter({ hasText: "Drag me" }), column(page, "In Progress"));
  await expect(column(page, "In Progress")).toContainText("Drag me");
  await saved(page);
  await page.reload();
  await expect(column(page, "In Progress")).toContainText("Drag me");
  await expect(column(page, "Backlog")).toContainText("No tasks");
});

test("dragging reorders cards within a column", async ({ page }) => {
  await openFreshBoard(page);
  await quickAdd(page, "Todo", "Bottom");
  await quickAdd(page, "Todo", "Top"); // quick-add inserts at the top
  const titles = () => column(page, "Todo").getByRole("link").allTextContents();
  expect(await titles()).toEqual(["Top", "Bottom"]);

  const bottom = column(page, "Todo").getByRole("article").filter({ hasText: "Bottom" });
  await drag(page, bottom, column(page, "Todo").getByRole("article").filter({ hasText: "Top" }), 5);
  await expect.poll(titles).toEqual(["Bottom", "Top"]);
  await saved(page);
  await page.reload();
  expect(await titles()).toEqual(["Bottom", "Top"]);
});

test("columns can be added, renamed and deleted", async ({ page }) => {
  await openFreshBoard(page);
  await page.getByRole("button", { name: "Add column" }).click();
  await page.getByLabel("New column name").fill("QA");
  await page.getByLabel("New column name").press("Enter");
  await expect(column(page, "QA")).toHaveAttribute("aria-busy", "false");

  await page.getByRole("button", { name: "Column actions for QA" }).click();
  await page.getByRole("menuitem", { name: "Rename" }).click();
  await page.getByLabel("Column name").fill("Testing");
  await page.getByLabel("Column name").press("Enter");
  await expect(column(page, "Testing")).toBeVisible();
  await saved(page);
  await page.reload();
  await expect(column(page, "Testing")).toBeVisible();

  await page.getByRole("button", { name: "Column actions for Testing" }).click();
  await page.getByRole("menuitem", { name: "Delete column" }).click();
  await expect(column(page, "Testing")).toBeHidden();
  await saved(page);
  await page.reload();
  await expect(column(page, "Testing")).toBeHidden();
});

test("a task can be deleted from its sheet", async ({ page }) => {
  await openFreshBoard(page);
  await quickAdd(page, "Todo", "Short-lived");
  await page.getByRole("link", { name: "Short-lived" }).click();
  await page.getByRole("button", { name: "Delete task" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText("Deleted ENG-1")).toBeVisible();
  await expect(column(page, "Todo")).toContainText("No tasks");
  await saved(page);
  await page.reload();
  await expect(column(page, "Todo")).toContainText("No tasks");
});

test("filters narrow the board and survive a reload", async ({ page }) => {
  await signInAsDemo(page);
  await page.getByRole("link", { name: "Engineering", exact: true }).click();
  await expect(column(page, "Backlog")).toContainText("ENG-1");

  await page.getByRole("button", { name: "Priority" }).click();
  await page.getByRole("menuitemcheckbox", { name: "Urgent" }).click();
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(/priority=urgent/);
  await expect(page.getByRole("article")).toHaveCount(1);
  await expect(page.getByRole("article")).toContainText("ENG-5");

  await saved(page);
  await page.reload();
  await expect(page.getByRole("article")).toHaveCount(1);

  await page.getByRole("button", { name: "Clear filters" }).click();
  await page.getByLabel("Search tasks").fill("kanban");
  await expect(page).toHaveURL(/q=kanban/);
  await expect(page.getByRole("article")).toHaveCount(1);
  await expect(page.getByRole("article")).toContainText("ENG-4");
});

test("My tasks lists what is assigned to me and opens it on its board", async ({ page }) => {
  await signInAsDemo(page);
  await page.getByRole("link", { name: /Build the Kanban board/ }).click();
  await expect(page).toHaveURL(/\/board\/.+\?task=ENG-4$/);
  await expect(page.getByRole("dialog", { name: "Build the Kanban board" })).toBeVisible();
});

test("workspaces and boards are managed from the sidebar", async ({ page }) => {
  await openFreshBoard(page);

  await page.getByRole("button", { name: "New workspace" }).click();
  const dialog = page.getByRole("dialog", { name: "New workspace" });
  await dialog.getByLabel("Workspace name").fill("Design");
  await expect(dialog.getByLabel("Key prefix")).toHaveValue("DES");
  await dialog.getByRole("button", { name: "Create workspace" }).click();
  await expect(page.getByRole("heading", { name: "Design", level: 1 })).toBeVisible();

  await page.getByRole("button", { name: "Workspace actions for Design" }).click();
  await page.getByRole("menuitem", { name: "New board" }).click();
  await page.getByLabel("Board name").fill("Roadmap");
  await page.getByRole("button", { name: "Create board" }).click();
  await expect(page.getByRole("heading", { name: "Roadmap", level: 1 })).toBeVisible();

  await page.getByRole("button", { name: "Board actions" }).click();
  await page.getByRole("menuitem", { name: "Edit board" }).click();
  await page.getByLabel("Board name").fill("Roadmap 2027");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("heading", { name: "Roadmap 2027", level: 1 })).toBeVisible();

  await page.getByRole("button", { name: "Board actions" }).click();
  await page.getByRole("menuitem", { name: "Delete board" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete board" }).click();
  await expect(page.getByRole("heading", { name: "My tasks" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Roadmap 2027" })).toHaveCount(0);

  await page.getByRole("button", { name: "Workspace actions for Design" }).click();
  await page.getByRole("menuitem", { name: "Rename workspace" }).click();
  await page.getByLabel("Workspace name").fill("Product design");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("button", { name: "Workspace actions for Product design" })).toBeAttached();
});
```

- [ ] **Step 2: Run**

Run: `pnpm test:e2e`
Expected: `20 passed`. Run it three times (`CI=1 pnpm test:e2e --retries=0`) to check for flakiness; the dry run was 20/20 every time.

- [ ] **Step 3: Docs** — in `README.md` under **Develop**, add: "Mock data from before M2 has no labels; delete `.data/` to reseed." In this file's status table mark M2 `✅ Done` and M3 `Planned when M2 is merged`.

- [ ] **Step 4: Full verification**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e`
Expected: 154 unit + 20 e2e green.

- [ ] **Step 5: Commit, push, PR**

```bash
git add -A
git commit -m "test(e2e): cover Kanban drag and drop, task sheet, filters and sidebar management"
git push -u origin m2-kanban
gh pr create --base main --title "M2: workspaces, boards & Kanban" --body "..."
```
Then confirm CI is green on the PR.

---

## M2 Definition of Done

- Create a task (dialog, `C`, or quick-add), drag it across and within columns, reorder columns, and edit every field in the URL-addressable sheet — all persisted and optimistic, with errors surfaced as toasts.
- Workspaces and boards can be created, renamed and deleted from the sidebar/board header; columns can be added, renamed, reordered and deleted (when empty).
- Filters (assignee, priority, labels, search) live in the URL and survive reloads; drops while filtered land correctly among hidden cards.
- My tasks lists the caller's assignments across the team.
- 154 unit tests (TDD for positions, filters, refs, reducers, repositories, permissions) + 20 e2e tests green locally and in CI.

---

# M3 — Team & user management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A second person can be invited, join and collaborate. Team settings at `/[team]/settings` (General · Members · Labels · Profile): rename/delete the team, change roles, remove members, transfer ownership, leave; invite by email with a role, see pending invites (copy link, resend, revoke); manage labels; edit your profile (name, avatar URL, theme). Invite links (`/invite/[token]`) survive sign-in/sign-up, and the theme preference is stored per user.

**Architecture:** Same layering as M2: Zod input schemas (`@/lib/domain`) → Server Actions (`src/server/actions/{members,invites,team,labels,profile}.ts`) → guards (`requireTeamMember`, new `requireLabelAccess` / `requireInviteAccess`) → `permissions.ts` → repositories. Member management rules are pure functions in `permissions.ts` (`canManageMember`, `assignableRoles`, `canLeaveTeam`) and are unit-tested. Invite acceptance is one atomic repository write that checks token, expiry and the invited email. Invite emails are still only logged (`deliverInvites`, M5 swaps in Resend); managers can copy the link from the members page meanwhile.

**Product decisions to confirm in review:**
- Accepting an invite requires being signed in with the **invited email**; a different account sees "Wrong account" with a sign-out-and-switch link that keeps the invite.
- The owner manages admins and members; admins manage members only; nobody changes or removes the owner. Ownership moves only by an explicit transfer, which makes the old owner an admin. The owner must transfer before leaving; only the owner can delete the team.
- Owners and admins can invite as member or admin. Removed members' tasks and comments stay (their name shows as "Former member").
- Avatars are image URLs for now (uploads arrive with Supabase Storage). Theme is saved per user from the profile, the header toggle and ⌘K, and applied when you sign in on another device.
- The team URL (slug) can't be changed.

**New dependencies:** none.

## Global Constraints

- Everything in M0–M2's Global Constraints still applies. Branch: `git switch -c m3-team-management` from an up-to-date `main`.
- Before opening the PR, run the `pre-pr-reviewer` subagent (`.claude/agents/pre-pr-reviewer.md`) on the branch and fix its findings; then open the PR and queue auto-merge (merge commit) so it lands when CI passes.

## Verified gotchas (found while dry-running this plan)

1. Making `role` part of `createInvitesInputSchema` (with a default) makes it **required** in the inferred type, which broke existing `invites.create` calls → the repository accepts `Omit<CreateInvitesInput, "role"> & { role?: InviteRole }`.
2. While a confirmation dialog is open, Radix hides the rest of the page from the accessibility tree, so an e2e assertion like "the member row is gone" passed *before* the server removed them → wait for the success toast, which only appears after the action resolves.
3. **Bug in M2, fixed here:** the board toolbar's debounced search (and quick successive filter clicks) started from filters of the last render, so "Clear filters" followed by typing within 250 ms re-applied the old filters → every change now derives from, and updates, a `latest` ref synchronously.
4. `type="url"` makes the browser block the submit, so the server's avatar-URL message never renders in e2e → the test checks `checkValidity()` instead.
5. The theme toggle now saves a per-user preference. The M1 e2e test toggled the shared **demo** user, which would leak into retries → the theme test uses a fresh user, waits for the save request, and checks a second browser context (a "new device").
6. `ThemePreferenceSync` applies the saved theme once per value (ref), otherwise it would undo toggles made before the page's data refreshed.
7. Optimistic label edits race page reloads just like the board (M2 gotcha 2) → the label list is `aria-busy` while saving and the test waits for it.
8. Found while building (not in the dry run): with the machine under load (load average ≈ 12) a server action took longer than Playwright's default 5 s `expect` timeout → `playwright.config.ts` sets `expect: { timeout: 10_000 }`.

Preventive: invite links are built from `x-forwarded-host`/`host` so they're correct behind a proxy; `/sign-out?next=` goes through `safeNextPath` so it can't become an open redirect.

## File map (end of M3)

```
src/
  app/[team]/settings/layout.tsx, page.tsx            General (Task 5)
  app/[team]/settings/{members,labels,profile}/page.tsx  (Task 5)
  app/invite/[token]/page.tsx                         accept flow (Task 6)
  app/(auth)/sign-up/page.tsx, app/sign-out/route.ts  keep ?next= (Task 6)
  app/[team]/layout.tsx                               ThemePreferenceSync (Task 7)
  components/
    settings/{settings-nav,settings-section,team-forms,members,labels,profile-form}.tsx  (Task 5)
    invites/accept-invite-button.tsx                  (Task 6)
    theme/theme-preference-sync.tsx, theme-toggle.tsx (+test)                            (Task 7)
    shell/{nav-items,command-menu(+test),app-sidebar}.tsx  Settings nav, profile link   (Tasks 5, 7)
    tasks/member-avatar.tsx                           shadcn Avatar with image (Task 5)
    board/board-toolbar.tsx                           stale-filter fix (Task 5)
  lib/
    domain/schemas.ts, constants.ts (+test)           theme, profile, team, label, invite role (Task 1)
    auth/routes.ts (+test)                            withNext (Task 6)
    paths.ts                                          settingsPath, invitePath (Task 4)
  server/
    actions/{members,invites,team,labels,profile}.ts  (Task 4)
    actions/{shared,onboarding,auth}.ts               deliverInvites, absoluteUrl, sign-up next (Task 4)
    auth/guards.ts, permissions.ts (+test)            (Tasks 3, 4)
    data/types.ts, mock/repositories.ts (+test)       (Tasks 1–2)
e2e/helpers.ts, team.spec.ts, shell.spec.ts            (Tasks 7–8)
```

---

### Task 1: Domain — theme, profile, team, label and invite-role schemas

**Files:**
- Modify: `src/lib/domain/constants.ts`, `src/lib/domain/schemas.ts`, `src/lib/domain/schemas.test.ts`, `src/server/data/types.ts` (one signature)

**Interfaces:**
- Produces: `THEMES`; `themeSchema`/`Theme`, `inviteRoleSchema`/`InviteRole`; `userSchema.theme` (optional — users from before M3 have none); `updateTeamInputSchema`, `updateProfileInputSchema`, `labelInputSchema`, `updateLabelInputSchema` and their types; `createInvitesInputSchema.role` (default `"member"`).

- [ ] **Step 1: Write the failing tests**

Replace `src/lib/domain/schemas.test.ts` (M2 tests plus profile, team, label and invite-role inputs):

```ts
import { describe, expect, it } from "vitest";
import {
  assigneeSchema,
  createCommentInputSchema,
  createInvitesInputSchema,
  createTaskInputSchema,
  keyPrefixSchema,
  labelInputSchema,
  labelSchema,
  signUpInputSchema,
  slugSchema,
  updateLabelInputSchema,
  updateProfileInputSchema,
  updateTaskInputSchema,
  updateTeamInputSchema,
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

describe("labels and comments", () => {
  it("accepts palette colours only", () => {
    expect(labelSchema.safeParse({ id: "l", teamId: "t", name: "Bug", color: "red" }).success).toBe(true);
    expect(labelSchema.safeParse({ id: "l", teamId: "t", name: "Bug", color: "#ff0000" }).success).toBe(false);
  });

  it("trims comment bodies and rejects blank ones", () => {
    expect(createCommentInputSchema.parse({ taskId: "t", body: "  hi  " })).toEqual({ taskId: "t", body: "hi" });
    expect(createCommentInputSchema.safeParse({ taskId: "t", body: "   " }).success).toBe(false);
  });
});

describe("profile, team and label inputs", () => {
  it("accepts a profile with an optional avatar URL and a theme", () => {
    expect(updateProfileInputSchema.parse({ name: " Ada ", avatarUrl: null, theme: "light" })).toEqual({
      name: "Ada",
      avatarUrl: null,
      theme: "light",
    });
    expect(updateProfileInputSchema.safeParse({ name: "Ada", avatarUrl: "not a url", theme: "dark" }).success).toBe(false);
    expect(updateProfileInputSchema.safeParse({ name: "Ada", avatarUrl: null, theme: "sepia" }).success).toBe(false);
  });

  it("validates label names and colours", () => {
    expect(labelInputSchema.parse({ name: " Ops ", color: "green" })).toEqual({ name: "Ops", color: "green" });
    expect(labelInputSchema.safeParse({ name: "", color: "green" }).success).toBe(false);
    expect(updateLabelInputSchema.parse({ color: "pink" })).toEqual({ color: "pink" });
  });

  it("renames teams", () => {
    expect(updateTeamInputSchema.parse({ name: " Acme 2 " })).toEqual({ name: "Acme 2" });
  });

  it("defaults invites to the member role and never invites owners", () => {
    expect(createInvitesInputSchema.parse({ teamId: "t", emails: ["a@b.test"] }).role).toBe("member");
    expect(createInvitesInputSchema.parse({ teamId: "t", emails: ["a@b.test"], role: "admin" }).role).toBe("admin");
    expect(createInvitesInputSchema.safeParse({ teamId: "t", emails: ["a@b.test"], role: "owner" }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm test src/lib/domain`
Expected: FAIL — 4 tests (`updateProfileInputSchema` etc. are undefined).

- [ ] **Step 3: Implement**

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

// Label colours map to --label-<name> CSS variables in globals.css.
export const LABEL_COLORS = ["gray", "red", "orange", "yellow", "green", "blue", "purple", "pink"] as const;

// Seeded on every new team; editable from team settings in M3.
export const DEFAULT_LABELS = [
  { name: "Bug", color: "red" },
  { name: "Feature", color: "purple" },
  { name: "Improvement", color: "blue" },
  { name: "Docs", color: "gray" },
] as const;

// "system" follows the OS; dark is the app default (PRD §6).
export const THEMES = ["system", "light", "dark"] as const;
```

Replace `src/lib/domain/schemas.ts`:

```ts
import { z } from "zod";
import { LABEL_COLORS, MAX_INVITES_PER_BATCH, RESERVED_SLUGS, THEMES } from "./constants";

export const ROLES = ["owner", "admin", "member"] as const;
export const PRIORITIES = ["none", "low", "medium", "high", "urgent"] as const;
export const PLANS = ["lite", "pro"] as const;

export const idSchema = z.string().min(1);
export const roleSchema = z.enum(ROLES);
export const inviteRoleSchema = roleSchema.exclude(["owner"]);
export const themeSchema = z.enum(THEMES);
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
  avatarUrl: z.url("Enter a full URL, like https://…").nullable(),
  /** Absent for users created before M3; the app then uses the dark default. */
  theme: themeSchema.optional(),
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

export const labelColorSchema = z.enum(LABEL_COLORS);

export const labelSchema = z.object({
  id: idSchema,
  teamId: idSchema,
  name: z.string().trim().min(1).max(30),
  color: labelColorSchema,
});

export const commentAuthorSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("user"), userId: idSchema }),
  z.object({ kind: z.literal("agent"), agentId: idSchema }),
]);

export const commentSchema = z.object({
  id: idSchema,
  taskId: idSchema,
  author: commentAuthorSchema,
  body: z.string().trim().min(1, "Write something first").max(10_000),
  createdAt: timestampSchema,
});

export const inviteSchema = z.object({
  id: idSchema,
  teamId: idSchema,
  email: z.email(),
  role: inviteRoleSchema,
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
  role: inviteRoleSchema.default("member"),
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

export const updateTeamInputSchema = teamSchema.pick({ name: true });

export const updateProfileInputSchema = z.object({
  name: userSchema.shape.name,
  avatarUrl: userSchema.shape.avatarUrl,
  theme: themeSchema,
});

export const labelInputSchema = labelSchema.pick({ name: true, color: true });
export const updateLabelInputSchema = labelInputSchema.partial();

export const updateWorkspaceInputSchema = workspaceSchema.pick({ name: true });

export const updateBoardInputSchema = boardSchema.pick({ name: true, description: true }).partial();

export const columnNameSchema = columnSchema.shape.name;

export const createCommentInputSchema = commentSchema.pick({ taskId: true, body: true });

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
export type Theme = z.infer<typeof themeSchema>;
export type InviteRole = z.infer<typeof inviteRoleSchema>;
export type UpdateTeamInput = z.infer<typeof updateTeamInputSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileInputSchema>;
export type LabelInput = z.infer<typeof labelInputSchema>;
export type UpdateLabelInput = z.infer<typeof updateLabelInputSchema>;
export type LabelColor = z.infer<typeof labelColorSchema>;
export type Label = z.infer<typeof labelSchema>;
export type CommentAuthor = z.infer<typeof commentAuthorSchema>;
export type Comment = z.infer<typeof commentSchema>;
export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceInputSchema>;
export type UpdateBoardInput = z.infer<typeof updateBoardInputSchema>;
export type CreateCommentInput = z.infer<typeof createCommentInputSchema>;
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

In `src/server/data/types.ts` (gotcha 1), import `InviteRole` from `@/lib/domain` and change `InvitesRepo.create` to:

```ts
  create(input: Omit<CreateInvitesInput, "role"> & { role?: InviteRole; invitedBy: string }): Promise<Invite[]>;
```

- [ ] **Step 4: Verify**

Run: `pnpm test && pnpm lint && pnpm typecheck`
Expected: 158 tests pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(domain): add profile, team, label and invite-role schemas"
```

---

### Task 2: Data layer — profiles, team admin, invite lifecycle, labels

**Files:**
- Modify: `src/server/data/types.ts`, `src/server/data/mock/repositories.ts`, `src/server/data/mock/repositories.test.ts`

**Interfaces:**
- Produces: `users.update(id, patch)`; `teams.update`, `teams.delete` (cascades workspaces → boards → tasks/comments, labels, invites, memberships); `memberships.transferOwnership(teamId, from, to)`; `invites.create({ role? })`, `invites.get`, `getByToken`, `resend` (new token + expiry), `revoke`, `accept(token, userId)` (ConflictError `token` when used/expired, `email` when sent to someone else; returns the membership); `labels.get`, `create(teamId, input)` / `update` (unique names per team, case-insensitive → ConflictError `name`), `delete` (strips it from tasks).

- [ ] **Step 1: Write the failing tests**

Replace `src/server/data/mock/repositories.test.ts` (adds a `joinTeam` helper and profile, team-admin, invite-lifecycle and label tests):

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_COLUMNS, DEFAULT_LABELS, createTaskInputSchema, type User } from "@/lib/domain";
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

/** Signs a user up and adds them to the team through an accepted invite. */
async function joinTeam(teamId: string, email: string) {
  const [invite] = await repos.invites.create({ teamId, emails: [email], invitedBy: owner.id });
  const user = await repos.auth.signUp({ name: email, email, password: "password1" });
  await repos.invites.accept(invite.token, user.id);
  return user;
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
    const moved = await repos.tasks.move(task.id, { columnId: columns[2].id, index: 0 });
    expect(moved.columnId).toBe(columns[2].id);
    expect(await repos.tasks.get(task.id)).toEqual(moved);
  });

  it("inserts quick-added tasks at the start and moves by index", async () => {
    const { board, columns } = await setupBoard();
    const [todo] = columns;
    const a = await repos.tasks.create(taskInput(board.id, todo.id, "A"));
    const b = await repos.tasks.create(taskInput(board.id, todo.id, "B"));
    const top = await repos.tasks.create({ ...taskInput(board.id, todo.id, "Top"), placement: "start" });
    const titles = async () => (await repos.tasks.listForBoard(board.id)).map((t) => t.title);
    expect(await titles()).toEqual(["Top", "A", "B"]);

    await repos.tasks.move(top.id, { columnId: todo.id, index: 2 }); // index among the others
    expect(await titles()).toEqual(["A", "B", "Top"]);
    await repos.tasks.move(b.id, { columnId: todo.id, index: 0 });
    expect(await titles()).toEqual(["B", "A", "Top"]);
    expect(a.key).toBe("ENG-1");
  });

  it("deletes a task with its comments and detaches sub-tasks", async () => {
    const { board, columns } = await setupBoard();
    const parent = await repos.tasks.create(taskInput(board.id, columns[0].id, "Parent"));
    const child = await repos.tasks.create({
      ...taskInput(board.id, columns[0].id, "Child"),
      parentId: parent.id,
    });
    await repos.comments.create({ taskId: parent.id, body: "hi", author: { kind: "user", userId: owner.id } });
    await repos.tasks.delete(parent.id);
    expect(await repos.tasks.get(parent.id)).toBeNull();
    expect((await repos.tasks.get(child.id))?.parentId).toBeNull();
    expect(await repos.comments.listForTask(parent.id)).toEqual([]);
  });

  it("lists tasks assigned to a user across the team's boards", async () => {
    const { team, board, columns } = await setupBoard();
    const mine = await repos.tasks.create({
      ...taskInput(board.id, columns[0].id, "Mine"),
      assignee: { kind: "user", userId: owner.id },
    });
    await repos.tasks.create(taskInput(board.id, columns[0].id, "Nobody's"));
    expect((await repos.tasks.listAssignedTo(team.id, owner.id)).map((t) => t.id)).toEqual([mine.id]);
  });
});

describe("columns", () => {
  it("adds, renames and reorders columns", async () => {
    const { board } = await setupBoard();
    const added = await repos.boards.createColumn(board.id, "QA");
    await repos.boards.renameColumn(added.id, "Testing");
    await repos.boards.moveColumn(added.id, 0);
    const names = (await repos.boards.listColumns(board.id)).map((c) => c.name);
    expect(names).toEqual(["Testing", ...DEFAULT_COLUMNS]);
    expect(await repos.boards.getColumn(added.id)).toMatchObject({ name: "Testing" });
  });

  it("refuses to delete a column that still has tasks, or the last column", async () => {
    const { board, columns } = await setupBoard();
    await repos.tasks.create(taskInput(board.id, columns[0].id, "Busy"));
    await expect(repos.boards.deleteColumn(columns[0].id)).rejects.toBeInstanceOf(ConflictError);
    for (const column of columns.slice(1, -1)) await repos.boards.deleteColumn(column.id);
    await repos.tasks.delete((await repos.tasks.listForBoard(board.id))[0].id);
    await repos.boards.deleteColumn(columns[0].id);
    const [last] = await repos.boards.listColumns(board.id);
    await expect(repos.boards.deleteColumn(last.id)).rejects.toBeInstanceOf(ConflictError);
  });
});

describe("updates and cascading deletes", () => {
  it("renames workspaces and boards", async () => {
    const { workspace, board } = await setupBoard();
    expect(await repos.workspaces.update(workspace.id, { name: "Platform" })).toMatchObject({ name: "Platform" });
    expect(await repos.boards.update(board.id, { description: "Sprint work" })).toMatchObject({
      name: "Eng",
      description: "Sprint work",
    });
  });

  it("deleting a workspace removes its boards, columns and tasks", async () => {
    const { workspace, board, columns } = await setupBoard();
    const task = await repos.tasks.create(taskInput(board.id, columns[0].id, "Gone"));
    await repos.workspaces.delete(workspace.id);
    expect(await repos.workspaces.get(workspace.id)).toBeNull();
    expect(await repos.boards.get(board.id)).toBeNull();
    expect(await repos.boards.listColumns(board.id)).toEqual([]);
    expect(await repos.tasks.get(task.id)).toBeNull();
  });

  it("deleting a board keeps its workspace", async () => {
    const { workspace, board } = await setupBoard();
    await repos.boards.delete(board.id);
    expect(await repos.boards.listForWorkspace(workspace.id)).toEqual([]);
    expect(await repos.workspaces.get(workspace.id)).not.toBeNull();
  });
});

describe("labels, comments and members", () => {
  it("seeds the default labels on team creation", async () => {
    const { team } = await setupBoard();
    const labels = await repos.labels.listForTeam(team.id);
    expect(labels.map((l) => l.name)).toEqual(DEFAULT_LABELS.map((l) => l.name));
  });

  it("stores comments oldest first", async () => {
    const { board, columns } = await setupBoard();
    const task = await repos.tasks.create(taskInput(board.id, columns[0].id, "Talk"));
    const author = { kind: "user" as const, userId: owner.id };
    const first = await repos.comments.create({ taskId: task.id, body: "first", author });
    await repos.comments.create({ taskId: task.id, body: "second", author });
    expect((await repos.comments.listForTask(task.id)).map((c) => c.body)).toEqual(["first", "second"]);
    expect(await repos.comments.get(first.id)).toEqual(first);
    await repos.comments.delete(first.id);
    expect((await repos.comments.listForTask(task.id)).map((c) => c.body)).toEqual(["second"]);
  });

  it("lists members with their user records", async () => {
    const { team } = await setupBoard();
    expect(await repos.teams.get(team.id)).toEqual(team);
    const [member] = await repos.memberships.listMembers(team.id);
    expect(member).toMatchObject({ role: "owner", user: { id: owner.id, name: "Owner" } });
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

describe("profiles", () => {
  it("updates name, avatar and theme", async () => {
    const updated = await repos.users.update(owner.id, {
      name: "Owner Two",
      avatarUrl: "https://example.test/a.png",
      theme: "light",
    });
    expect(updated).toMatchObject({ name: "Owner Two", avatarUrl: "https://example.test/a.png", theme: "light" });
    expect(await repos.users.getById(owner.id)).toEqual(updated);
  });
});

describe("team administration", () => {
  it("renames a team", async () => {
    const { team } = await setupBoard();
    expect(await repos.teams.update(team.id, { name: "Acme Corp" })).toMatchObject({ name: "Acme Corp", slug: "acme" });
  });

  it("deleting a team removes everything in it", async () => {
    const { team, workspace, board, columns } = await setupBoard();
    const task = await repos.tasks.create(taskInput(board.id, columns[0].id, "Gone"));
    await repos.invites.create({ teamId: team.id, emails: ["x@example.test"], invitedBy: owner.id });
    await repos.teams.delete(team.id);
    expect(await repos.teams.get(team.id)).toBeNull();
    expect(await repos.workspaces.get(workspace.id)).toBeNull();
    expect(await repos.tasks.get(task.id)).toBeNull();
    expect(await repos.memberships.list(team.id)).toEqual([]);
    expect(await repos.labels.listForTeam(team.id)).toEqual([]);
    expect(await repos.invites.listPending(team.id)).toEqual([]);
    expect(await repos.teams.listForUser(owner.id)).toEqual([]);
  });

  it("transfers ownership so there is always exactly one owner", async () => {
    const { team } = await setupBoard();
    const member = await joinTeam(team.id, "m@example.test");
    await repos.memberships.transferOwnership(team.id, owner.id, member.id);
    const roles = Object.fromEntries((await repos.memberships.list(team.id)).map((m) => [m.userId, m.role]));
    expect(roles).toEqual({ [owner.id]: "admin", [member.id]: "owner" });
  });

  it("refuses to transfer ownership to a non-member", async () => {
    const { team } = await setupBoard();
    const stranger = await repos.auth.signUp({ name: "S", email: "s@example.test", password: "password1" });
    await expect(repos.memberships.transferOwnership(team.id, owner.id, stranger.id)).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});

describe("invite lifecycle", () => {
  it("creates invites with a role and finds them by token", async () => {
    const { team } = await setupBoard();
    const [invite] = await repos.invites.create({
      teamId: team.id,
      emails: ["lead@example.test"],
      role: "admin",
      invitedBy: owner.id,
    });
    expect(invite.role).toBe("admin");
    expect(await repos.invites.getByToken(invite.token)).toEqual(invite);
    expect(await repos.invites.get(invite.id)).toEqual(invite);
  });

  it("accepts an invite for the invited email only, once", async () => {
    const { team } = await setupBoard();
    const [invite] = await repos.invites.create({ teamId: team.id, emails: ["new@example.test"], invitedBy: owner.id });
    const other = await repos.auth.signUp({ name: "O", email: "other@example.test", password: "password1" });
    await expect(repos.invites.accept(invite.token, other.id)).rejects.toBeInstanceOf(ConflictError);

    const invitee = await repos.auth.signUp({ name: "N", email: "new@example.test", password: "password1" });
    const membership = await repos.invites.accept(invite.token, invitee.id);
    expect(membership).toMatchObject({ teamId: team.id, userId: invitee.id, role: "member" });
    expect(await repos.invites.listPending(team.id)).toEqual([]);
    await expect(repos.invites.accept(invite.token, invitee.id)).rejects.toBeInstanceOf(ConflictError);
  });

  it("resends with a fresh token and expiry, and revokes", async () => {
    const { team } = await setupBoard();
    const [invite] = await repos.invites.create({ teamId: team.id, emails: ["r@example.test"], invitedBy: owner.id });
    const resent = await repos.invites.resend(invite.id);
    expect(resent.token).not.toBe(invite.token);
    expect(await repos.invites.getByToken(invite.token)).toBeNull();
    expect(resent.expiresAt >= invite.expiresAt).toBe(true);
    await repos.invites.revoke(invite.id);
    expect(await repos.invites.listPending(team.id)).toEqual([]);
  });

  it("rejects expired invites", async () => {
    const store = createMemoryStore(emptyDb());
    const local = createMockRepositories(store);
    const boss = await local.auth.signUp({ name: "B", email: "b@example.test", password: "password1" });
    const team = await local.teams.create({ name: "T", slug: "t-team", ownerId: boss.id });
    const [invite] = await local.invites.create({ teamId: team.id, emails: ["late@example.test"], invitedBy: boss.id });
    await store.write((db) => {
      db.invites[0].expiresAt = "2000-01-01T00:00:00.000Z";
    });
    const late = await local.auth.signUp({ name: "L", email: "late@example.test", password: "password1" });
    await expect(local.invites.accept(invite.token, late.id)).rejects.toThrow(/expired/);
  });
});

describe("label management", () => {
  it("creates, renames, recolours and deletes labels, removing them from tasks", async () => {
    const { team, board, columns } = await setupBoard();
    const label = await repos.labels.create(team.id, { name: "Ops", color: "green" });
    expect(await repos.labels.get(label.id)).toEqual(label);
    await expect(repos.labels.create(team.id, { name: "ops", color: "red" })).rejects.toBeInstanceOf(ConflictError);

    expect(await repos.labels.update(label.id, { name: "Infra", color: "orange" })).toMatchObject({
      name: "Infra",
      color: "orange",
    });
    const task = await repos.tasks.create({ ...taskInput(board.id, columns[0].id, "Tagged"), labelIds: [label.id] });
    await repos.labels.delete(label.id);
    expect(await repos.labels.get(label.id)).toBeNull();
    expect((await repos.tasks.get(task.id))?.labelIds).toEqual([]);
  });

  it("refuses to rename a label onto another label's name", async () => {
    const { team } = await setupBoard();
    const [bug, feature] = await repos.labels.listForTeam(team.id);
    await expect(repos.labels.update(feature.id, { name: bug.name.toUpperCase() })).rejects.toBeInstanceOf(
      ConflictError,
    );
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm test src/server/data`
Expected: FAIL — 11 tests (`repos.users.update is not a function`, …).

- [ ] **Step 3: Implement**

Replace `src/server/data/types.ts`:

```ts
import type {
  Board,
  Column,
  Comment,
  CommentAuthor,
  CreateCommentInput,
  CreateBoardInput,
  CreateInvitesInput,
  CreateTaskInput,
  CreateTeamInput,
  CreateWorkspaceInput,
  Invite,
  InviteRole,
  Label,
  LabelInput,
  Membership,
  Role,
  SignInInput,
  SignUpInput,
  Task,
  Team,
  UpdateBoardInput,
  UpdateLabelInput,
  UpdateProfileInput,
  UpdateTaskInput,
  UpdateTeamInput,
  UpdateWorkspaceInput,
  User,
  Workspace,
} from "@/lib/domain";

export type TeamMember = Membership & { user: User };

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
  update(id: string, patch: Partial<UpdateProfileInput>): Promise<User>;
}

export interface TeamsRepo {
  /** Creates the team, makes `ownerId` its owner and seeds DEFAULT_LABELS. */
  create(input: CreateTeamInput & { ownerId: string }): Promise<Team>;
  get(id: string): Promise<Team | null>;
  getBySlug(slug: string): Promise<Team | null>;
  listForUser(userId: string): Promise<Team[]>;
  update(id: string, patch: UpdateTeamInput): Promise<Team>;
  /** Deletes the team with its memberships, invites, labels and every workspace. */
  delete(id: string): Promise<void>;
}

export interface MembershipsRepo {
  list(teamId: string): Promise<Membership[]>;
  get(teamId: string, userId: string): Promise<Membership | null>;
  /** Memberships joined with their users, ordered by name. */
  listMembers(teamId: string): Promise<TeamMember[]>;
  setRole(teamId: string, userId: string, role: Role): Promise<Membership>;
  remove(teamId: string, userId: string): Promise<void>;
  /** Makes `toUserId` (a member) the owner and demotes the current owner to admin, atomically. */
  transferOwnership(teamId: string, fromUserId: string, toUserId: string): Promise<void>;
}

export interface WorkspacesRepo {
  create(input: CreateWorkspaceInput): Promise<Workspace>;
  get(id: string): Promise<Workspace | null>;
  listForTeam(teamId: string): Promise<Workspace[]>;
  update(id: string, patch: UpdateWorkspaceInput): Promise<Workspace>;
  /** Deletes the workspace with all of its boards, columns, tasks and comments. */
  delete(id: string): Promise<void>;
}

export interface BoardsRepo {
  /** Creates the board and seeds DEFAULT_COLUMNS. */
  create(input: CreateBoardInput): Promise<Board>;
  get(id: string): Promise<Board | null>;
  listForWorkspace(workspaceId: string): Promise<Board[]>;
  update(id: string, patch: UpdateBoardInput): Promise<Board>;
  /** Deletes the board with its columns, tasks and comments. */
  delete(id: string): Promise<void>;
  listColumns(boardId: string): Promise<Column[]>;
  getColumn(id: string): Promise<Column | null>;
  /** Appends a column at the end of the board. */
  createColumn(boardId: string, name: string): Promise<Column>;
  renameColumn(id: string, name: string): Promise<Column>;
  /** Moves the column to `index` among the board's other columns. */
  moveColumn(id: string, index: number): Promise<Column>;
  /** Throws ConflictError("column") if the column still has tasks or is the board's last. */
  deleteColumn(id: string): Promise<void>;
}

export interface TasksRepo {
  /**
   * Allocates the next task number for the board's workspace and places the
   * task at the end of its column (or the start, for quick-add).
   */
  create(input: CreateTaskInput & { createdBy: string; placement?: "start" | "end" }): Promise<Task>;
  get(id: string): Promise<Task | null>;
  getByKey(workspaceId: string, key: string): Promise<Task | null>;
  listForBoard(boardId: string): Promise<Task[]>;
  /** Tasks in any of the team's boards assigned to the user, most recently updated first. */
  listAssignedTo(teamId: string, userId: string): Promise<Task[]>;
  update(id: string, patch: UpdateTaskInput): Promise<Task>;
  /** Moves the task to `index` among the other tasks of `columnId` (same board). */
  move(id: string, to: { columnId: string; index: number }): Promise<Task>;
  /** Deletes the task and its comments; its sub-tasks become top-level. */
  delete(id: string): Promise<void>;
}

export interface LabelsRepo {
  listForTeam(teamId: string): Promise<Label[]>;
  get(id: string): Promise<Label | null>;
  /** Names are unique per team, ignoring case: ConflictError("name"). */
  create(teamId: string, input: LabelInput): Promise<Label>;
  update(id: string, patch: UpdateLabelInput): Promise<Label>;
  /** Deletes the label and removes it from every task. */
  delete(id: string): Promise<void>;
}

export interface CommentsRepo {
  /** Oldest first. */
  listForTask(taskId: string): Promise<Comment[]>;
  get(id: string): Promise<Comment | null>;
  create(input: CreateCommentInput & { author: CommentAuthor }): Promise<Comment>;
  delete(id: string): Promise<void>;
}

export interface InvitesRepo {
  /** Creates invites (default role: member) valid for INVITE_TTL_DAYS, skipping members and pending invites. */
  create(input: Omit<CreateInvitesInput, "role"> & { role?: InviteRole; invitedBy: string }): Promise<Invite[]>;
  listPending(teamId: string): Promise<Invite[]>;
  get(id: string): Promise<Invite | null>;
  getByToken(token: string): Promise<Invite | null>;
  /** Issues a new token and expiry (the old link stops working). */
  resend(id: string): Promise<Invite>;
  revoke(id: string): Promise<void>;
  /**
   * Adds the user to the team with the invite's role. ConflictError("token")
   * if the invite was already used or has expired, ConflictError("email") if
   * it was sent to a different address.
   */
  accept(token: string, userId: string): Promise<Membership>;
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
  labels: LabelsRepo;
  comments: CommentsRepo;
}
```

Replace `src/server/data/mock/repositories.ts`:

```ts
import { randomBytes, randomUUID } from "node:crypto";
import { generateNKeysBetween } from "fractional-indexing";
import {
  DEFAULT_COLUMNS,
  DEFAULT_LABELS,
  INVITE_TTL_DAYS,
  byPosition,
  formatTaskKey,
  positionAt,
  type Column,
  type Comment,
  type Invite,
  type Membership,
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

/** Sorted positions of a column's tasks, optionally leaving one task out (the one being moved). */
function taskPositions(db: MockDb, columnId: string, excludeId?: string): string[] {
  return db.tasks
    .filter((t) => t.columnId === columnId && t.id !== excludeId)
    .sort(byPosition)
    .map((t) => t.position);
}

function deleteTasks(db: MockDb, taskIds: Set<string>) {
  db.tasks = db.tasks.filter((t) => !taskIds.has(t.id));
  db.comments = db.comments.filter((c) => !taskIds.has(c.taskId));
  for (const task of db.tasks) {
    if (task.parentId && taskIds.has(task.parentId)) task.parentId = null;
  }
}

function inviteExpiry(from: Date) {
  return new Date(from.getTime() + INVITE_TTL_DAYS * DAY_MS).toISOString();
}

function assertUniqueLabelName(db: MockDb, teamId: string, name: string, exceptId?: string) {
  const taken = db.labels.some(
    (l) => l.teamId === teamId && l.id !== exceptId && l.name.toLowerCase() === name.toLowerCase(),
  );
  if (taken) throw new ConflictError("name", "A label with this name already exists");
}

function deleteBoards(db: MockDb, boardIds: Set<string>) {
  deleteTasks(db, new Set(db.tasks.filter((t) => boardIds.has(t.boardId)).map((t) => t.id)));
  db.columns = db.columns.filter((c) => !boardIds.has(c.boardId));
  db.boards = db.boards.filter((b) => !boardIds.has(b.id));
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
      update: (id, patch) =>
        store.write((db) => {
          const user = find(db.users, (u) => u.id === id, "User", id);
          Object.assign(user, patch);
          return user;
        }),
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
          for (const label of DEFAULT_LABELS) db.labels.push({ id: newId(), teamId: team.id, ...label });
          return team;
        }),
      get: (id) => store.read((db) => db.teams.find((t) => t.id === id) ?? null),
      getBySlug: (slug) => store.read((db) => db.teams.find((t) => t.slug === slug) ?? null),
      listForUser: (userId) =>
        store.read((db) => {
          const teamIds = new Set(db.memberships.filter((m) => m.userId === userId).map((m) => m.teamId));
          return db.teams.filter((t) => teamIds.has(t.id)).sort((a, b) => a.name.localeCompare(b.name));
        }),
      update: (id, patch) =>
        store.write((db) => {
          const team = find(db.teams, (t) => t.id === id, "Team", id);
          Object.assign(team, patch);
          return team;
        }),
      delete: (id) =>
        store.write((db) => {
          const workspaceIds = new Set(db.workspaces.filter((w) => w.teamId === id).map((w) => w.id));
          deleteBoards(db, new Set(db.boards.filter((b) => workspaceIds.has(b.workspaceId)).map((b) => b.id)));
          db.workspaces = db.workspaces.filter((w) => w.teamId !== id);
          db.labels = db.labels.filter((l) => l.teamId !== id);
          db.invites = db.invites.filter((i) => i.teamId !== id);
          db.memberships = db.memberships.filter((m) => m.teamId !== id);
          db.teams = db.teams.filter((t) => t.id !== id);
        }),
    },

    memberships: {
      list: (teamId) => store.read((db) => db.memberships.filter((m) => m.teamId === teamId)),
      get: (teamId, userId) =>
        store.read((db) => db.memberships.find((m) => m.teamId === teamId && m.userId === userId) ?? null),
      listMembers: (teamId) =>
        store.read((db) =>
          db.memberships
            .filter((m) => m.teamId === teamId)
            .flatMap((m) => {
              const user = db.users.find((u) => u.id === m.userId);
              return user ? [{ ...m, user }] : [];
            })
            .sort((a, b) => a.user.name.localeCompare(b.user.name)),
        ),
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
      transferOwnership: (teamId, fromUserId, toUserId) =>
        store.write((db) => {
          const member = (userId: string) =>
            find(db.memberships, (m) => m.teamId === teamId && m.userId === userId, "Membership", `${teamId}/${userId}`);
          const from = member(fromUserId);
          const to = member(toUserId);
          if (from.role !== "owner") throw new ConflictError("owner", "Only the owner can transfer ownership");
          from.role = "admin";
          to.role = "owner";
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
      update: (id, patch) =>
        store.write((db) => {
          const workspace = find(db.workspaces, (w) => w.id === id, "Workspace", id);
          Object.assign(workspace, patch);
          return workspace;
        }),
      delete: (id) =>
        store.write((db) => {
          deleteBoards(db, new Set(db.boards.filter((b) => b.workspaceId === id).map((b) => b.id)));
          db.workspaces = db.workspaces.filter((w) => w.id !== id);
        }),
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
      update: (id, patch) =>
        store.write((db) => {
          const board = find(db.boards, (b) => b.id === id, "Board", id);
          Object.assign(board, patch);
          return board;
        }),
      delete: (id) => store.write((db) => deleteBoards(db, new Set([id]))),
      listColumns: (boardId) =>
        store.read((db) => db.columns.filter((c) => c.boardId === boardId).sort(byPosition)),
      getColumn: (id) => store.read((db) => db.columns.find((c) => c.id === id) ?? null),
      createColumn: (boardId, name) =>
        store.write((db) => {
          find(db.boards, (b) => b.id === boardId, "Board", boardId);
          const positions = db.columns.filter((c) => c.boardId === boardId).sort(byPosition).map((c) => c.position);
          const column = { id: newId(), boardId, name, position: positionAt(positions, positions.length) };
          db.columns.push(column);
          return column;
        }),
      renameColumn: (id, name) =>
        store.write((db) => {
          const column = find(db.columns, (c) => c.id === id, "Column", id);
          column.name = name;
          return column;
        }),
      moveColumn: (id, index) =>
        store.write((db) => {
          const column = find(db.columns, (c) => c.id === id, "Column", id);
          const others = db.columns
            .filter((c) => c.boardId === column.boardId && c.id !== id)
            .sort(byPosition)
            .map((c) => c.position);
          column.position = positionAt(others, index);
          return column;
        }),
      deleteColumn: (id) =>
        store.write((db) => {
          const column = find(db.columns, (c) => c.id === id, "Column", id);
          if (db.tasks.some((t) => t.columnId === id)) {
            throw new ConflictError("column", "Move or delete this column's tasks first");
          }
          if (db.columns.filter((c) => c.boardId === column.boardId).length === 1) {
            throw new ConflictError("column", "A board needs at least one column");
          }
          db.columns = db.columns.filter((c) => c.id !== id);
        }),
    },

    tasks: {
      create: ({ placement = "end", ...input }) =>
        store.write((db) => {
          const board = find(db.boards, (b) => b.id === input.boardId, "Board", input.boardId);
          const workspace = find(db.workspaces, (w) => w.id === board.workspaceId, "Workspace", board.workspaceId);
          findColumn(db, board.id, input.columnId);
          const positions = taskPositions(db, input.columnId);
          const number = workspace.nextTaskNumber++;
          const timestamp = now();
          const task: Task = {
            ...input,
            id: newId(),
            number,
            key: formatTaskKey(workspace.keyPrefix, number),
            position: positionAt(positions, placement === "start" ? 0 : positions.length),
            createdAt: timestamp,
            updatedAt: timestamp,
          };
          db.tasks.push(task);
          return task;
        }),
      get: (id) => store.read((db) => db.tasks.find((t) => t.id === id) ?? null),
      getByKey: (workspaceId, key) =>
        store.read((db) => {
          const boardIds = new Set(db.boards.filter((b) => b.workspaceId === workspaceId).map((b) => b.id));
          const wanted = key.trim().toUpperCase();
          return db.tasks.find((t) => boardIds.has(t.boardId) && t.key === wanted) ?? null;
        }),
      listForBoard: (boardId) =>
        store.read((db) => db.tasks.filter((t) => t.boardId === boardId).sort(byPosition)),
      listAssignedTo: (teamId, userId) =>
        store.read((db) => {
          const workspaceIds = new Set(db.workspaces.filter((w) => w.teamId === teamId).map((w) => w.id));
          const boardIds = new Set(db.boards.filter((b) => workspaceIds.has(b.workspaceId)).map((b) => b.id));
          return db.tasks
            .filter((t) => boardIds.has(t.boardId) && t.assignee?.kind === "user" && t.assignee.userId === userId)
            .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
        }),
      update: (id, patch) =>
        store.write((db) => {
          const task = find(db.tasks, (t) => t.id === id, "Task", id);
          Object.assign(task, patch, { updatedAt: now() });
          return task;
        }),
      move: (id, { columnId, index }) =>
        store.write((db) => {
          const task = find(db.tasks, (t) => t.id === id, "Task", id);
          findColumn(db, task.boardId, columnId);
          const position = positionAt(taskPositions(db, columnId, id), index);
          Object.assign(task, { columnId, position, updatedAt: now() });
          return task;
        }),
      delete: (id) => store.write((db) => deleteTasks(db, new Set([id]))),
    },

    labels: {
      listForTeam: (teamId) => store.read((db) => db.labels.filter((l) => l.teamId === teamId)),
      get: (id) => store.read((db) => db.labels.find((l) => l.id === id) ?? null),
      create: (teamId, { name, color }) =>
        store.write((db) => {
          find(db.teams, (t) => t.id === teamId, "Team", teamId);
          assertUniqueLabelName(db, teamId, name);
          const label = { id: newId(), teamId, name, color };
          db.labels.push(label);
          return label;
        }),
      update: (id, patch) =>
        store.write((db) => {
          const label = find(db.labels, (l) => l.id === id, "Label", id);
          if (patch.name) assertUniqueLabelName(db, label.teamId, patch.name, id);
          Object.assign(label, patch);
          return label;
        }),
      delete: (id) =>
        store.write((db) => {
          db.labels = db.labels.filter((l) => l.id !== id);
          for (const task of db.tasks) {
            if (task.labelIds.includes(id)) task.labelIds = task.labelIds.filter((labelId) => labelId !== id);
          }
        }),
    },

    comments: {
      listForTask: (taskId) =>
        store.read((db) => db.comments.filter((c) => c.taskId === taskId).sort(byCreatedAt)),
      get: (id) => store.read((db) => db.comments.find((c) => c.id === id) ?? null),
      create: ({ taskId, body, author }) =>
        store.write((db) => {
          find(db.tasks, (t) => t.id === taskId, "Task", taskId);
          const comment: Comment = { id: newId(), taskId, body, author, createdAt: now() };
          db.comments.push(comment);
          return comment;
        }),
      delete: (id) =>
        store.write((db) => {
          db.comments = db.comments.filter((c) => c.id !== id);
        }),
    },

    invites: {
      create: ({ teamId, emails, invitedBy, role = "member" }) =>
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
          const created: Invite[] = [];
          for (const email of new Set(emails.map((e) => e.toLowerCase()))) {
            if (taken.has(email)) continue;
            created.push({
              id: newId(),
              teamId,
              email,
              role,
              token: randomBytes(24).toString("base64url"),
              invitedBy,
              expiresAt: inviteExpiry(createdAt),
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
      get: (id) => store.read((db) => db.invites.find((i) => i.id === id) ?? null),
      getByToken: (token) => store.read((db) => db.invites.find((i) => i.token === token) ?? null),
      resend: (id) =>
        store.write((db) => {
          const invite = find(db.invites, (i) => i.id === id, "Invite", id);
          if (invite.acceptedAt) throw new ConflictError("token", "This invite was already accepted");
          invite.token = randomBytes(24).toString("base64url");
          invite.expiresAt = inviteExpiry(new Date());
          return invite;
        }),
      revoke: (id) =>
        store.write((db) => {
          db.invites = db.invites.filter((i) => i.id !== id);
        }),
      accept: (token, userId) =>
        store.write((db) => {
          const invite = find(db.invites, (i) => i.token === token, "Invite", "token");
          const user = find(db.users, (u) => u.id === userId, "User", userId);
          if (invite.acceptedAt) throw new ConflictError("token", "This invite has already been used");
          if (invite.expiresAt <= now()) throw new ConflictError("token", "This invite has expired");
          if (invite.email !== user.email) {
            throw new ConflictError("email", `This invite was sent to ${invite.email}`);
          }
          invite.acceptedAt = now();
          const existing = db.memberships.find((m) => m.teamId === invite.teamId && m.userId === userId);
          if (existing) return existing;
          const membership: Membership = { teamId: invite.teamId, userId, role: invite.role, joinedAt: now() };
          db.memberships.push(membership);
          return membership;
        }),
    },
  };
}
```

- [ ] **Step 4: Verify**

Run: `pnpm test && pnpm lint && pnpm typecheck`
Expected: 169 tests pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(data): add profile, team admin, invite lifecycle and label repositories"
```

---

### Task 3: Permissions — who can manage whom

**Files:**
- Modify: `src/server/auth/permissions.ts`, `src/server/auth/permissions.test.ts`

**Interfaces:**
- Produces: actions `team:update`, `label:manage` (owners/admins), `team:delete`, `ownership:transfer` (owner); `canManageMember(actor, target)`, `assignableRoles(actor)`, `canLeaveTeam(role)`.

- [ ] **Step 1: Write the failing tests**

Replace `src/server/auth/permissions.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { ForbiddenError, assertCan, assignableRoles, can, canLeaveTeam, canManageMember } from "./permissions";

describe("can", () => {
  it.each(["team:read", "task:create", "task:update", "task:delete", "comment:create"] as const)(
    "lets every role %s",
    (action) => {
      for (const role of ["owner", "admin", "member"] as const) expect(can(role, action)).toBe(true);
    },
  );

  it.each([
    "workspace:create",
    "workspace:update",
    "workspace:delete",
    "board:create",
    "board:update",
    "board:delete",
    "column:manage",
    "comment:moderate",
    "member:invite",
    "team:update",
    "label:manage",
  ] as const)("limits %s to owners and admins", (action) => {
    expect(can("owner", action)).toBe(true);
    expect(can("admin", action)).toBe(true);
    expect(can("member", action)).toBe(false);
  });

  it.each(["team:delete", "ownership:transfer"] as const)("limits %s to the owner", (action) => {
    expect(can("owner", action)).toBe(true);
    expect(can("admin", action)).toBe(false);
    expect(can("member", action)).toBe(false);
  });
});

describe("assertCan", () => {
  it("throws ForbiddenError when the role lacks the permission", () => {
    expect(() => assertCan("member", "member:invite")).toThrow(ForbiddenError);
    expect(() => assertCan("admin", "member:invite")).not.toThrow();
  });
});

describe("member management", () => {
  it("lets the owner manage admins and members, admins manage members, and nobody manage the owner", () => {
    expect(canManageMember("owner", "admin")).toBe(true);
    expect(canManageMember("owner", "member")).toBe(true);
    expect(canManageMember("admin", "member")).toBe(true);
    expect(canManageMember("admin", "admin")).toBe(false);
    expect(canManageMember("member", "member")).toBe(false);
    for (const actor of ["owner", "admin", "member"] as const) expect(canManageMember(actor, "owner")).toBe(false);
  });

  it("offers admin and member as assignable roles to managers only", () => {
    expect(assignableRoles("owner")).toEqual(["admin", "member"]);
    expect(assignableRoles("admin")).toEqual(["admin", "member"]);
    expect(assignableRoles("member")).toEqual([]);
  });

  it("requires the owner to hand over ownership before leaving", () => {
    expect(canLeaveTeam("owner")).toBe(false);
    expect(canLeaveTeam("admin")).toBe(true);
    expect(canLeaveTeam("member")).toBe(true);
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm test src/server/auth`
Expected: FAIL — 7 tests.

- [ ] **Step 3: Implement**

Replace `src/server/auth/permissions.ts`:

```ts
import type { InviteRole, Role } from "@/lib/domain";

// Single source of truth for role checks. M3 adds member-management actions.
const EVERYONE = ["owner", "admin", "member"] as const;
const MANAGERS = ["owner", "admin"] as const;
const OWNER = ["owner"] as const;

const RULES = {
  "team:read": EVERYONE,
  "task:create": EVERYONE,
  "task:update": EVERYONE,
  "task:delete": EVERYONE,
  "comment:create": EVERYONE,
  "comment:moderate": MANAGERS, // delete other people's comments
  "workspace:create": MANAGERS,
  "workspace:update": MANAGERS,
  "workspace:delete": MANAGERS,
  "board:create": MANAGERS,
  "board:update": MANAGERS,
  "board:delete": MANAGERS,
  "column:manage": MANAGERS,
  "member:invite": MANAGERS,
  "team:update": MANAGERS,
  "label:manage": MANAGERS,
  "team:delete": OWNER,
  "ownership:transfer": OWNER,
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

/**
 * Whether `actor` may change `target`'s role or remove them. The owner manages
 * admins and members; admins manage members; nobody manages the owner
 * (ownership moves only through an explicit transfer).
 */
export function canManageMember(actor: Role, target: Role): boolean {
  if (target === "owner") return false;
  if (actor === "owner") return true;
  return actor === "admin" && target === "member";
}

/** Roles `actor` can give to someone they manage (never "owner"). */
export function assignableRoles(actor: Role): InviteRole[] {
  return actor === "member" ? [] : ["admin", "member"];
}

/** The owner has to transfer ownership before leaving, so a team always has one. */
export function canLeaveTeam(role: Role): boolean {
  return role !== "owner";
}
```

- [ ] **Step 4: Verify**

Run: `pnpm test && pnpm lint && pnpm typecheck`
Expected: 176 tests pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(auth): add member-management and team permissions"
```

---

### Task 4: Server actions — members, invites, team, labels, profile

**Files:**
- Create: `src/server/actions/members.ts`, `invites.ts`, `team.ts`, `labels.ts`, `profile.ts`
- Modify: `src/lib/paths.ts`, `src/server/auth/guards.ts`, `src/server/actions/shared.ts`, `src/server/actions/onboarding.ts`, `src/server/actions/auth.ts`

**Interfaces:**
- Produces: `settingsPath(teamSlug, section?)`, `invitePath(token)`; guards `requireLabelAccess`, `requireInviteAccess`; helpers `absoluteUrl(path)`, `deliverInvites(invites)`; actions — form: `inviteMembersAction`, `updateTeamAction`, `createLabelAction`, `updateProfileAction`; imperative: `resendInviteAction(id)`, `revokeInviteAction(id)`, `changeRoleAction(teamSlug, userId, role)`, `removeMemberAction(teamSlug, userId)`, `transferOwnershipAction(teamSlug, userId)`, `leaveTeamAction(teamSlug)` (→ `/`), `acceptInviteAction(token)` (→ team), `deleteTeamAction(teamSlug)` (→ `/`), `updateLabelAction(id, patch)`, `deleteLabelAction(id)`, `setThemePreferenceAction(theme)`. `signUpAction` now follows a safe `next` (invitees) and otherwise goes to onboarding.

- [ ] **Step 1: Paths, guards, helpers**

Replace `src/lib/paths.ts`:

```ts
// Every in-app URL is built here so routes can move without hunting strings.
export const ONBOARDING_PATH = "/onboarding";

export const teamPath = (teamSlug: string) => `/${teamSlug}`;
export const boardPath = (teamSlug: string, boardId: string) => `/${teamSlug}/board/${boardId}`;
export const onboardingWorkspacePath = (teamSlug: string) => `${ONBOARDING_PATH}/${teamSlug}/workspace`;
export const onboardingInvitePath = (teamSlug: string, boardId: string) =>
  `${ONBOARDING_PATH}/${teamSlug}/invite?board=${encodeURIComponent(boardId)}`;

export type SettingsSection = "general" | "members" | "labels" | "profile";
export const settingsPath = (teamSlug: string, section: SettingsSection = "general") =>
  section === "general" ? `/${teamSlug}/settings` : `/${teamSlug}/settings/${section}`;
export const invitePath = (token: string) => `/invite/${token}`;
```

Replace `src/server/auth/guards.ts`:

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

// The helpers below resolve an entity id up to its team and check membership,
// so server actions can trust ids coming from the client. Unknown ids and
// other teams' ids both 404.

export const requireWorkspaceAccess = cache(async (workspaceId: string) => {
  const user = await requireUser();
  const repos = getRepositories();
  const workspace = await repos.workspaces.get(workspaceId);
  const team = workspace ? await repos.teams.get(workspace.teamId) : null;
  const membership = team ? await repos.memberships.get(team.id, user.id) : null;
  if (!workspace || !team || !membership) notFound();
  return { user, team, membership, workspace };
});

export const requireBoardAccess = cache(async (boardId: string) => {
  const board = await getRepositories().boards.get(boardId);
  if (!board) notFound();
  return { ...(await requireWorkspaceAccess(board.workspaceId)), board };
});

export const requireColumnAccess = cache(async (columnId: string) => {
  const column = await getRepositories().boards.getColumn(columnId);
  if (!column) notFound();
  return { ...(await requireBoardAccess(column.boardId)), column };
});

export const requireTaskAccess = cache(async (taskId: string) => {
  const task = await getRepositories().tasks.get(taskId);
  if (!task) notFound();
  return { ...(await requireBoardAccess(task.boardId)), task };
});

export const requireLabelAccess = cache(async (labelId: string) => {
  const label = await getRepositories().labels.get(labelId);
  if (!label) notFound();
  const user = await requireUser();
  const membership = await getRepositories().memberships.get(label.teamId, user.id);
  if (!membership) notFound();
  return { user, membership, label };
});

export const requireInviteAccess = cache(async (inviteId: string) => {
  const invite = await getRepositories().invites.get(inviteId);
  if (!invite) notFound();
  const user = await requireUser();
  const membership = await getRepositories().memberships.get(invite.teamId, user.id);
  if (!membership) notFound();
  return { user, membership, invite };
});
```

Replace `src/server/actions/shared.ts`:

```ts
import "server-only";
import { headers } from "next/headers";
import { z } from "zod";
import type { CreateWorkspaceInput, Invite, UpdateTaskInput } from "@/lib/domain";
import { invalidTaskRef } from "@/lib/domain";
import type { ActionResult, FormState } from "@/lib/forms";
import { invitePath } from "@/lib/paths";
import { ForbiddenError } from "@/server/auth/permissions";
import { ConflictError, NotFoundError, getRepositories } from "@/server/data";

// Helpers for the "use server" modules in this folder (not an action module itself).

export function conflictToFormState(error: unknown, values: Record<string, string>): FormState {
  if (error instanceof ConflictError) return { fieldErrors: { [error.field]: [error.message] }, values };
  throw error;
}

export function zodToFormState(error: z.ZodError, values: Record<string, string>): FormState {
  return { fieldErrors: z.flattenError(error).fieldErrors, values };
}

/** Maps expected failures to a message for a toast; rethrows anything else. */
export function toActionError(error: unknown): ActionResult {
  if (error instanceof ConflictError || error instanceof ForbiddenError) return { ok: false, error: error.message };
  if (error instanceof NotFoundError) return { ok: false, error: "This item no longer exists." };
  if (error instanceof z.ZodError) return { ok: false, error: error.issues[0]?.message ?? "Invalid input" };
  throw error;
}

/** Creates a workspace plus its default board (PRD §5.1). */
export async function createWorkspaceWithBoard(input: CreateWorkspaceInput) {
  const repos = getRepositories();
  const workspace = await repos.workspaces.create(input);
  const board = await repos.boards.create({ workspaceId: workspace.id, name: workspace.name, description: null });
  return { workspace, board };
}

/** Rejects assignees who aren't team members and labels from other teams. */
export async function assertTaskRefs(teamId: string, patch: Pick<UpdateTaskInput, "assignee" | "labelIds">) {
  const repos = getRepositories();
  const [members, labels] = await Promise.all([repos.memberships.list(teamId), repos.labels.listForTeam(teamId)]);
  const field = invalidTaskRef(patch, {
    memberIds: new Set(members.map((m) => m.userId)),
    labelIds: new Set(labels.map((l) => l.id)),
  });
  if (field) throw new ConflictError(field, field === "assignee" ? "Pick a member of this team" : "Unknown label");
}

/** Absolute URL for a path on the current host (for links that leave the app, like invite emails). */
export async function absoluteUrl(path: string): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const protocol = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${protocol}://${host}${path}`;
}

/** Sends invite emails. Until Resend arrives in M5 the link is only logged; the members page can copy it. */
export async function deliverInvites(invites: Invite[]) {
  for (const invite of invites) {
    console.info(`[invite] ${invite.email} (${invite.role}) → ${await absoluteUrl(invitePath(invite.token))}`);
  }
}
```

Replace `src/server/actions/onboarding.ts`:

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
import { getRepositories } from "@/server/data";
import { conflictToFormState, createWorkspaceWithBoard, deliverInvites } from "./shared";

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

  let boardId: string;
  try {
    boardId = (await createWorkspaceWithBoard(parsed.data)).board.id;
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
  await deliverInvites(invites);
  redirect(values.boardId ? boardPath(team.slug, values.boardId) : teamPath(team.slug));
}
```

Replace `src/server/actions/auth.ts`:

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
  const values = formValues(formData, ["name", "email", "password", "next"]);
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
  // Invitees arrive with ?next=/invite/<token>; everyone else starts onboarding.
  const next = safeNextPath(values.next);
  redirect(next === "/" ? ONBOARDING_PATH : next);
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

- [ ] **Step 2: Action modules**

Create `src/server/actions/members.ts`:

```ts
"use server";

import { refresh, revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createInvitesInputSchema, inviteRoleSchema, parseEmailList } from "@/lib/domain";
import { formValues, type ActionResult, type FormState } from "@/lib/forms";
import { requireInviteAccess, requireTeamMember } from "@/server/auth/guards";
import { assertCan, assignableRoles, canLeaveTeam, canManageMember } from "@/server/auth/permissions";
import { getRepositories } from "@/server/data";
import { deliverInvites, toActionError, zodToFormState } from "./shared";

export async function inviteMembersAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData, ["teamSlug", "emails", "role"]);
  const { user, team, membership } = await requireTeamMember(values.teamSlug);
  assertCan(membership.role, "member:invite");
  const parsed = createInvitesInputSchema.safeParse({
    teamId: team.id,
    emails: parseEmailList(values.emails),
    role: values.role || undefined,
  });
  if (!parsed.success) return zodToFormState(parsed.error, values);

  const invites = await getRepositories().invites.create({ ...parsed.data, invitedBy: user.id });
  await deliverInvites(invites);
  refresh();
  const skipped = parsed.data.emails.length - invites.length;
  return {
    ok: true,
    formError: skipped > 0 ? `${skipped} already a member or already invited.` : undefined,
  };
}

async function requireInviteManager(inviteId: string) {
  const access = await requireInviteAccess(inviteId);
  assertCan(access.membership.role, "member:invite");
  return access;
}

export async function resendInviteAction(inviteId: string): Promise<ActionResult> {
  try {
    await requireInviteManager(inviteId);
    await deliverInvites([await getRepositories().invites.resend(inviteId)]);
  } catch (error) {
    return toActionError(error);
  }
  refresh();
  return { ok: true };
}

export async function revokeInviteAction(inviteId: string): Promise<ActionResult> {
  try {
    await requireInviteManager(inviteId);
    await getRepositories().invites.revoke(inviteId);
  } catch (error) {
    return toActionError(error);
  }
  refresh();
  return { ok: true };
}

const NOT_ALLOWED = "You don't have permission to change this member.";

/** Loads the caller and the target member and checks the caller may manage them. */
async function requireManageableMember(teamSlug: string, userId: string) {
  const { team, membership } = await requireTeamMember(teamSlug);
  const target = await getRepositories().memberships.get(team.id, userId);
  if (!target) return { ok: false as const, error: "This person is no longer a member." };
  if (!canManageMember(membership.role, target.role)) return { ok: false as const, error: NOT_ALLOWED };
  return { ok: true as const, team, membership, target };
}

export async function changeRoleAction(teamSlug: string, userId: string, role: string): Promise<ActionResult> {
  try {
    const access = await requireManageableMember(teamSlug, userId);
    if (!access.ok) return access;
    const next = inviteRoleSchema.parse(role);
    if (!assignableRoles(access.membership.role).includes(next)) return { ok: false, error: NOT_ALLOWED };
    await getRepositories().memberships.setRole(access.team.id, userId, next);
  } catch (error) {
    return toActionError(error);
  }
  refresh();
  return { ok: true };
}

export async function removeMemberAction(teamSlug: string, userId: string): Promise<ActionResult> {
  try {
    const access = await requireManageableMember(teamSlug, userId);
    if (!access.ok) return access;
    await getRepositories().memberships.remove(access.team.id, userId);
  } catch (error) {
    return toActionError(error);
  }
  refresh();
  return { ok: true };
}

export async function transferOwnershipAction(teamSlug: string, userId: string): Promise<ActionResult> {
  try {
    const { user, team, membership } = await requireTeamMember(teamSlug);
    assertCan(membership.role, "ownership:transfer");
    await getRepositories().memberships.transferOwnership(team.id, user.id, userId);
  } catch (error) {
    return toActionError(error);
  }
  refresh();
  return { ok: true };
}

export async function leaveTeamAction(teamSlug: string): Promise<ActionResult> {
  const { user, team, membership } = await requireTeamMember(teamSlug);
  if (!canLeaveTeam(membership.role)) {
    return { ok: false, error: "Transfer ownership to someone else before leaving." };
  }
  await getRepositories().memberships.remove(team.id, user.id);
  revalidatePath("/", "layout");
  redirect("/");
}
```

Create `src/server/actions/invites.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FormState } from "@/lib/forms";
import { teamPath } from "@/lib/paths";
import { requireUser } from "@/server/auth/session";
import { ConflictError, NotFoundError, getRepositories } from "@/server/data";

export async function acceptInviteAction(token: string): Promise<FormState> {
  const user = await requireUser();
  const repos = getRepositories();
  let teamId: string;
  try {
    teamId = (await repos.invites.accept(token, user.id)).teamId;
  } catch (error) {
    if (error instanceof ConflictError) return { formError: error.message };
    if (error instanceof NotFoundError) return { formError: "This invite link is no longer valid." };
    throw error;
  }
  const team = await repos.teams.get(teamId);
  revalidatePath("/", "layout");
  redirect(team ? teamPath(team.slug) : "/");
}
```

Create `src/server/actions/team.ts`:

```ts
"use server";

import { refresh, revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { updateTeamInputSchema } from "@/lib/domain";
import { formValues, type FormState } from "@/lib/forms";
import { requireTeamMember } from "@/server/auth/guards";
import { assertCan } from "@/server/auth/permissions";
import { getRepositories } from "@/server/data";
import { zodToFormState } from "./shared";

export async function updateTeamAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData, ["teamSlug", "name"]);
  const { team, membership } = await requireTeamMember(values.teamSlug);
  assertCan(membership.role, "team:update");
  const parsed = updateTeamInputSchema.safeParse({ name: values.name });
  if (!parsed.success) return zodToFormState(parsed.error, values);

  await getRepositories().teams.update(team.id, parsed.data);
  refresh();
  return { ok: true };
}

export async function deleteTeamAction(teamSlug: string): Promise<void> {
  const { team, membership } = await requireTeamMember(teamSlug);
  assertCan(membership.role, "team:delete");
  await getRepositories().teams.delete(team.id);
  revalidatePath("/", "layout");
  redirect("/");
}
```

Create `src/server/actions/labels.ts`:

```ts
"use server";

import { refresh } from "next/cache";
import { labelInputSchema, updateLabelInputSchema, type UpdateLabelInput } from "@/lib/domain";
import { formValues, type ActionResult, type FormState } from "@/lib/forms";
import { requireLabelAccess, requireTeamMember } from "@/server/auth/guards";
import { assertCan } from "@/server/auth/permissions";
import { getRepositories } from "@/server/data";
import { conflictToFormState, toActionError, zodToFormState } from "./shared";

export async function createLabelAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData, ["teamSlug", "name", "color"]);
  const { team, membership } = await requireTeamMember(values.teamSlug);
  assertCan(membership.role, "label:manage");
  const parsed = labelInputSchema.safeParse({ name: values.name, color: values.color });
  if (!parsed.success) return zodToFormState(parsed.error, values);

  try {
    await getRepositories().labels.create(team.id, parsed.data);
  } catch (error) {
    return conflictToFormState(error, values);
  }
  refresh();
  return { ok: true };
}

export async function updateLabelAction(labelId: string, patch: UpdateLabelInput): Promise<ActionResult> {
  try {
    const { membership } = await requireLabelAccess(labelId);
    assertCan(membership.role, "label:manage");
    await getRepositories().labels.update(labelId, updateLabelInputSchema.parse(patch));
  } catch (error) {
    return toActionError(error);
  }
  refresh();
  return { ok: true };
}

export async function deleteLabelAction(labelId: string): Promise<ActionResult> {
  try {
    const { membership } = await requireLabelAccess(labelId);
    assertCan(membership.role, "label:manage");
    await getRepositories().labels.delete(labelId);
  } catch (error) {
    return toActionError(error);
  }
  refresh();
  return { ok: true };
}
```

Create `src/server/actions/profile.ts`:

```ts
"use server";

import { refresh } from "next/cache";
import { themeSchema, updateProfileInputSchema } from "@/lib/domain";
import { formValues, type ActionResult, type FormState } from "@/lib/forms";
import { requireUser } from "@/server/auth/session";
import { getRepositories } from "@/server/data";
import { toActionError, zodToFormState } from "./shared";

export async function updateProfileAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const values = formValues(formData, ["name", "avatarUrl", "theme"]);
  const parsed = updateProfileInputSchema.safeParse({
    name: values.name,
    avatarUrl: values.avatarUrl.trim() || null,
    theme: values.theme,
  });
  if (!parsed.success) return zodToFormState(parsed.error, values);

  await getRepositories().users.update(user.id, parsed.data);
  refresh();
  return { ok: true };
}

/** Persists the theme picked from the header toggle or the palette (PRD §6: per-user preference). */
export async function setThemePreferenceAction(theme: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await getRepositories().users.update(user.id, { theme: themeSchema.parse(theme) });
  } catch (error) {
    return toActionError(error);
  }
  return { ok: true };
}
```

- [ ] **Step 3: Verify**

Run: `pnpm test && pnpm lint && pnpm typecheck && pnpm build`
Expected: 176 tests pass; build clean.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(actions): add member, invite, team, label and profile server actions"
```

---

### Task 5: Settings UI — General, Members, Labels, Profile

**Files:**
- Create: `src/components/settings/settings-nav.tsx`, `settings-section.tsx`, `team-forms.tsx`, `members.tsx`, `labels.tsx`, `profile-form.tsx`; `src/app/[team]/settings/layout.tsx`, `page.tsx`, `members/page.tsx`, `labels/page.tsx`, `profile/page.tsx`
- Modify: `src/components/board/board-toolbar.tsx`, `src/components/tasks/member-avatar.tsx`, `src/components/shell/nav-items.ts`, `src/app/[team]/board/[boardId]/page.tsx`

**Interfaces:**
- Produces: a **Settings** nav item (sidebar and ⌘K); settings tabs (`navigation` "Settings" → links **General**, **Members**, **Labels**, **Profile**, `aria-current` on the active one). Accessible names used by e2e: **Team name** + **Save**, **Delete team** (alertdialog button **Delete team**); member rows are `listitem`s named after the person with combobox **Role for {name}** and button **Actions for {name}** (menu **Make owner**, **Remove from team**); **Email addresses**, combobox **Role**, **Send invites**; pending invites are `listitem`s **Invite for {email}** with **Copy link** (the URL is also in `data-invite-link`), **Resend**, **Revoke**; **Leave team**; label rows are `listitem`s named after the label (list **Labels**, `aria-busy` while saving) with the name as a button, combobox **Colour for {name}**, **Delete {name}**, inputs **Label name**, **New label**, **Colour**, button **Add label**; profile **Name**, **Avatar URL**, **Theme**, **Save profile**. `MemberAvatar` renders the avatar image with initials as fallback.

- [ ] **Step 1: Fix the M2 stale-filter race first** (gotcha 3 — otherwise the e2e runs below can flake)

Replace `src/components/board/board-toolbar.tsx`:

```tsx
"use client";

import { Plus, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { LabelDot } from "@/components/tasks/label-chip";
import type { MemberOption } from "@/components/tasks/member-avatar";
import { PRIORITY_META, PriorityIcon } from "@/components/tasks/priority";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { EMPTY_FILTERS, PRIORITIES, isFiltered, type BoardFilters, type Label } from "@/lib/domain";

function toggle<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

function FilterTrigger({ label, count }: { label: string; count: number }) {
  return (
    <DropdownMenuTrigger asChild>
      <Button variant="outline" size="sm">
        {label}
        {count > 0 && <Badge variant="secondary">{count}</Badge>}
      </Button>
    </DropdownMenuTrigger>
  );
}

export function BoardToolbar({
  filters,
  onChange,
  members,
  labels,
  onNewTask,
  saving,
}: {
  filters: BoardFilters;
  onChange: (filters: BoardFilters) => void;
  members: MemberOption[];
  labels: Label[];
  onNewTask: () => void;
  saving: boolean;
}) {
  // The URL lags behind quick successive changes (debounced search, fast clicks),
  // so every change starts from the latest filters we asked for, not the last render.
  const latest = useRef(filters);
  useEffect(() => {
    latest.current = filters;
  }, [filters]);
  const change = (update: (current: BoardFilters) => BoardFilters) => {
    latest.current = update(latest.current);
    onChange(latest.current);
  };
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [searchKey, setSearchKey] = useState(0);

  const keepOpen = (event: Event) => event.preventDefault();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
        <Input
          aria-label="Search tasks"
          placeholder="Search tasks"
          className="h-8 w-48 pl-8"
          key={searchKey}
          defaultValue={filters.query}
          onChange={(event) => {
            const query = event.target.value.trim();
            clearTimeout(timer.current);
            timer.current = setTimeout(() => change((current) => ({ ...current, query })), 250);
          }}
        />
      </div>

      <DropdownMenu>
        <FilterTrigger label="Assignee" count={filters.assignee === "any" ? 0 : 1} />
        <DropdownMenuContent align="start">
          <DropdownMenuRadioGroup
            value={filters.assignee}
            onValueChange={(assignee) => change((current) => ({ ...current, assignee }))}
          >
            <DropdownMenuRadioItem value="any">Anyone</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="me">Me</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="none">Unassigned</DropdownMenuRadioItem>
            {members.map((member) => (
              <DropdownMenuRadioItem key={member.id} value={member.id}>
                {member.name}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <FilterTrigger label="Priority" count={filters.priorities.length} />
        <DropdownMenuContent align="start">
          {PRIORITIES.map((priority) => (
            <DropdownMenuCheckboxItem
              key={priority}
              checked={filters.priorities.includes(priority)}
              onSelect={keepOpen}
              onCheckedChange={() =>
                change((current) => ({ ...current, priorities: toggle(current.priorities, priority) }))
              }
            >
              <PriorityIcon priority={priority} />
              {PRIORITY_META[priority].label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <FilterTrigger label="Labels" count={filters.labelIds.length} />
        <DropdownMenuContent align="start">
          {labels.map((label) => (
            <DropdownMenuCheckboxItem
              key={label.id}
              checked={filters.labelIds.includes(label.id)}
              onSelect={keepOpen}
              onCheckedChange={() =>
                change((current) => ({ ...current, labelIds: toggle(current.labelIds, label.id) }))
              }
            >
              <LabelDot color={label.color} />
              {label.name}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {isFiltered(filters) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            clearTimeout(timer.current);
            setSearchKey((key) => key + 1);
            change(() => EMPTY_FILTERS);
          }}
        >
          <X />
          Clear filters
        </Button>
      )}

      <span role="status" className="text-muted-foreground ml-auto text-xs">
        {saving ? "Saving…" : ""}
      </span>
      <Button size="sm" onClick={onNewTask}>
        <Plus />
        New task
        <kbd className="bg-primary-foreground/20 rounded px-1 font-mono text-[10px]">C</kbd>
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Avatar, nav and board members**

Replace `src/components/tasks/member-avatar.tsx`:

```tsx
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

/** Minimal member shape passed from server pages to client components. */
export type MemberOption = { id: string; name: string; email: string; avatarUrl?: string | null };

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function MemberAvatar({
  member,
  className,
}: {
  member: Pick<MemberOption, "name" | "avatarUrl">;
  className?: string;
}) {
  return (
    <Avatar title={member.name} className={cn("size-6", className)}>
      {member.avatarUrl && <AvatarImage src={member.avatarUrl} alt="" />}
      <AvatarFallback className="text-[10px] font-medium">{initials(member.name)}</AvatarFallback>
    </Avatar>
  );
}
```

Replace `src/components/shell/nav-items.ts`:

```ts
import { Inbox, Settings, type LucideIcon } from "lucide-react";
import { settingsPath, teamPath } from "@/lib/paths";

export type NavItem = { title: string; href: string; icon: LucideIcon };

// Team-level destinations, shared by the sidebar and the palette.
export function navItems(teamSlug: string): NavItem[] {
  return [
    { title: "My tasks", href: teamPath(teamSlug), icon: Inbox },
    { title: "Settings", href: settingsPath(teamSlug), icon: Settings },
  ];
}
```

Replace `src/app/[team]/board/[boardId]/page.tsx` (members now carry `avatarUrl`):

```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BoardView } from "@/components/board/board-view";
import { requireTeamMember } from "@/server/auth/guards";
import { can } from "@/server/auth/permissions";
import { getRepositories } from "@/server/data";

export const metadata: Metadata = { title: "Board" };

export default async function BoardPage({ params, searchParams }: PageProps<"/[team]/board/[boardId]">) {
  const [{ team: teamSlug, boardId }, { task: taskKey }] = await Promise.all([params, searchParams]);
  const { user, team, membership } = await requireTeamMember(teamSlug);
  const repos = getRepositories();
  const board = await repos.boards.get(boardId);
  const workspace = board ? await repos.workspaces.get(board.workspaceId) : null;
  if (!board || !workspace || workspace.teamId !== team.id) notFound();

  const [columns, tasks, members, labels] = await Promise.all([
    repos.boards.listColumns(board.id),
    repos.tasks.listForBoard(board.id),
    repos.memberships.listMembers(team.id),
    repos.labels.listForTeam(team.id),
  ]);
  // ?task=ENG-12 opens the task sheet (PRD §5.3).
  const openTask =
    typeof taskKey === "string" ? (tasks.find((task) => task.key === taskKey.toUpperCase()) ?? null) : null;
  const comments = openTask ? await repos.comments.listForTask(openTask.id) : [];

  return (
    <BoardView
      board={board}
      workspaceName={workspace.name}
      columns={columns}
      tasks={tasks}
      members={members.map(({ user: member }) => ({
        id: member.id,
        name: member.name,
        email: member.email,
        avatarUrl: member.avatarUrl,
      }))}
      labels={labels}
      comments={comments}
      openTaskId={openTask?.id ?? null}
      currentUserId={user.id}
      canManage={can(membership.role, "column:manage")}
      canModerate={can(membership.role, "comment:moderate")}
    />
  );
}
```

- [ ] **Step 3: Settings components**

Create `src/components/settings/settings-nav.tsx`:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { settingsPath, type SettingsSection } from "@/lib/paths";
import { cn } from "@/lib/utils";

const SECTIONS: { section: SettingsSection; label: string }[] = [
  { section: "general", label: "General" },
  { section: "members", label: "Members" },
  { section: "labels", label: "Labels" },
  { section: "profile", label: "Profile" },
];

export function SettingsNav({ teamSlug }: { teamSlug: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Settings" className="flex gap-1 border-b">
      {SECTIONS.map(({ section, label }) => {
        const href = settingsPath(teamSlug, section);
        const active = pathname === href;
        return (
          <Link
            key={section}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm transition-colors",
              active
                ? "border-primary text-foreground font-medium"
                : "text-muted-foreground hover:text-foreground border-transparent",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
```

Create `src/components/settings/settings-section.tsx`:

```tsx
import type { ReactNode } from "react";

export function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4 rounded-lg border p-5">
      <div className="space-y-1">
        <h2 className="font-medium">{title}</h2>
        {description && <p className="text-muted-foreground text-sm">{description}</p>}
      </div>
      {children}
    </section>
  );
}
```

Create `src/components/settings/team-forms.tsx`:

```tsx
"use client";

import { startTransition } from "react";
import { toast } from "sonner";
import { TextField } from "@/components/forms/fields";
import { useFormAction } from "@/components/forms/use-form-action";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { deleteTeamAction, updateTeamAction } from "@/server/actions/team";

export function TeamNameForm({ teamSlug, name }: { teamSlug: string; name: string }) {
  const [state, action, pending] = useFormAction(updateTeamAction, () => toast.success("Team renamed"));
  return (
    <form action={action} className="flex max-w-md items-end gap-2">
      <input type="hidden" name="teamSlug" value={teamSlug} />
      <div className="flex-1">
        <TextField
          name="name"
          label="Team name"
          required
          defaultValue={state.values?.name ?? name}
          errors={state.fieldErrors?.name}
        />
      </div>
      <Button type="submit" disabled={pending}>
        Save
      </Button>
    </form>
  );
}

export function DeleteTeamButton({ teamSlug, name }: { teamSlug: string; name: string }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">Delete team</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {name}?</AlertDialogTitle>
          <AlertDialogDescription>
            Every workspace, board, task, comment, label and invite in this team is deleted, and all members lose
            access. This can&apos;t be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={() => startTransition(() => deleteTeamAction(teamSlug))}>
            Delete team
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

Create `src/components/settings/members.tsx`:

```tsx
"use client";

import { Copy, Ellipsis } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { FormError, SelectField } from "@/components/forms/fields";
import { useFormAction } from "@/components/forms/use-form-action";
import { MemberAvatar } from "@/components/tasks/member-avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MAX_INVITES_PER_BATCH, type InviteRole, type Role } from "@/lib/domain";
import type { ActionResult } from "@/lib/forms";
import {
  changeRoleAction,
  inviteMembersAction,
  leaveTeamAction,
  removeMemberAction,
  resendInviteAction,
  revokeInviteAction,
  transferOwnershipAction,
} from "@/server/actions/members";

const ROLE_LABEL: Record<Role, string> = { owner: "Owner", admin: "Admin", member: "Member" };

export type MemberRow = {
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: Role;
  /** Whether the viewer may change this member's role or remove them. */
  manageable: boolean;
};

function useResultAction() {
  const [pending, startTransition] = useTransition();
  function run(action: () => Promise<ActionResult>, success?: string) {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) toast.error(result.error);
      else if (success) toast.success(success);
    });
  }
  return { pending, run };
}

export function MemberList({
  teamSlug,
  members,
  currentUserId,
  assignableRoles,
  canTransfer,
}: {
  teamSlug: string;
  members: MemberRow[];
  currentUserId: string;
  assignableRoles: InviteRole[];
  canTransfer: boolean;
}) {
  const { pending, run } = useResultAction();
  const [confirm, setConfirm] = useState<{ kind: "remove" | "transfer"; member: MemberRow } | null>(null);

  return (
    <>
      <ul aria-busy={pending} className="divide-y rounded-md border">
        {members.map((member) => (
          <li key={member.userId} aria-label={member.name} className="flex items-center gap-3 px-4 py-3 text-sm">
            <MemberAvatar member={member} className="size-8" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">
                {member.name}
                {member.userId === currentUserId && (
                  <span className="text-muted-foreground font-normal"> (you)</span>
                )}
              </p>
              <p className="text-muted-foreground truncate text-xs">{member.email}</p>
            </div>
            {member.manageable ? (
              <Select
                value={member.role}
                onValueChange={(role) =>
                  run(() => changeRoleAction(teamSlug, member.userId, role), `${member.name} is now ${ROLE_LABEL[role as Role].toLowerCase()}`)
                }
              >
                <SelectTrigger size="sm" className="w-28" aria-label={`Role for ${member.name}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {assignableRoles.map((role) => (
                    <SelectItem key={role} value={role}>
                      {ROLE_LABEL[role]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Badge variant="secondary">{ROLE_LABEL[member.role]}</Badge>
            )}
            {(member.manageable || (canTransfer && member.role !== "owner")) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-8" aria-label={`Actions for ${member.name}`}>
                    <Ellipsis />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {canTransfer && member.role !== "owner" && (
                    <DropdownMenuItem onSelect={() => setConfirm({ kind: "transfer", member })}>
                      Make owner
                    </DropdownMenuItem>
                  )}
                  {member.manageable && (
                    <DropdownMenuItem variant="destructive" onSelect={() => setConfirm({ kind: "remove", member })}>
                      Remove from team
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </li>
        ))}
      </ul>

      <AlertDialog open={confirm !== null} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent>
          {confirm?.kind === "remove" && (
            <AlertDialogHeader>
              <AlertDialogTitle>Remove {confirm.member.name}?</AlertDialogTitle>
              <AlertDialogDescription>
                They lose access to this team immediately. Their tasks and comments stay.
              </AlertDialogDescription>
            </AlertDialogHeader>
          )}
          {confirm?.kind === "transfer" && (
            <AlertDialogHeader>
              <AlertDialogTitle>Make {confirm.member.name} the owner?</AlertDialogTitle>
              <AlertDialogDescription>
                A team has exactly one owner. You&apos;ll become an admin, and only the new owner can delete the team or
                transfer it again.
              </AlertDialogDescription>
            </AlertDialogHeader>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant={confirm?.kind === "remove" ? "destructive" : "default"}
              onClick={() => {
                if (!confirm) return;
                const { kind, member } = confirm;
                if (kind === "remove") run(() => removeMemberAction(teamSlug, member.userId), `Removed ${member.name}`);
                else run(() => transferOwnershipAction(teamSlug, member.userId), `${member.name} is now the owner`);
              }}
            >
              {confirm?.kind === "remove" ? "Remove" : "Make owner"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function InviteMembersForm({ teamSlug }: { teamSlug: string }) {
  const [state, action, pending] = useFormAction(inviteMembersAction, () => toast.success("Invites sent"));
  const errors = state.fieldErrors?.emails;
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="teamSlug" value={teamSlug} />
      <Field data-invalid={Boolean(errors)}>
        <FieldLabel htmlFor="emails">Email addresses</FieldLabel>
        <Textarea
          id="emails"
          name="emails"
          rows={3}
          placeholder="ann@example.com, bob@example.com"
          defaultValue={state.ok ? undefined : state.values?.emails}
          aria-invalid={Boolean(errors)}
        />
        <FieldDescription>
          Separate with commas or new lines. Up to {MAX_INVITES_PER_BATCH} at a time.
        </FieldDescription>
        <FieldError>{errors?.[0]}</FieldError>
      </Field>
      <div className="flex items-end gap-2">
        <div className="w-40">
          <SelectField
            name="role"
            label="Role"
            defaultValue={state.ok ? "member" : state.values?.role || "member"}
            options={[
              { value: "member", label: "Member" },
              { value: "admin", label: "Admin" },
            ]}
          />
        </div>
        <Button type="submit" disabled={pending}>
          Send invites
        </Button>
      </div>
      <FormError message={state.formError} />
    </form>
  );
}

export type InviteRow = { id: string; email: string; role: InviteRole; expiresAt: string; link: string };

export function PendingInvites({ invites }: { invites: InviteRow[] }) {
  const { pending, run } = useResultAction();
  if (invites.length === 0) return <p className="text-muted-foreground text-sm">No pending invites.</p>;

  return (
    <ul aria-busy={pending} className="divide-y rounded-md border">
      {invites.map((invite) => (
        <li key={invite.id} aria-label={`Invite for ${invite.email}`} className="flex items-center gap-3 px-4 py-3 text-sm">
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{invite.email}</p>
            <p className="text-muted-foreground text-xs">
              {ROLE_LABEL[invite.role]} · expires{" "}
              <time dateTime={invite.expiresAt} suppressHydrationWarning>
                {new Date(invite.expiresAt).toLocaleDateString()}
              </time>
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            data-invite-link={invite.link}
            onClick={async () => {
              await navigator.clipboard.writeText(invite.link);
              toast.success("Invite link copied");
            }}
          >
            <Copy />
            Copy link
          </Button>
          <Button variant="ghost" size="sm" onClick={() => run(() => resendInviteAction(invite.id), "Invite resent")}>
            Resend
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive"
            onClick={() => run(() => revokeInviteAction(invite.id), "Invite revoked")}
          >
            Revoke
          </Button>
        </li>
      ))}
    </ul>
  );
}

export function LeaveTeamButton({ teamSlug, teamName }: { teamSlug: string; teamName: string }) {
  const { pending, run } = useResultAction();
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" disabled={pending}>
          Leave team
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Leave {teamName}?</AlertDialogTitle>
          <AlertDialogDescription>You&apos;ll need a new invite to come back.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={() => run(() => leaveTeamAction(teamSlug))}>
            Leave team
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

Create `src/components/settings/labels.tsx`:

```tsx
"use client";

import { Trash2 } from "lucide-react";
import { useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import { SelectField, TextField } from "@/components/forms/fields";
import { useFormAction } from "@/components/forms/use-form-action";
import { InlineInput } from "@/components/board/inline-input";
import { LabelDot } from "@/components/tasks/label-chip";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LABEL_COLORS, type Label, type LabelColor, type UpdateLabelInput } from "@/lib/domain";
import type { ActionResult } from "@/lib/forms";
import { createLabelAction, deleteLabelAction, updateLabelAction } from "@/server/actions/labels";

type LabelAction = { type: "update"; id: string; patch: UpdateLabelInput } | { type: "delete"; id: string };

function labelReducer(labels: Label[], action: LabelAction): Label[] {
  return action.type === "delete"
    ? labels.filter((l) => l.id !== action.id)
    : labels.map((l) => (l.id === action.id ? { ...l, ...action.patch } : l));
}

const colorName = (color: LabelColor) => color[0].toUpperCase() + color.slice(1);

function ColorOption({ color }: { color: LabelColor }) {
  return (
    <>
      <LabelDot color={color} />
      {colorName(color)}
    </>
  );
}

export function LabelList({ labels: initial, canManage }: { labels: Label[]; canManage: boolean }) {
  const [labels, apply] = useOptimistic(initial, labelReducer);
  const [pending, startTransition] = useTransition();
  const [renaming, setRenaming] = useState<string | null>(null);

  function mutate(action: LabelAction, run: () => Promise<ActionResult>) {
    startTransition(async () => {
      apply(action);
      const result = await run();
      if (!result.ok) toast.error(result.error);
    });
  }

  if (labels.length === 0) return <p className="text-muted-foreground text-sm">No labels yet.</p>;

  return (
    <ul aria-label="Labels" aria-busy={pending} className="divide-y rounded-md border">
      {labels.map((label) => (
        <li key={label.id} aria-label={label.name} className="flex items-center gap-3 px-4 py-2.5 text-sm">
          <LabelDot color={label.color} />
          {renaming === label.id ? (
            <InlineInput
              aria-label="Label name"
              className="h-8 max-w-60"
              initialValue={label.name}
              submitOnBlur
              onSubmit={(name) => {
                setRenaming(null);
                if (name !== label.name) {
                  mutate({ type: "update", id: label.id, patch: { name } }, () => updateLabelAction(label.id, { name }));
                }
              }}
              onCancel={() => setRenaming(null)}
            />
          ) : (
            <button
              type="button"
              disabled={!canManage}
              className="font-medium enabled:hover:underline"
              onClick={() => setRenaming(label.id)}
            >
              {label.name}
            </button>
          )}
          {canManage && (
            <div className="ml-auto flex items-center gap-1">
              <Select
                value={label.color}
                onValueChange={(value) => {
                  const color = value as LabelColor;
                  mutate({ type: "update", id: label.id, patch: { color } }, () => updateLabelAction(label.id, { color }));
                }}
              >
                <SelectTrigger size="sm" className="w-32" aria-label={`Colour for ${label.name}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LABEL_COLORS.map((color) => (
                    <SelectItem key={color} value={color}>
                      <ColorOption color={color} />
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                aria-label={`Delete ${label.name}`}
                onClick={() => mutate({ type: "delete", id: label.id }, () => deleteLabelAction(label.id))}
              >
                <Trash2 />
              </Button>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

export function CreateLabelForm({ teamSlug }: { teamSlug: string }) {
  // Remount the fields after each successful create so they clear.
  const [formKey, setFormKey] = useState(0);
  const [state, action, pending] = useFormAction(createLabelAction, () => setFormKey((key) => key + 1));
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="teamSlug" value={teamSlug} />
      <div key={formKey} className="contents">
        <div className="w-56">
          <TextField
            name="name"
            label="New label"
            placeholder="e.g. Design"
            required
            defaultValue={state.ok ? undefined : state.values?.name}
            errors={state.fieldErrors?.name}
          />
        </div>
        <div className="w-36">
          <SelectField
            name="color"
            label="Colour"
            defaultValue={state.ok ? "blue" : state.values?.color || "blue"}
            options={LABEL_COLORS.map((color) => ({ value: color, label: colorName(color) }))}
          />
        </div>
      </div>
      <Button type="submit" disabled={pending}>
        Add label
      </Button>
    </form>
  );
}
```

Create `src/components/settings/profile-form.tsx`:

```tsx
"use client";

import { useTheme } from "next-themes";
import { toast } from "sonner";
import { SelectField, TextField } from "@/components/forms/fields";
import { useFormAction } from "@/components/forms/use-form-action";
import { MemberAvatar } from "@/components/tasks/member-avatar";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import type { Theme, User } from "@/lib/domain";
import { updateProfileAction } from "@/server/actions/profile";

export function ProfileForm({ user }: { user: Pick<User, "name" | "email" | "avatarUrl" | "theme"> }) {
  const { setTheme } = useTheme();
  const [state, action, pending] = useFormAction(
    async (prev, formData) => {
      const result = await updateProfileAction(prev, formData);
      if (result.ok) setTheme(String(formData.get("theme")) as Theme);
      return result;
    },
    () => toast.success("Profile saved"),
  );

  return (
    <form action={action} className="max-w-md space-y-6">
      <div className="flex items-center gap-3">
        <MemberAvatar member={user} className="size-12 text-base" />
        <div className="text-sm">
          <p className="font-medium">{user.name}</p>
          <p className="text-muted-foreground">{user.email}</p>
        </div>
      </div>
      <FieldGroup>
        <TextField
          name="name"
          label="Name"
          required
          defaultValue={state.values?.name ?? user.name}
          errors={state.fieldErrors?.name}
        />
        <TextField
          name="avatarUrl"
          label="Avatar URL"
          type="url"
          placeholder="https://…"
          description="Image uploads arrive with Supabase Storage; paste a link for now."
          defaultValue={state.values?.avatarUrl ?? user.avatarUrl ?? ""}
          errors={state.fieldErrors?.avatarUrl}
        />
        <SelectField
          name="theme"
          label="Theme"
          defaultValue={state.values?.theme || user.theme || "dark"}
          options={[
            { value: "dark", label: "Dark" },
            { value: "light", label: "Light" },
            { value: "system", label: "System" },
          ]}
        />
      </FieldGroup>
      <Button type="submit" disabled={pending}>
        Save profile
      </Button>
    </form>
  );
}
```

- [ ] **Step 4: Settings pages**

Create `src/app/[team]/settings/layout.tsx`:

```tsx
import { SettingsNav } from "@/components/settings/settings-nav";
import { requireTeamMember } from "@/server/auth/guards";

export default async function SettingsLayout({ children, params }: LayoutProps<"/[team]/settings">) {
  const { team } = await requireTeamMember((await params).team);
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-muted-foreground text-sm">{team.name}</p>
      </div>
      <SettingsNav teamSlug={team.slug} />
      <div className="space-y-6">{children}</div>
    </div>
  );
}
```

Create `src/app/[team]/settings/page.tsx`:

```tsx
import type { Metadata } from "next";
import { SettingsSection } from "@/components/settings/settings-section";
import { DeleteTeamButton, TeamNameForm } from "@/components/settings/team-forms";
import { requireTeamMember } from "@/server/auth/guards";
import { can } from "@/server/auth/permissions";

export const metadata: Metadata = { title: "Team settings" };

export default async function GeneralSettingsPage({ params }: PageProps<"/[team]/settings">) {
  const { team, membership } = await requireTeamMember((await params).team);

  return (
    <>
      <SettingsSection title="Team" description={`Your team lives at /${team.slug}.`}>
        {can(membership.role, "team:update") ? (
          <TeamNameForm teamSlug={team.slug} name={team.name} />
        ) : (
          <p className="text-sm">{team.name}</p>
        )}
      </SettingsSection>
      {can(membership.role, "team:delete") && (
        <SettingsSection title="Danger zone" description="Deleting the team removes everything in it for everyone.">
          <DeleteTeamButton teamSlug={team.slug} name={team.name} />
        </SettingsSection>
      )}
    </>
  );
}
```

Create `src/app/[team]/settings/members/page.tsx`:

```tsx
import type { Metadata } from "next";
import {
  InviteMembersForm,
  LeaveTeamButton,
  MemberList,
  PendingInvites,
} from "@/components/settings/members";
import { SettingsSection } from "@/components/settings/settings-section";
import { invitePath } from "@/lib/paths";
import { absoluteUrl } from "@/server/actions/shared";
import { requireTeamMember } from "@/server/auth/guards";
import { assignableRoles, can, canLeaveTeam, canManageMember } from "@/server/auth/permissions";
import { getRepositories } from "@/server/data";

export const metadata: Metadata = { title: "Members" };

export default async function MembersPage({ params }: PageProps<"/[team]/settings/members">) {
  const { user, team, membership } = await requireTeamMember((await params).team);
  const repos = getRepositories();
  const canInvite = can(membership.role, "member:invite");
  const [members, invites] = await Promise.all([
    repos.memberships.listMembers(team.id),
    canInvite ? repos.invites.listPending(team.id) : Promise.resolve([]),
  ]);
  const inviteRows = await Promise.all(
    invites.map(async (invite) => ({
      id: invite.id,
      email: invite.email,
      role: invite.role,
      expiresAt: invite.expiresAt,
      link: await absoluteUrl(invitePath(invite.token)),
    })),
  );

  return (
    <>
      <SettingsSection title="Members" description={`${members.length} ${members.length === 1 ? "person" : "people"} in ${team.name}.`}>
        <MemberList
          teamSlug={team.slug}
          currentUserId={user.id}
          assignableRoles={assignableRoles(membership.role)}
          canTransfer={can(membership.role, "ownership:transfer")}
          members={members.map((m) => ({
            userId: m.userId,
            name: m.user.name,
            email: m.user.email,
            avatarUrl: m.user.avatarUrl,
            role: m.role,
            manageable: m.userId !== user.id && canManageMember(membership.role, m.role),
          }))}
        />
      </SettingsSection>

      {canInvite && (
        <>
          <SettingsSection
            title="Invite people"
            description="They get a link that is valid for 7 days. Emails start sending in M5; until then, copy the link below."
          >
            <InviteMembersForm teamSlug={team.slug} />
          </SettingsSection>
          <SettingsSection title="Pending invites">
            <PendingInvites invites={inviteRows} />
          </SettingsSection>
        </>
      )}

      {canLeaveTeam(membership.role) && (
        <SettingsSection title="Leave team" description="You'll lose access to its workspaces and boards.">
          <LeaveTeamButton teamSlug={team.slug} teamName={team.name} />
        </SettingsSection>
      )}
    </>
  );
}
```

Create `src/app/[team]/settings/labels/page.tsx`:

```tsx
import type { Metadata } from "next";
import { CreateLabelForm, LabelList } from "@/components/settings/labels";
import { SettingsSection } from "@/components/settings/settings-section";
import { requireTeamMember } from "@/server/auth/guards";
import { can } from "@/server/auth/permissions";
import { getRepositories } from "@/server/data";

export const metadata: Metadata = { title: "Labels" };

export default async function LabelsPage({ params }: PageProps<"/[team]/settings/labels">) {
  const { team, membership } = await requireTeamMember((await params).team);
  const labels = await getRepositories().labels.listForTeam(team.id);
  const canManage = can(membership.role, "label:manage");

  return (
    <SettingsSection
      title="Labels"
      description={canManage ? "Click a name to rename it. Deleting a label removes it from every task." : "Owners and admins manage labels."}
    >
      <LabelList labels={labels} canManage={canManage} />
      {canManage && <CreateLabelForm teamSlug={team.slug} />}
    </SettingsSection>
  );
}
```

Create `src/app/[team]/settings/profile/page.tsx`:

```tsx
import type { Metadata } from "next";
import { ProfileForm } from "@/components/settings/profile-form";
import { SettingsSection } from "@/components/settings/settings-section";
import { requireUser } from "@/server/auth/session";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await requireUser();
  return (
    <SettingsSection title="Profile" description="How you appear to your teammates, in every team.">
      <ProfileForm user={user} />
    </SettingsSection>
  );
}
```

- [ ] **Step 5: Verify**

Run: `rm -rf .next && pnpm test && pnpm lint && pnpm typecheck && pnpm build && pnpm test:e2e`
Expected: 176 unit tests; build lists the four settings routes; the 20 M2 e2e tests pass.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(settings): add team, members, labels and profile settings; fix stale board filters"
```

---

### Task 6: Invite acceptance and `?next=` across auth

**Files:**
- Create: `src/app/invite/[token]/page.tsx`, `src/components/invites/accept-invite-button.tsx`
- Modify: `src/lib/auth/routes.ts`, `src/lib/auth/routes.test.ts`, `src/components/auth/sign-in-form.tsx`, `src/components/auth/sign-up-form.tsx`, `src/app/(auth)/sign-up/page.tsx`, `src/app/sign-out/route.ts`

**Interfaces:**
- Produces: `withNext(path, next)`; sign-in ↔ sign-up links and the sign-up form keep `next`; `/sign-out?next=` (used by "Wrong account"); the invite page's states — **Invite not found**, **You're in {team}**, **This invite has expired**, **Wrong account**, **Join {team}** (button **Join {team}**).

- [ ] **Step 1: Write the failing test**

Replace `src/lib/auth/routes.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { isOpenPath, isPublicPath, safeNextPath, signInRedirectPath, withNext } from "./routes";

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

describe("withNext", () => {
  it("carries a safe next path between the auth pages", () => {
    expect(withNext("/sign-up", "/invite/abc")).toBe("/sign-up?next=%2Finvite%2Fabc");
    expect(withNext("/sign-up", "/")).toBe("/sign-up");
    expect(withNext("/sign-in", "https://evil.test")).toBe("/sign-in");
  });
});
```

Run: `pnpm test src/lib/auth`
Expected: FAIL — `withNext` is not a function.

- [ ] **Step 2: Implement**

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

/** Links between sign-in and sign-up keep the pending destination (e.g. an invite link). */
export function withNext(path: string, next: string | null | undefined): string {
  const safe = safeNextPath(next);
  return safe === "/" ? path : `${path}?next=${encodeURIComponent(safe)}`;
}
```

Replace `src/components/auth/sign-in-form.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useActionState } from "react";
import { FormError, TextField } from "@/components/forms/fields";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { SIGN_UP_PATH, withNext } from "@/lib/auth/routes";
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
        <Link href={withNext(SIGN_UP_PATH, next)} className="text-foreground underline underline-offset-4">
          Sign up
        </Link>
      </p>
    </form>
  );
}
```

Replace `src/components/auth/sign-up-form.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useActionState } from "react";
import { TextField } from "@/components/forms/fields";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { SIGN_IN_PATH, withNext } from "@/lib/auth/routes";
import { initialFormState } from "@/lib/forms";
import { signUpAction } from "@/server/actions/auth";

export function SignUpForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(signUpAction, initialFormState);

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="next" value={next} />
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
        <Link href={withNext(SIGN_IN_PATH, next)} className="text-foreground underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </form>
  );
}
```

Replace `src/app/(auth)/sign-up/page.tsx`:

```tsx
import type { Metadata } from "next";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Sign up" };

export default async function SignUpPage({ searchParams }: PageProps<"/sign-up">) {
  const { next } = await searchParams;
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h1 className="text-xl">Create your account</h1>
        </CardTitle>
        <CardDescription>Set up your team in under three minutes.</CardDescription>
      </CardHeader>
      <CardContent>
        <SignUpForm next={typeof next === "string" ? next : "/"} />
      </CardContent>
    </Card>
  );
}
```

Replace `src/app/sign-out/route.ts`:

```ts
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, SIGN_IN_PATH, withNext } from "@/lib/auth/routes";

// Clears a stale session cookie (see requireUser) or switches accounts from an
// invite (?next=/invite/<token>). Signing out from the UI uses signOutAction.
export function GET(request: NextRequest) {
  const next = request.nextUrl.searchParams.get("next");
  const response = NextResponse.redirect(new URL(withNext(SIGN_IN_PATH, next), request.url));
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
```

Create `src/components/invites/accept-invite-button.tsx`:

```tsx
"use client";

import { useActionState } from "react";
import { FormError } from "@/components/forms/fields";
import { Button } from "@/components/ui/button";
import { initialFormState } from "@/lib/forms";
import { acceptInviteAction } from "@/server/actions/invites";

export function AcceptInviteButton({ token, teamName }: { token: string; teamName: string }) {
  const [state, action, pending] = useActionState(() => acceptInviteAction(token), initialFormState);
  return (
    <form action={action} className="space-y-3">
      <Button type="submit" className="w-full" disabled={pending}>
        Join {teamName}
      </Button>
      <FormError message={state.formError} />
    </form>
  );
}
```

Create `src/app/invite/[token]/page.tsx`:

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { AcceptInviteButton } from "@/components/invites/accept-invite-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SIGN_OUT_PATH, withNext } from "@/lib/auth/routes";
import { invitePath, teamPath } from "@/lib/paths";
import { requireUser } from "@/server/auth/session";
import { getRepositories } from "@/server/data";

export const metadata: Metadata = { title: "Join a team" };

function InviteCard({ title, description, children }: { title: string; description: ReactNode; children?: ReactNode }) {
  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>
            <h1 className="text-xl">{title}</h1>
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        {children && <CardContent>{children}</CardContent>}
      </Card>
    </main>
  );
}

// Signed-out visitors never get here: proxy.ts sends them to sign-in (or sign-up) with ?next= this page.
export default async function InvitePage({ params }: PageProps<"/invite/[token]">) {
  const { token } = await params;
  const user = await requireUser();
  const repos = getRepositories();
  const invite = await repos.invites.getByToken(token);
  const team = invite ? await repos.teams.get(invite.teamId) : null;

  if (!invite || !team) {
    return (
      <InviteCard title="Invite not found" description="This link is invalid or was revoked. Ask for a new invite.">
        <Button asChild variant="outline" className="w-full">
          <Link href="/">Go to TrackaAI</Link>
        </Button>
      </InviteCard>
    );
  }

  const membership = await repos.memberships.get(team.id, user.id);
  if (membership) {
    return (
      <InviteCard title={`You're in ${team.name}`} description="You're already a member of this team.">
        <Button asChild className="w-full">
          <Link href={teamPath(team.slug)}>Open {team.name}</Link>
        </Button>
      </InviteCard>
    );
  }

  if (invite.acceptedAt || invite.expiresAt <= new Date().toISOString()) {
    return (
      <InviteCard
        title="This invite has expired"
        description={`Ask someone in ${team.name} to send you a new invite.`}
      />
    );
  }

  if (invite.email !== user.email) {
    return (
      <InviteCard
        title="Wrong account"
        description={
          <>
            This invite was sent to <strong>{invite.email}</strong>, but you&apos;re signed in as{" "}
            <strong>{user.email}</strong>.
          </>
        }
      >
        <Button asChild variant="outline" className="w-full">
          {/* Plain link: /sign-out is a route handler that clears the session. */}
          <a href={withNext(SIGN_OUT_PATH, invitePath(token))}>Sign out and switch account</a>
        </Button>
      </InviteCard>
    );
  }

  const inviter = await repos.users.getById(invite.invitedBy);
  return (
    <InviteCard
      title={`Join ${team.name}`}
      description={`${inviter?.name ?? "A teammate"} invited you to join as ${invite.role === "admin" ? "an admin" : "a member"}.`}
    >
      <AcceptInviteButton token={token} teamName={team.name} />
    </InviteCard>
  );
}
```

- [ ] **Step 3: Verify**

Run: `pnpm test && pnpm lint && pnpm typecheck && pnpm build`
Expected: 177 tests pass; build lists `ƒ /invite/[token]`.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(invites): accept invites by link and keep next across sign-in and sign-up"
```

---

### Task 7: Theme preference per user + profile link

**Files:**
- Create: `src/components/theme/theme-preference-sync.tsx`
- Modify: `src/components/theme/theme-toggle.tsx`, `src/components/theme/theme-toggle.test.tsx`, `src/components/shell/command-menu.tsx`, `src/components/shell/command-menu.test.tsx`, `src/components/shell/app-sidebar.tsx`, `src/app/[team]/layout.tsx`, `e2e/shell.spec.ts`

**Interfaces:**
- Produces: the header toggle and ⌘K theme items call `setThemePreferenceAction`; `<ThemePreferenceSync preference>` applies the saved theme (gotcha 6); the sidebar footer is a link to Profile showing the avatar, name and email.

- [ ] **Step 1: Write the failing tests**

Replace `src/components/theme/theme-toggle.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeToggle } from "./theme-toggle";

const mocks = vi.hoisted(() => ({
  setTheme: vi.fn(),
  savePreference: vi.fn(async () => ({ ok: true })),
  resolvedTheme: "dark" as string | undefined,
}));

vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: mocks.resolvedTheme, setTheme: mocks.setTheme }),
}));
vi.mock("@/server/actions/profile", () => ({ setThemePreferenceAction: mocks.savePreference }));

describe("ThemeToggle", () => {
  beforeEach(() => {
    mocks.setTheme.mockReset();
    mocks.savePreference.mockClear();
  });

  it("switches dark to light and saves the preference", () => {
    mocks.resolvedTheme = "dark";
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole("button", { name: "Toggle theme" }));
    expect(mocks.setTheme).toHaveBeenCalledWith("light");
    expect(mocks.savePreference).toHaveBeenCalledWith("light");
  });

  it("switches light to dark", () => {
    mocks.resolvedTheme = "light";
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole("button", { name: "Toggle theme" }));
    expect(mocks.setTheme).toHaveBeenCalledWith("dark");
    expect(mocks.savePreference).toHaveBeenCalledWith("dark");
  });
});
```

Replace `src/components/shell/command-menu.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CommandMenu } from "./command-menu";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  setTheme: vi.fn(),
  savePreference: vi.fn(async () => ({ ok: true })),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("next-themes", () => ({ useTheme: () => ({ setTheme: mocks.setTheme }) }));
vi.mock("@/server/actions/profile", () => ({ setThemePreferenceAction: mocks.savePreference }));

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
    expect(mocks.savePreference).toHaveBeenCalledWith("light");
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

Run: `pnpm test src/components`
Expected: FAIL — 3 tests (the preference isn't saved).

- [ ] **Step 2: Implement**

Replace `src/components/theme/theme-toggle.tsx`:

```tsx
"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { setThemePreferenceAction } from "@/server/actions/profile";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle theme"
      onClick={() => {
        const next = resolvedTheme === "light" ? "dark" : "light";
        setTheme(next);
        // Saved per user (PRD §6); failures only mean the choice doesn't follow you to other devices.
        void setThemePreferenceAction(next);
      }}
    >
      <Sun className="hidden size-4 dark:block" />
      <Moon className="size-4 dark:hidden" />
    </Button>
  );
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
import { setThemePreferenceAction } from "@/server/actions/profile";
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

  function applyTheme(theme: "dark" | "light") {
    setTheme(theme);
    void setThemePreferenceAction(theme);
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
              <CommandItem onSelect={() => run(() => applyTheme("dark"))}>
                <Moon />
                Dark theme
              </CommandItem>
              <CommandItem onSelect={() => run(() => applyTheme("light"))}>
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

Create `src/components/theme/theme-preference-sync.tsx`:

```tsx
"use client";

import { useTheme } from "next-themes";
import { useEffect, useRef } from "react";
import type { Theme } from "@/lib/domain";

/**
 * Applies the signed-in user's saved theme (e.g. on a new device). Runs once
 * per saved value, so later toggles in this tab aren't overridden.
 */
export function ThemePreferenceSync({ preference }: { preference: Theme | undefined }) {
  const { setTheme } = useTheme();
  const applied = useRef<Theme | undefined>(undefined);

  useEffect(() => {
    if (!preference || applied.current === preference) return;
    applied.current = preference;
    setTheme(preference);
  }, [preference, setTheme]);

  return null;
}
```

Replace `src/app/[team]/layout.tsx`:

```tsx
import { AppHeader } from "@/components/shell/app-header";
import { AppSidebar } from "@/components/shell/app-sidebar";
import { ThemePreferenceSync } from "@/components/theme/theme-preference-sync";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { requireTeamMember } from "@/server/auth/guards";
import { can } from "@/server/auth/permissions";
import { getRepositories } from "@/server/data";

export default async function TeamLayout({ children, params }: LayoutProps<"/[team]">) {
  const { user, team, membership } = await requireTeamMember((await params).team);
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
      <ThemePreferenceSync preference={user.theme} />
      <AppSidebar
        user={user}
        team={team}
        teams={teams}
        workspaces={tree}
        canManage={can(membership.role, "workspace:create")}
      />
      {/* min-w-0 keeps wide content (the board) from pushing the header off-screen. */}
      <SidebarInset className="min-w-0">
        <AppHeader teamSlug={team.slug} boards={boards} />
        <div className="flex min-h-0 flex-1 flex-col p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
```

Replace `src/components/shell/app-sidebar.tsx`:

```tsx
import { Layers, LogOut } from "lucide-react";
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
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import type { Board, Team, User, Workspace } from "@/lib/domain";
import { boardPath, settingsPath } from "@/lib/paths";
import { MemberAvatar } from "@/components/tasks/member-avatar";
import { signOutAction } from "@/server/actions/auth";
import { BoardLink } from "./board-link";
import { navItems } from "./nav-items";
import { TeamSwitcher } from "./team-switcher";
import { NewWorkspaceButton, WorkspaceMenu } from "./workspace-actions";

export type SidebarWorkspace = Workspace & { boards: Board[] };

export function AppSidebar({
  user,
  team,
  teams,
  workspaces,
  canManage,
}: {
  user: User;
  team: Team;
  teams: Team[];
  workspaces: SidebarWorkspace[];
  /** Owners and admins can create, rename and delete workspaces and boards. */
  canManage: boolean;
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
          {canManage && <NewWorkspaceButton teamSlug={team.slug} />}
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
                    {canManage && <WorkspaceMenu workspace={workspace} />}
                    <SidebarMenuSub>
                      {workspace.boards.map((board) => (
                        <SidebarMenuSubItem key={board.id}>
                          <BoardLink href={boardPath(team.slug, board.id)} name={board.name} />
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
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg" tooltip="Profile">
              <Link href={settingsPath(team.slug, "profile")}>
                <MemberAvatar member={user} className="size-8" />
                <span className="min-w-0 text-sm">
                  <span className="block truncate font-medium">{user.name}</span>
                  <span className="text-muted-foreground block truncate text-xs">{user.email}</span>
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
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

- [ ] **Step 3: Move the theme e2e test to a fresh user** (gotcha 5)

Replace `e2e/shell.spec.ts`:

```ts
import { expect, test } from "@playwright/test";
import { DEMO, fillSignIn, openFreshBoard, signInAsDemo } from "./helpers";

test("signed-out visitors are sent to sign-in and back to where they were going", async ({ page }) => {
  await page.goto("/acme?x=1");
  await expect(page).toHaveURL(/\/sign-in\?next=%2Facme%3Fx%3D1$/);
  await fillSignIn(page, DEMO.email, DEMO.password);
  await expect(page).toHaveURL(/\/acme\?x=1$/);
});

test("theme is dark by default, toggles to light and follows the user to another browser", async ({
  page,
  browser,
  baseURL,
}) => {
  const id = await openFreshBoard(page);
  const html = page.locator("html");
  await expect(html).toHaveClass(/\bdark\b/);
  await Promise.all([
    // The toggle saves the preference in the background; wait for that request.
    page.waitForResponse((response) => response.request().method() === "POST"),
    page.getByRole("button", { name: "Toggle theme" }).click(),
  ]);
  await expect(html).not.toHaveClass(/\bdark\b/);
  await page.reload();
  await expect(html).not.toHaveClass(/\bdark\b/);

  // A new context has empty localStorage, like another device.
  const otherDevice = await browser.newContext({ baseURL });
  const second = await otherDevice.newPage();
  await second.goto("/sign-in");
  await fillSignIn(second, `user-${id}@example.test`, "password123");
  await expect(second.getByRole("heading", { name: "My tasks" })).toBeVisible();
  await expect(second.locator("html")).not.toHaveClass(/\bdark\b/);
  await otherDevice.close();
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

Note: `e2e/shell.spec.ts` imports `openFreshBoard` from the M2 helpers; it exists already.

- [ ] **Step 4: Verify**

Run: `rm -rf .next && pnpm test && pnpm lint && pnpm typecheck && pnpm build && pnpm test:e2e`
Expected: 177 unit tests; 20 e2e tests pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(theme): save the theme per user and apply it on every device"
```

---

### Task 8: Multi-user e2e, docs, review, PR

**Files:**
- Create: `e2e/team.spec.ts`
- Modify: `e2e/helpers.ts`, `README.md`, `docs/build-plan.md` (status table)

**Interfaces:**
- Produces: helpers `openSettings(page, tab)`, `inviteTeammate(owner, role?)` → `{ email, link }`, `joinWithInvite(browser, baseURL, invite)` → a second signed-in browser context (the teammate); 8 new e2e tests.

- [ ] **Step 1: Helpers and specs**

Replace `e2e/helpers.ts`:

```ts
import { expect, type Browser, type Locator, type Page } from "@playwright/test";

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

/** Signs up a fresh user with their own team and lands on its empty "Engineering" board (keys ENG-n). */
export async function openFreshBoard(page: Page) {
  const id = await signUp(page);
  await createTeamAndWorkspace(page, `Team ${id}`);
  await page.getByRole("link", { name: "Skip for now" }).click();
  await expect(page.getByRole("region", { name: "Backlog" })).toBeVisible();
  return id;
}

export const column = (page: Page, name: string) => page.getByRole("region", { name, exact: true });

/** Adds a task at the top of a column and waits until the server has assigned its key. */
export async function quickAdd(page: Page, columnName: string, title: string) {
  await page.getByRole("button", { name: `Add task to ${columnName}` }).click();
  const input = page.getByLabel(`New task in ${columnName}`);
  await input.fill(title);
  await input.press("Enter");
  await input.press("Escape");
  await expect(column(page, columnName).getByRole("article").filter({ hasText: title })).toContainText(/ENG-\d+/);
}

/** Drags with real pointer events (dnd-kit needs movement past its 5px activation distance). */
export async function drag(page: Page, from: Locator, to: Locator, offsetY = 60) {
  const source = (await from.boundingBox())!;
  const target = (await to.boundingBox())!;
  await page.mouse.move(source.x + source.width / 2, source.y + source.height / 2);
  await page.mouse.down();
  await page.mouse.move(source.x + source.width / 2 + 10, source.y + source.height / 2, { steps: 5 });
  await page.mouse.move(target.x + target.width / 2, target.y + offsetY, { steps: 20 });
  await page.mouse.up();
}

/** Waits until the board has no mutation in flight (it sets aria-busy while saving). */
export async function saved(page: Page) {
  await expect(page.locator('[data-slot="board"]')).toHaveAttribute("aria-busy", "false");
}

/** Opens a settings tab of the current team from the sidebar. */
export async function openSettings(page: Page, tab: "General" | "Members" | "Labels" | "Profile") {
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  await page.getByRole("navigation", { name: "Settings" }).getByRole("link", { name: tab }).click();
  await expect(page.getByRole("link", { name: tab, exact: true })).toHaveAttribute("aria-current", "page");
}

/** Invites a fresh email from the members page; returns it with the invite link (emails arrive in M5). */
export async function inviteTeammate(owner: Page, role: "Member" | "Admin" = "Member") {
  await openSettings(owner, "Members");
  const email = `mate-${uniqueId()}@example.test`;
  await owner.getByLabel("Email addresses").fill(email);
  if (role === "Admin") {
    await owner.getByRole("combobox", { name: "Role" }).click();
    await owner.getByRole("option", { name: "Admin" }).click();
  }
  await owner.getByRole("button", { name: "Send invites" }).click();
  const row = owner.getByRole("listitem", { name: `Invite for ${email}` });
  await expect(row).toBeVisible();
  const link = await row.getByRole("button", { name: "Copy link" }).getAttribute("data-invite-link");
  return { email, link: link! };
}

/** Opens the invite link in a new browser (signed out), signs up with the invited email and joins. */
export async function joinWithInvite(browser: Browser, baseURL: string, invite: { email: string; link: string }) {
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();
  await page.goto(invite.link);
  await expect(page).toHaveURL(/\/sign-in\?next=%2Finvite%2F/);
  await page.getByRole("link", { name: "Sign up" }).click();
  await page.getByLabel("Name", { exact: true }).fill("Mate");
  await page.getByLabel("Email", { exact: true }).fill(invite.email);
  await page.getByLabel("Password", { exact: true }).fill("password123");
  await page.getByRole("button", { name: "Create account" }).click();
  await page.getByRole("button", { name: /^Join / }).click();
  await expect(page.getByRole("heading", { name: "My tasks" })).toBeVisible();
  return { context, page };
}
```

Create `e2e/team.spec.ts`:

```ts
import { expect, test } from "@playwright/test";
import {
  column,
  fillSignIn,
  inviteTeammate,
  joinWithInvite,
  openFreshBoard,
  openSettings,
  quickAdd,
  signUp,
  uniqueId,
} from "./helpers";

test("an invited teammate joins and collaborates on the board", async ({ page, browser, baseURL }) => {
  await openFreshBoard(page);
  const invite = await inviteTeammate(page);
  const { page: mate, context } = await joinWithInvite(browser, baseURL!, invite);

  await mate.getByRole("link", { name: "Engineering", exact: true }).click();
  await expect(column(mate, "Backlog")).toBeVisible();
  // Members work on tasks but don't manage structure.
  await expect(mate.getByRole("button", { name: "Add column" })).toHaveCount(0);
  await expect(mate.getByRole("button", { name: "New workspace" })).toHaveCount(0);
  await quickAdd(mate, "Todo", "From my teammate");

  await page.getByRole("link", { name: "Engineering", exact: true }).click();
  await expect(column(page, "Todo")).toContainText("From my teammate");
  await openSettings(page, "Members");
  await expect(page.getByRole("listitem", { name: "Mate" })).toContainText(invite.email);
  await expect(page.getByRole("listitem", { name: `Invite for ${invite.email}` })).toHaveCount(0);
  await context.close();
});

test("owners change roles and remove members", async ({ page, browser, baseURL }) => {
  await openFreshBoard(page);
  const invite = await inviteTeammate(page);
  const { page: mate, context } = await joinWithInvite(browser, baseURL!, invite);

  await page.reload();
  await page.getByRole("combobox", { name: "Role for Mate" }).click();
  await page.getByRole("option", { name: "Admin" }).click();
  await expect(page.getByText("Mate is now admin")).toBeVisible();
  await mate.reload();
  await expect(mate.getByRole("button", { name: "New workspace" })).toBeVisible();

  await page.getByRole("button", { name: "Actions for Mate" }).click();
  await page.getByRole("menuitem", { name: "Remove from team" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Remove" }).click();
  // The toast only appears once the server has removed them (while the dialog is open,
  // Radix hides the list from the accessibility tree, so the row can't be used as the signal).
  await expect(page.getByText("Removed Mate")).toBeVisible();
  await expect(page.getByRole("listitem", { name: "Mate" })).toHaveCount(0);
  await mate.reload();
  await expect(mate.getByText("This page could not be found.")).toBeVisible();
  await context.close();
});

test("ownership can be transferred, then the old owner can leave", async ({ page, browser, baseURL }) => {
  await openFreshBoard(page);
  const invite = await inviteTeammate(page);
  const { page: mate, context } = await joinWithInvite(browser, baseURL!, invite);

  await page.reload();
  await page.getByRole("button", { name: "Actions for Mate" }).click();
  await page.getByRole("menuitem", { name: "Make owner" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Make owner" }).click();
  await expect(page.getByText("Mate is now the owner")).toBeVisible();

  await openSettings(mate, "General");
  await expect(mate.getByRole("button", { name: "Delete team" })).toBeVisible();

  await page.reload();
  await page.getByRole("button", { name: "Leave team" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Leave team" }).click();
  // The old owner has no other team, so they land in onboarding.
  await expect(page.getByRole("heading", { name: "Create your team" })).toBeVisible();
  await context.close();
});

test("invite links: revoked, resent and opened with the wrong account", async ({ page, browser, baseURL }) => {
  await openFreshBoard(page);
  const revoked = await inviteTeammate(page);
  await page
    .getByRole("listitem", { name: `Invite for ${revoked.email}` })
    .getByRole("button", { name: "Revoke" })
    .click();
  await expect(page.getByRole("listitem", { name: `Invite for ${revoked.email}` })).toHaveCount(0);

  const invite = await inviteTeammate(page);
  const row = page.getByRole("listitem", { name: `Invite for ${invite.email}` });
  await row.getByRole("button", { name: "Resend" }).click();
  await expect(row.getByRole("button", { name: "Copy link" })).not.toHaveAttribute("data-invite-link", invite.link);
  const fresh = (await row.getByRole("button", { name: "Copy link" }).getAttribute("data-invite-link"))!;

  // Someone else, already signed in, opens the links.
  const context = await browser.newContext({ baseURL });
  const other = await context.newPage();
  await signUp(other);
  await other.goto(revoked.link);
  await expect(other.getByRole("heading", { name: "Invite not found" })).toBeVisible();
  await other.goto(invite.link);
  await expect(other.getByRole("heading", { name: "Invite not found" })).toBeVisible();
  await other.goto(fresh);
  await expect(other.getByRole("heading", { name: "Wrong account" })).toBeVisible();
  await context.close();
});

test("labels are managed in settings", async ({ page }) => {
  await openFreshBoard(page);
  await openSettings(page, "Labels");
  await page.getByLabel("New label").fill("Design");
  await page.getByRole("button", { name: "Add label" }).click();
  await expect(page.getByRole("listitem", { name: "Design" })).toBeVisible();
  await expect(page.getByLabel("New label")).toHaveValue("");

  await page.getByRole("listitem", { name: "Design" }).getByRole("button", { name: "Design", exact: true }).click();
  await page.getByLabel("Label name").fill("UX");
  await page.getByLabel("Label name").press("Enter");
  await expect(page.getByRole("listitem", { name: "UX" })).toBeVisible();

  await page.getByRole("combobox", { name: "Colour for UX" }).click();
  await page.getByRole("option", { name: "Pink" }).click();
  await page.getByRole("button", { name: "Delete Bug" }).click();
  await expect(page.getByRole("listitem", { name: "Bug" })).toHaveCount(0);
  // Edits are optimistic; wait until the list has finished saving before reloading.
  await expect(page.getByRole("list", { name: "Labels" })).toHaveAttribute("aria-busy", "false");

  await page.reload();
  await expect(page.getByRole("combobox", { name: "Colour for UX" })).toHaveText(/Pink/);
  await expect(page.getByRole("listitem", { name: "Bug" })).toHaveCount(0);
});

test("profile changes show across the app", async ({ page }) => {
  await openFreshBoard(page);
  await openSettings(page, "Profile");
  const name = `Grace ${uniqueId()}`;
  await page.getByLabel("Name", { exact: true }).fill(name);
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByText("Profile saved")).toBeVisible();
  await expect(page.getByRole("link", { name: new RegExp(name) })).toBeVisible(); // sidebar footer

  // type="url": the browser refuses to submit an invalid avatar URL.
  const avatar = page.getByLabel("Avatar URL");
  await avatar.fill("not a url");
  await page.getByRole("button", { name: "Save profile" }).click();
  expect(await avatar.evaluate((input: HTMLInputElement) => input.checkValidity())).toBe(false);
});

test("teams can be renamed and deleted", async ({ page }) => {
  const id = await openFreshBoard(page);
  await openSettings(page, "General");
  await page.getByLabel("Team name").fill(`Renamed ${id}`);
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("button", { name: `Switch team (current: Renamed ${id})` })).toBeVisible();

  await page.getByRole("button", { name: "Delete team" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete team" }).click();
  await expect(page.getByRole("heading", { name: "Create your team" })).toBeVisible();
});

test("signing up from an invite keeps the invite through sign-in and sign-up", async ({ page }) => {
  await page.goto("/invite/some-token");
  await expect(page).toHaveURL(/\/sign-in\?next=%2Finvite%2Fsome-token$/);
  await page.getByRole("link", { name: "Sign up" }).click();
  await expect(page).toHaveURL(/\/sign-up\?next=%2Finvite%2Fsome-token$/);
  await page.getByRole("link", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/sign-in\?next=%2Finvite%2Fsome-token$/);
  await fillSignIn(page, "demo@trackaai.test", "demo-password");
  await expect(page.getByRole("heading", { name: "Invite not found" })).toBeVisible();
});
```

- [ ] **Step 2: Run**

Run: `pnpm test:e2e`, then `CI=1 pnpm test:e2e --retries=0` three times.
Expected: `28 passed` every time (the dry run was 28/28 on six consecutive runs after these fixes).

- [ ] **Step 3: Docs** — in `README.md` under **Develop**, add: "Invite emails arrive in M5; until then the members page shows each invite's link, and the dev server logs it." In this file's status table mark M3 `✅ Done` and M4 `Planned when M3 is merged`.

- [ ] **Step 4: Full verification**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e`
Expected: 177 unit + 28 e2e green.

- [ ] **Step 5: Commit, review, PR**

```bash
git add -A
git commit -m "test(e2e): cover invites, roles, ownership, labels, profile and team settings"
```
Run the `pre-pr-reviewer` subagent on the branch and fix its findings (each fix as its own commit, re-running the checks). Then:

```bash
git push -u origin m3-team-management
gh pr create --base main --title "M3: team & user management" --body "..."
```
Queue auto-merge (merge commit) so the PR lands when CI passes.

---

## Pre-PR review (applied after Task 8)

The `pre-pr-reviewer` subagent found no authorization gaps. Its verified findings were fixed as separate commits:
- **Open redirect:** `safeNextPath` accepted `"/\t/evil.test"` (browsers strip tab/CR/LF → `//evil.test`). It now resolves `next` against a dummy origin and requires the origin to be unchanged; tests cover `\t`, `\n`, `\r`.
- **Host-header poisoning:** invite links came from `Host`/`X-Forwarded-Host`. `resolveAppOrigin` (`src/lib/app-url.ts`, tested) uses `APP_URL` and refuses the header fallback in production; `APP_URL` is in `.env.example` and the Playwright web server.
- Label deletion now asks for confirmation; used invites say "already used" instead of "expired"; avatar URLs must be http(s).

Deferred nits: `assertCan` in two form actions throws instead of returning a form error (UI hides those controls); `acceptInviteAction` doesn't Zod-validate the token (unknown tokens already 404).

## M3 Definition of Done

- A second user is invited (link copied from the members page), signs up through the link, joins with the invited role and collaborates on the board — covered by e2e with two browser contexts.
- Roles change, members are removed, ownership transfers, and non-owners can leave; every rule lives in `permissions.ts` and is unit-tested.
- Pending invites can be copied, resent (old link dies) and revoked; wrong-account and expired links explain themselves.
- Labels, the team name and the profile (name, avatar URL, theme) are editable; the theme follows the user across devices.
- 183 unit tests (177 from the plan + 6 from the review fixes) + 28 e2e tests green locally and in CI.

---

# M4 — Supabase (hosted) — Build record

Unlike M0–M3, M4 was built iteratively against the live project rather than from a pre-written plan, because two scope decisions arrived mid-way: **no Docker** (use a hosted Supabase project through the Supabase MCP connector) and **keep "Confirm email" on**. This section records what shipped, the decisions, and what was learned. The code is in the M4 PR.

## What shipped

| Area | Files |
|---|---|
| Schema, RLS, SQL functions | `supabase/migrations/20260929120000_initial_schema.sql`, `…163000_harden_grants_and_policies.sql`, `…164500_private_rls_helpers.sql` |
| Seed (dev accounts + demo board) | `supabase/seed.sql` |
| Schema/RLS tests (PGlite, no network) | `src/server/data/supabase/{pglite-harness,schema.test}.ts` |
| Supabase repositories + types | `src/server/data/supabase/{repositories,database.types,server-client,proxy-session}.ts`, `src/lib/supabase/{config,browser-client}.ts` |
| Live integration tests | `src/server/data/supabase/repositories.integration.test.ts` (`pnpm test:supabase`) |
| Sessions behind the contract | `AuthRepo.{signOut,currentUserId,confirmEmail}`; mock `SessionStore` (`src/server/data/mock/session.ts`, `src/server/auth/cookie-session.ts`) |
| Email confirmation | `src/app/auth/callback/route.ts`, `src/app/(auth)/sign-up/check-email/page.tsx`, sign-in `?confirm=failed` |
| Realtime | `src/components/board/use-board-realtime.ts` |

Contract changes: `auth.signUp` → `{ user, needsConfirmation }`; `invites.preview(token)` (an invitee can't read the team's tables before joining).

## Decisions

- **Hosted project, no Docker.** Migrations, SQL, advisors and type generation go through the Supabase MCP connector; the repo keeps the migration files as the source of truth.
- **Schema tests without a database server:** PGlite runs the real migrations with a small stub of the Supabase platform (roles, `auth.users`, `auth.uid()`), so RLS is tested in the normal unit suite and in CI.
- **No secret key anywhere.** The app uses the publishable key plus the user's session; integration tests sign in as seeded accounts.
- **"Confirm email" on.** Sign-up shows "Check your inbox"; the link lands on `/auth/callback` (PKCE `code` or `token_hash`); a `/?code=` fallback is forwarded when the redirect isn't allow-listed.
- **CI stays on the mock backend**; the live project is covered by `pnpm test:supabase` and a scripted end-to-end run (sign-in, board, quick-add, drag, realtime across two windows).

## Verified gotchas

1. Supabase's advisors flagged every `SECURITY DEFINER` helper as callable through `/rest/v1/rpc`, even by signed-out visitors → revoke from `anon`, then move the RLS helpers into a `private` schema (policies reference functions by OID, so they keep working; function bodies reference them by name and were rewritten). Only the five intended RPCs remain callable by signed-in users.
2. `auth.uid()` in a policy runs per row → wrap as `(select auth.uid())` (advisor `auth_rls_initplan`).
3. Fractional-index positions must sort by code unit → `position text collate "C"`.
4. Deleting a board must remove its columns and tasks together, but a non-empty column must not be deletable → `tasks.column_id` FK with the default `NO ACTION` (checked at statement end), not `RESTRICT`.
5. RLS makes forbidden updates silently match 0 rows → the repositories use `.select().single()` after writes and map "no row" to `NotFoundError`, matching the mock.
6. With "Confirm email" on, signing up with an existing address returns a user with no identities instead of an error → treated as `ConflictError("email")`.
7. The browser realtime channel subscribed before the session loaded and joined as `anon`, so RLS delivered nothing → load the session and `realtime.setAuth()` before `subscribe()`.
8. `supabase-js` types `.single()`/`.maybeSingle()` data as nullable → two helpers: `data()` (must exist → `NotFoundError`) and `maybe()` (null is a normal answer).
9. Stopping `next dev` mid-write can leave a truncated `.next/dev/types/validator.ts` that breaks `tsc` → `rm -rf .next`.
10. RLS decides *which rows* a user may update, not *which columns*. Without column grants a manager could rewrite `memberships.team_id` with an unfiltered update (the new row is only checked against the update policy) and put a teammate into another team, set `teams.plan`, or rewrite task keys; a user could change `profiles.email` to pass `accept_invite`'s email check → `revoke update` + `grant update (col, …)` per table, a trigger that keeps a task's column, parent and assignee inside its board and team, and `accept_invite` compares against `auth.users.email`. Found by the pre-PR review; covered by PGlite tests.
11. Realtime `postgres_changes` filters don't apply to DELETE events, which carry only the primary key → an unfiltered DELETE listener that refreshes only for ids on the current board. Depend on primitive config values, not a props object, or every refresh rejoins the channel.
12. `@supabase/ssr` passes no-store cache headers to `setAll` alongside the cookies; `proxy.ts` must copy both onto its response and redirects. `auth.signOut()` defaults to `scope: "global"` (every device) → use `"local"`.
13. `.env.local` values reach `next build`/`next start`, so the e2e server pins `DATA_BACKEND=mock` explicitly.

## Definition of done

- 227 unit tests (incl. 27 PGlite schema/RLS tests) and 28 e2e tests green in CI; 6 live integration tests green against the project.
- Supabase security advisor: only the five intended signed-in RPCs remain.
- Scripted live run: sign in → board → quick-add (atomic key) → drag persists → a second window sees changes via Realtime in ~40 ms.

---

# M6 — Plans & billing (simulated) — Build record

The draft plan (Stripe Checkout, Customer Portal, webhooks) was replaced mid-milestone by the user's decision: **skip Stripe and simulate billing**. Open choices took the draft's defaults: "project" = workspace, pending invites hold a seat, no trial, AI limits stored for M7–M9. What shipped:

- **Catalog** (`src/lib/domain/plans.ts`): Free / Lite / Pro with prices ($0 / $10 / $25 per team per month, display only), limits, features, `canAdd`, `nextPlanFor`, `planLimitMessage`, `planFeatures`.
- **Data:** `teams.plan` gains `free` (the default); `TeamsRepo.setPlan` and `TeamsRepo.usage` (members, live pending invites, workspaces) in both backends. `PlanLimitError` (a `ConflictError`) carries the plan and resource.
- **Database** (`…200000_plans_and_limits.sql`): `private.plan_limit` (kept equal to the catalog by a PGlite test), BEFORE INSERT triggers on workspaces, invites and memberships raising `plan_limit_reached`, `team_usage()` for members and invitees, and owner-only `set_team_plan()` (the simulated checkout; a real provider's webhook would call it with the service role instead).
- **Server:** `assertWithinPlan` / `assertSeatToJoin` / `countNewInvitees` (`src/server/billing/limits.ts`) in workspace creation, invites (settings and onboarding) and invite acceptance; `billing:manage` is owner-only; `completeCheckoutAction` and `downgradeAction`.
- **UI:** shared `PricingTable`; public `/pricing` (an open path, linked from sign-in and sign-up); **Settings → Billing** with usage meters, plan cards and over-limit/upgraded banners; `/[team]/settings/billing/checkout` (test-mode summary, "Confirm and subscribe"); "See plans" links on limit errors; the onboarding invite step and members page explain the Free limit instead of showing a form that can't work.
- **Tests:** plan catalog, limit helpers, 6 PGlite plan/limit tests (mutation-checked), a live integration test, and e2e for pricing, limits → upgrade → seats, and downgrade.

Gotchas:
1. New teams on Free broke every e2e flow that invites people or adds a workspace → an `upgradeTo(page, plan)` helper that goes through the real (simulated) checkout.
2. Invitees can't read the team under RLS, so the server-side join check can't see the plan on Supabase; the database's membership trigger does the same check inside `accept_invite`.
3. `/pricing` must be a reserved team slug (as must `auth`).
4. A dev server from another project held port 3000 → the local preview config uses `autoPort`.
5. (Pre-PR review) `/pricing` first shipped as an "open" path, which skips the proxy's session refresh; a page that reads the session there can rotate a refresh token whose new value is never saved → a third route category, **session-optional**: refreshed, never redirected.
6. (Pre-PR review) Limits only ran on INSERT, but resending an expired invite revives its seat → the invite trigger also fires on updates that make an invite live, managers may only update an invite's token and expiry, and `resendInviteAction` re-checks.
7. (Pre-PR review) Two concurrent inserts could both pass a count check → each limit trigger locks the team row (`select … for update`) before counting.
8. (Pre-PR review) Plan-limit copy is for the owner: invitees are told the team is full and to ask the owner; admins get "Ask the team owner to upgrade."
9. Old local `.data/mock-db.json` files keep Acme on the old default; delete `.data/` to reseed (Acme is on Pro).

---

# M7 — AI I: task writer & breakdown — Plan

**Goal:** From a one-liner, the create-task dialog streams in a title, a description with acceptance criteria, a priority and labels, which the user edits before creating. From a task's sheet, "Break down" streams 3–8 sub-tasks to preview, pick and create in the parent's column. Every run counts toward the plan's monthly `aiRuns` limit (Free 10, Lite 100, Pro unlimited) and is logged to `ai_usage`.

**Architecture:**
- AI SDK v7 (`streamText` + `Output.object`, `useObject` on the client) with `@ai-sdk/anthropic`, model `claude-haiku-4-5` (cheap generation).
- Two route handlers (`/api/ai/task-writer`, `/api/ai/breakdown`) check the session, board or task access and the plan limit, reserve the run (`start_ai_run`), then stream; `after()` fills in the tokens (`finish_ai_run`).
- AI output is only a suggestion: nothing is saved until the user submits. Creating sub-tasks is a server action with the usual checks.
- `AI_MOCK=1` swaps in a deterministic mock model (e2e and CI); no key → the AI buttons are hidden.

**Tasks:**
1. Domain schemas (`src/lib/domain/ai.ts`): task draft, breakdown, label matching (+ tests).
2. `ai_usage` table + RLS (members read their team's usage, write only as themselves, never delete) + PGlite tests; `AiUsageRepo` (`record`, `countSince`) in mock and Supabase.
3. `assertWithinPlan(…, "aiRuns")` counting this month's runs.
4. Server AI module: model selection, prompts, streaming helpers (tested with `MockLanguageModelV4`).
5. Route handlers with auth, access, plan checks and usage logging.
6. UI: "Write with AI" in the create dialog (labels become selectable), "Break down" dialog and a sub-tasks list in the task sheet; `createSubtasksAction`.
7. E2E with the mock model; one live call against Anthropic; docs; pre-PR review → PR → auto-merge.

### Build record

Shipped as planned. Verified live against Anthropic (a task draft with acceptance criteria and a matched label; a 6-step breakdown), with the run logged in `ai_usage` with its tokens.

Gotchas:
1. AI SDK v7 replaced `streamObject` with `streamText({ output: Output.object(...) })`, and `system` with `instructions`; `useObject` still reads a plain text stream (`createTextStreamResponse` + `toTextStream`).
2. `useObject` reports a failed response by throwing its body text, so the routes answer failures as JSON (`{ error, upgradeHref }`) and the client parses it to show "See plans" when the month's AI runs are used up.
3. Tokens are recorded in `after()`, once the stream has finished: route-handler `after` callbacks can still use cookies, which the Supabase client needs. After a client abort, `totalUsage` still drains the model stream, so aborted runs are metered too (don't pass `request.signal` to the model without changing this).
4. Proxy's matcher skips `/api`, so the AI routes rely on the guards (`notFound()`/`redirect()` work in route handlers).
5. (Pre-PR review) Logging a run only after it finished let parallel requests all pass the monthly check, and letting members insert `ai_usage` rows let one member use up the team's runs → runs are reserved up front by `start_ai_run()` (counts this month under the team row lock, raises `plan_limit_reached`), tokens are written once by `finish_ai_run()`, and direct inserts are revoked.
6. (Pre-PR review) `toTextStream` drops error parts, so a failed model call ends the HTTP stream normally and `useObject` sets no error → both dialogs treat an invalid final object (`onFinish` without `object`) as a failure and say so, and the breakdown hides partial suggestions.
7. The dev server keeps the repositories on `globalThis` across hot reloads, so a changed repository interface needs a dev-server restart.
8. Known limitation: sub-tasks are created one by one; if one fails midway, the ones before it stay.

---

# M8 — AI II: board copilot — Plan

**Goal:** A side panel on the board where you chat with an assistant that can search the board, summarize it, and create, update, move and assign tasks. Reads run immediately; **every change shows a confirm card** and runs only after you approve it, with your own permissions. Pro plan only (PRD §5.5).

**Architecture:**
- `/api/ai/copilot`: `useChat` + `streamText` with tools (AI SDK v7), model `claude-sonnet-5`.
- `toolApproval: 'user-approval'` on the four mutating tools. Approvals are HMAC-signed with `TOOL_APPROVAL_SECRET` (`experimental_toolApprovalSecret`), so a client can't forge an approval in the chat history it sends (a user can still replay their own signed approval, which only repeats a change they could make by hand).
- Tools are built per request from the caller's repositories and board (`src/server/ai/copilot/tools.ts`). They resolve names (column, member, label) and task keys on the server, reject anything outside the current board (members and labels come only from the caller's team, so the refs are valid by construction), and validate with the domain schemas.
- Every request reserves a run (`start_ai_run`, feature `copilot`), like M7. Non-Pro teams get a 402 with the upgrade path.
- Board content (task titles and descriptions written by teammates) is untrusted: the instructions say so, and nothing changes without a confirm click anyway.

**Tasks:**
1. `copilot` feature: domain + migration (ai_usage check constraint) + test.
2. Copilot tools with unit tests against the mock repositories.
3. Instructions (board context) + route handler (auth, access, Pro gate, run reservation, signed approvals, step limit).
4. Mock copilot model for e2e (a tool call on "move …", text otherwise).
5. UI: "Copilot" button in the board header → side sheet with messages, confirm cards (Approve / Deny) and result lines; the board refreshes after a change.
6. E2E (mock), one live run, docs, pre-PR review → PR → auto-merge.

### Build record

Shipped as planned. Verified live with `claude-sonnet-5`: an accurate board summary, and a two-part request that became two confirm cards; denying both changed nothing, and the model acknowledged it. Each request was logged in `ai_usage` (feature `copilot`).

Gotchas:
1. AI SDK v7 moved approval to `toolApproval` on `streamText` (`needsApproval` is deprecated); the client continues after a decision with `sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses`.
2. The chat history comes from the client, so approvals could be forged → `experimental_toolApprovalSecret` signs each approval request; the history is also checked with `validateUIMessages` against the tools and capped at 60 messages.
3. Tools return errors as thrown messages written for the model ("No column named X. Columns: …"), so it can correct names and retry once.
4. A modal sheet hides the board from the accessibility tree, so e2e checks the board after closing the panel.
5. `@ai-sdk/provider` is a direct dev dependency (the mock copilot model uses its stream-part types).
6. (Pre-PR review) Hardening:
   - Confirm cards show the full description text a change would write, and the target task's current title. A teammate could plant text that steers the model into writing a phishing link.
   - AI Markdown drops images, which would leak data on render; its links are `nofollow`.
   - Requests are capped at 200 KB, 60 messages and 2000 characters per message; `system` messages are refused.
   - Unanswered cards can't wedge the chat: Send waits for every decision, and history conversion ignores incomplete tool calls.
   - `update_task` refuses unknown labels (instead of clearing them) and validates with `updateTaskInputSchema`.
   - Names go into the instructions as a JSON data block.
   - Production refuses to run without a 32+ character `TOOL_APPROVAL_SECRET` (503).
   - The chat survives closing the panel, and there is a "New chat" button.
7. Each approval continuation is a new request, so one approved change reserves two AI runs (unlimited on Pro; it shows in `ai_usage`).

---

# M9 — AI III: AI teammate — Plan

**Goal:** On Pro, managers add AI teammates (a name and a specialty, e.g. "Spec writer: turns tasks into specs"). Anyone can assign a task to one. Assigning queues a run: the teammate reads the task (and its recent comments), writes its result as a comment, and moves the task to **In Review** for a human. The task sheet shows run history, a live "working" state and **Retry** for failed runs.

**Architecture:**
- Tables: `ai_agents` (team-scoped; managers create, rename and delete) and `agent_runs` (queued → running → succeeded | failed; at most one active run per task).
- `tasks.assignee_agent_id` and `comments.author_agent_id` get foreign keys; the task-refs trigger checks the agent is in the task's team.
- Runs change state only through SECURITY DEFINER functions: `start_agent_run` (Pro only), `claim_agent_run`, `finish_agent_run` (inserts the agent-authored comment) and `fail_agent_run`. Each checks the caller is the member who requested the run. Nobody can post as an agent directly.
- Worker: assigning a task to an agent (the task sheet, or the copilot's assign tool later) starts a run, and `after()` runs it with the requester's session. The model is `claude-sonnet-5` with plain Markdown output, and the task text is treated as data. The run is metered in `ai_usage` (feature `agent`). A queue or cron can replace `after()` later.
- The client refreshes while a run is active (polling every few seconds), so the comment and the move show up without a reload.

**Tasks:**
1. Migration + PGlite tests (tables, RLS, FKs, trigger, run functions, usage feature).
2. Domain types and repositories (`agents`, `agentRuns`) in mock and Supabase.
3. The runner (`src/server/ai/agent/run.ts`), tested with the mock repositories and a mock model.
4. Actions: manage agents (settings, managers, Pro), start a run on assignment, retry.
5. UI: **Settings → AI teammates**; agents in the assignee pickers and on cards; comment authors; run history, working state and Retry in the task sheet.
6. E2E (mock model), one live run, docs, pre-PR review → PR → auto-merge.

### Build record

Shipped as planned. Verified live with `claude-sonnet-5` on a throwaway Pro team: the teammate posted a structured spec (summary, assumptions, goal, acceptance criteria) as a comment and moved the task to In Review. The team was deleted afterwards.

Gotchas:
1. The run executes in `after()` of the server action that assigned the task, as the requester. The database functions check `requested_by = auth.uid()` at every step, so no one can drive someone else's run.
   - Known limitation: without a server-side worker key, the requester's own client could call `finish_agent_run` with its own text. That would put words under the teammate's name on a task assigned to it, in their own team, and it's recorded in `agent_runs`. A service-role worker would close this; M10 can add one.
2. Assigning the same agent again doesn't start a new run (only a change of assignee does); **Run again** starts a fresh run explicitly. One active run per task is a unique partial index.
3. The task sheet polls with `router.refresh()` every 3 s while a run is queued or running.
4. Mock runs created in the same millisecond need a stable newest-first order (reverse, then sort).
5. Without a queue, a run is lost if the server stops mid-run. It no longer blocks the task: runs older than 10 minutes time out when the next run starts, and the sheet stops polling after 10 minutes. A queue or cron (M10+) should retry them.
6. (Pre-PR review) Fixes:
   - Supabase's `create_task` ignored an agent assignee, so the create dialog lost it; `create_task` now takes `p_assignee_agent`.
   - A run needs the task to be assigned to that agent.
   - A team has at most 3 active runs and 50 a day (fair use on Pro).
   - Adding agents needs Pro, also in RLS.
   - A comment has at most one author.
   - Background runs use a client that carries only the access token, so they can't rotate the session after the response.
   - A finishing run re-reads the task: if it was reassigned it posts nothing, and if someone moved it the task stays where they put it.
   - Agent comments render as untrusted Markdown (no images, `nofollow` links).
   - A run that can't start after an assignment is a warning, not an error; reassigning during a run is refused up front.

# M10 — Hardening & launch — Part 1: speed

The app felt slow on the hosted Supabase project. Each round trip is ~60–80 ms, and the board page made about 20 of them, many one after another (~0.9 s per page, and the same again after every save).

Changes:
- **Local session checks:** `getClaims()` (ES256, keys cached per process) instead of `getUser()` in the proxy and pages, which removes two auth round trips from every request.
- **Embedded selects:** tasks with their labels, members with their profiles, the user's teams, workspaces with their boards, and "assigned to me" each load in one request.
- **One-lookup access checks:** `repos.access.*` resolves task → board → workspace → team → the caller's membership in one query. The guards run it in parallel with loading the profile, so every server action saves 4–5 round trips.
- **Parallel reads:** the board page loads in two rounds of parallel reads; the home page batches columns.
- **Sign-in** redirects straight to the first team.

Result (production build, warm): board ~150 ms, settings ~140 ms, home ~300 ms. The dev server is slower than that because it compiles pages on demand.

Also:
- `pnpm test:smoke` is a live end-to-end pass over every feature, AI included. It is green, and every page is under 0.4 s.
- Pressing C right after closing a panel now works.
- The copilot is hidden when the server has no `TOOL_APPROVAL_SECRET` in production.

Gotchas:
- `getClaims()` verifies the token locally, so "sign out everywhere", a ban or a password reset only takes effect in the app when the access token expires (1 h by default). Team membership is still checked in the database on every request, so removing someone from a team is immediate. If sensitive actions need it later, call `getUser()` there or shorten the JWT expiry.
- `loading.tsx` skeletons were tried and removed. With any of them present (even the board's), Next 16 sometimes dropped a server action's `refresh()` update to the shared layout, e.g. the sidebar kept the old team name after a rename, and three e2e tests failed consistently. Correct data matters more than a skeleton, and pages are now fast.

# M10 — Hardening & launch — Part 2: errors, accessibility, rate limits

Changes:
- **Error pages:**
  - `error.tsx` at the root and inside `[team]` (keeps the sidebar), with **Try again** (Next 16 `retry()`) and the error digest to match server logs.
  - `global-error.tsx` has inline styles only, because it replaces the root layout.
  - `not-found.tsx` at the root, and one inside `[team]` for a missing board, which keeps the sidebar.
- **Empty states:**
  - "My tasks" tells a team with no boards how to get one.
  - A board with no columns says so, with the next step depending on the role.
- **Accessibility:**
  - `e2e/a11y.spec.ts` runs axe (WCAG 2.1 AA) over every public page, app page, dialog and panel, in both themes. Everything passes.
  - Fixed along the way:
    - Light-theme `--muted-foreground` and `--destructive` were a little under 4.5:1 on their tinted backgrounds.
    - Unselected label toggles faded the text; the selected state is now a fill instead.
    - Task cards were `role=button` wrappers around the card link, which is nested interactive and meant two tab stops per card.
  - The card link is now the keyboard drag handle:
    - Enter opens the task.
    - Space picks it up, Left/Right move it between columns (`board-keyboard.ts`; dnd-kit's default never left the column) and Space drops it.
    - Enter on a card used to do nothing.
- **Rate limit:**
  - `start_ai_run` refuses a user's 21st interactive AI run in a rolling minute, even on Pro (no monthly cap there), and the route answers 429 with `Retry-After`.
  - AI teammate runs are exempt (they have their own caps).
  - The limit is in the database with the reservation, so it holds across server instances. A per-user advisory lock (taken after the team row lock, always in that order) stops someone in several teams from slipping past it with parallel calls to different teams. Only AI spends money on the server's behalf; other writes are RLS-bound and cheap.

Gotchas:
- **`instanceof` across bundles:** the repositories are cached on `globalThis`, but a production build gives route handlers and pages separate copies of `errors.ts`. A `RateLimitError` thrown by repositories first built by a page failed `instanceof` in the AI route (500 instead of 429), and the same could hit `ConflictError`/`PlanLimitError`. The errors now carry their kinds under `Symbol.for(...)`, and `Symbol.hasInstance` checks that. Each class declares its own static `kind`, not its name, because bundlers mangle class names; a subclass without one matches nothing. `errors.test.ts` loads two copies of the module to cover it.
- dnd-kit's keyboard sensor starts listening for arrow keys a tick after the pick-up, so the e2e test pauses briefly between keys.

Next in M10: closing the AI teammate impersonation gap, and deploying to Vercel with production settings.

# M10 — Part 3: only the server can post as an AI teammate

The M9 limitation: the requester's own session could call `finish_agent_run` with its own text and have it posted as the teammate. The plan was a service-role worker, but that needs the Supabase secret key, which stays with the owner. A server-held worker token does the same job without it:

- `claim_agent_run`, `finish_agent_run` and `fail_agent_run` now take `p_worker_token`. `private.assert_worker` compares its SHA-256 with `private.worker_secrets`, a table no API role can read; the check function isn't callable by them either. The `requested_by = auth.uid()` checks stay.
- The server reads the token from `AGENT_WORKER_SECRET` (`src/server/data/supabase/worker-token.ts`) and sends it only on those calls, over TLS to Supabase, so it never reaches a browser.
- Without `AGENT_WORKER_SECRET`, assigning a task to a teammate or running one is refused with "AI teammates aren't set up on this server yet" (like a missing AI key), instead of queuing runs that can't finish. If the database rejects the token (no hash stored, or rotated in only one place), the run can't be claimed: the server logs why and the run times out after 10 minutes.
- The token was generated into `.env.local` and only its hash was stored live. To rotate: put a new value in the env and upsert its SHA-256 (SQL in the migration header).

Tests: PGlite (wrong, empty, missing and unconfigured tokens refused; the table and check unreadable), and live (the requester's own client is refused).

Gotcha: this changes the RPC signatures, so a server still running older code can't finish teammate runs until it's rebuilt.

Next in M10: deploying to Vercel with production settings (needs the owner's Vercel account).

# Ask AI — a team-wide, read-only chat about issues

Requested on 2026-10-02: "chat with my issues to see what needs to be resolved, what's urgent, who has which assigned issues", with the AI SDK and Sonnet 5.5. Decisions: read-only (changes stay with the board Copilot), its own page in the sidebar, on every plan and metered per message.

- **Page:** `/[team]/ask` (`AskChat`), with starter questions. The conversation lives in the tab; nothing is saved.
- **Route:** `/api/ai/ask` with `claude-sonnet-5-5` (`ASK_MODEL`).
  - Each message reserves one run (`feature = 'ask'`, migration `20261002120000_ask_usage`), so the monthly limits and the 20-a-minute limit apply.
  - Request size and length limits are shared with the copilot (`parseChatRequest`).
- **Tools** (`src/server/ai/ask/tools.ts`), loading the team's data once per request with the caller's repositories:
  - `search_issues`: board, state (open/backlog/todo/started/review/done/canceled, from column names via `statusOf`, now in the domain), column, priority, assignee (me/unassigned/name/AI teammate), label, overdue, due before, and text. Open issues come first, most urgent first.
  - `get_issue`: one issue with its description, sub-tasks and latest comments.
  - `team_overview`: counts per board/column, per assignee, and totals.
- **Links:** every result carries an in-app `url`, and the model is told to link issues with it. Untrusted Markdown keeps app-relative links in the app; everything else still opens apart with `nofollow`.
- **Data:** `tasks.listForTeam` loads the team's tasks in one embedded select, capped at 1000 (PostgREST's max rows). The tools say when the cap is reached.
- **Tests:** tool tests cover filters, ordering, scoping, the other team and unknown names; schema test for the new feature; mock and live `listForTeam` tests; e2e with a scripted mock model (urgent issues → link → task opens); an axe check of the page; and a real-model step in `pnpm test:smoke`.
