import { tool } from "ai";
import { z } from "zod";
import {
  PRIORITIES,
  createTaskInputSchema,
  matchLabelIds,
  parseTaskKey,
  type Board,
  type Column,
  type Label,
  type Role,
  type Task,
  type User,
} from "@/lib/domain";
import { can } from "@/server/auth/permissions";
import type { Repositories } from "@/server/data/types";

/** Tools that change data: each needs the user's approval before it runs. */
export const COPILOT_MUTATIONS = ["create_task", "update_task", "move_task", "assign_task"] as const;

export type CopilotContext = { repos: Repositories; userId: string; teamId: string; role: Role; board: Board };

// Everything is resolved from names and task keys on the server, scoped to the
// current board and the caller's team; errors are phrased for the model to relay
// or recover from (they become the tool's error output).

type BoardData = { columns: Column[]; tasks: Task[]; members: User[]; labels: Label[] };

const byName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

export function createCopilotTools(ctx: CopilotContext) {
  const { repos, board } = ctx;

  async function load(): Promise<BoardData> {
    const [columns, tasks, members, labels] = await Promise.all([
      repos.boards.listColumns(board.id),
      repos.tasks.listForBoard(board.id),
      repos.memberships.listMembers(ctx.teamId),
      repos.labels.listForTeam(ctx.teamId),
    ]);
    return { columns, tasks, members: members.map((m) => m.user), labels };
  }

  function column(data: BoardData, name: string): Column {
    const found = data.columns.find((c) => byName(c.name, name));
    if (!found) throw new Error(`No column named "${name}". Columns: ${data.columns.map((c) => c.name).join(", ")}.`);
    return found;
  }

  function member(data: BoardData, who: string): User {
    if (byName(who, "me")) return data.members.find((m) => m.id === ctx.userId)!;
    const matches = data.members.filter(
      (m) => byName(m.email, who) || byName(m.name, who) || m.name.toLowerCase().split(/\s+/).includes(who.trim().toLowerCase()),
    );
    if (matches.length === 1) return matches[0];
    const everyone = data.members.map((m) => `${m.name} <${m.email}>`).join(", ");
    if (matches.length === 0) throw new Error(`No team member matches "${who}". Members: ${everyone}.`);
    throw new Error(`Several members match "${who}"; use their email. Members: ${everyone}.`);
  }

  function task(data: BoardData, key: string): Task {
    const parsed = parseTaskKey(key.trim().toUpperCase());
    const found = parsed && data.tasks.find((t) => t.key === `${parsed.prefix}-${parsed.number}`);
    if (!found) throw new Error(`No task ${key.trim().toUpperCase()} on this board.`);
    return found;
  }

  function describe(data: BoardData, t: Task) {
    const userId = t.assignee?.kind === "user" ? t.assignee.userId : undefined;
    const assignee = userId ? data.members.find((m) => m.id === userId) : undefined;
    return {
      key: t.key,
      title: t.title,
      column: data.columns.find((c) => c.id === t.columnId)?.name ?? "?",
      priority: t.priority,
      assignee: assignee?.name ?? null,
      labels: data.labels.filter((l) => t.labelIds.includes(l.id)).map((l) => l.name),
      dueDate: t.dueDate,
      parentKey: data.tasks.find((p) => p.id === t.parentId)?.key ?? null,
    };
  }

  function assertCanEdit() {
    if (!can(ctx.role, "task:update")) throw new Error("You don't have permission to change tasks.");
  }

  function splitLabels(data: BoardData, names: string[] | undefined) {
    const ids = matchLabelIds(names, data.labels);
    const ignored = (names ?? []).filter((n) => !data.labels.some((l) => byName(l.name, n)));
    return { ids, ignored };
  }

  const key = z.string().describe('A task key on this board, e.g. "ENG-12".');
  const priority = z.enum(PRIORITIES);

  return {
    search_tasks: tool({
      description:
        "Find tasks on this board. All filters are optional and combine; with none, lists every task (up to 50).",
      inputSchema: z.object({
        query: z.string().optional().describe("Text to look for in titles and descriptions."),
        column: z.string().optional().describe("Column name."),
        assignee: z.string().optional().describe('"me", a member\'s name or email, or "none" for unassigned.'),
        priority: priority.optional(),
      }),
      execute: async (input) => {
        const data = await load();
        const col = input.column ? column(data, input.column) : undefined;
        const who = input.assignee && !byName(input.assignee, "none") ? member(data, input.assignee) : undefined;
        const text = input.query?.trim().toLowerCase();
        const matches = data.tasks.filter(
          (t) =>
            (!text || t.title.toLowerCase().includes(text) || t.description.toLowerCase().includes(text)) &&
            (!col || t.columnId === col.id) &&
            (!input.priority || t.priority === input.priority) &&
            (!input.assignee ||
              (who ? t.assignee?.kind === "user" && t.assignee.userId === who.id : t.assignee === null)),
        );
        return { total: matches.length, tasks: matches.slice(0, 50).map((t) => describe(data, t)) };
      },
    }),

    summarize_board: tool({
      description: "Counts and highlights for this board: tasks per column, unassigned, overdue and urgent/high priority.",
      inputSchema: z.object({}),
      execute: async () => {
        const data = await load();
        const today = new Date().toISOString().slice(0, 10);
        const done = data.columns.at(-1)?.id;
        const open = data.tasks.filter((t) => t.columnId !== done);
        return {
          board: board.name,
          total: data.tasks.length,
          columns: data.columns.map((c) => ({ name: c.name, tasks: data.tasks.filter((t) => t.columnId === c.id).length })),
          unassigned: open.filter((t) => t.assignee === null).length,
          overdue: open.filter((t) => t.dueDate !== null && t.dueDate < today).map((t) => t.key),
          urgentOrHigh: open.filter((t) => t.priority === "urgent" || t.priority === "high").map((t) => t.key),
        };
      },
    }),

    create_task: tool({
      description: "Create a task on this board. Requires the user's approval.",
      inputSchema: z.object({
        title: z.string().min(1).max(200),
        description: z.string().max(20000).optional().describe("Markdown."),
        column: z.string().optional().describe("Column name; defaults to the first column."),
        priority: priority.optional(),
        assignee: z.string().optional().describe('"me", a member\'s name or email.'),
        labels: z.array(z.string()).optional().describe("Label names."),
      }),
      execute: async (input) => {
        assertCanEdit();
        const data = await load();
        const col = input.column ? column(data, input.column) : data.columns[0];
        const who = input.assignee ? member(data, input.assignee) : undefined;
        const labels = splitLabels(data, input.labels);
        const created = await repos.tasks.create({
          ...createTaskInputSchema.parse({
            boardId: board.id,
            columnId: col.id,
            title: input.title,
            description: input.description ?? "",
            priority: input.priority,
            assignee: who ? { kind: "user", userId: who.id } : null,
            labelIds: labels.ids,
          }),
          createdBy: ctx.userId,
        });
        return { ...describe(data, created), ignoredLabels: labels.ignored };
      },
    }),

    update_task: tool({
      description: "Change a task's title, description, priority, due date or labels. Requires the user's approval.",
      inputSchema: z.object({
        key,
        title: z.string().min(1).max(200).optional(),
        description: z.string().max(20000).optional(),
        priority: priority.optional(),
        dueDate: z.iso.date().nullable().optional().describe("YYYY-MM-DD, or null to clear."),
        labels: z.array(z.string()).optional().describe("The complete new set of label names."),
      }),
      execute: async ({ key: taskKey, labels, ...patch }) => {
        assertCanEdit();
        const data = await load();
        const target = task(data, taskKey);
        const resolved = labels ? splitLabels(data, labels) : undefined;
        const updated = await repos.tasks.update(target.id, {
          ...patch,
          ...(resolved ? { labelIds: resolved.ids } : {}),
        });
        return { ...describe(data, updated), ignoredLabels: resolved?.ignored ?? [] };
      },
    }),

    move_task: tool({
      description: "Move a task to another column (to the end). Requires the user's approval.",
      inputSchema: z.object({ key, column: z.string() }),
      execute: async (input) => {
        assertCanEdit();
        const data = await load();
        const target = task(data, input.key);
        const col = column(data, input.column);
        const others = data.tasks.filter((t) => t.columnId === col.id && t.id !== target.id).length;
        return describe(data, await repos.tasks.move(target.id, { columnId: col.id, index: others }));
      },
    }),

    assign_task: tool({
      description: "Assign a task to a team member, or unassign it. Requires the user's approval.",
      inputSchema: z.object({
        key,
        assignee: z.string().nullable().describe('"me", a member\'s name or email, or null to unassign.'),
      }),
      execute: async (input) => {
        assertCanEdit();
        const data = await load();
        const target = task(data, input.key);
        const who = input.assignee ? member(data, input.assignee) : null;
        const updated = await repos.tasks.update(target.id, {
          assignee: who ? { kind: "user", userId: who.id } : null,
        });
        return describe(data, updated);
      },
    }),
  };
}
