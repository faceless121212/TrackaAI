import { tool } from "ai";
import { z } from "zod";
import {
  PRIORITIES,
  isResolved,
  parseTaskKey,
  statusOf,
  type Agent,
  type Board,
  type Column,
  type Label,
  type Priority,
  type Status,
  type Task,
  type User,
} from "@/lib/domain";
import { boardPath } from "@/lib/paths";
import { TEAM_TASKS_LIMIT, type Repositories } from "@/server/data/types";

// Read-only tools for "Ask AI": questions across every board of one team. Data
// is loaded once per request with the caller's repositories (so RLS applies)
// and every result is scoped to `teamId`. Errors are phrased for the model.

export type AskContext = { repos: Repositories; teamId: string; teamSlug: string; userId: string; today: string };

type TeamData = {
  tasks: Task[];
  truncated: boolean;
  boards: Board[];
  columns: Column[];
  members: User[];
  agents: Agent[];
  labels: Label[];
};

const STATES = ["open", "backlog", "todo", "started", "review", "done", "canceled"] as const;
const URGENCY: Record<Priority, number> = { urgent: 0, high: 1, medium: 2, low: 3, none: 4 };
const MAX_RESULTS = 50;

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

export function createAskTools(ctx: AskContext) {
  const { repos } = ctx;
  let loaded: Promise<TeamData> | undefined;

  function load(): Promise<TeamData> {
    loaded ??= (async () => {
      const [tasks, workspaces, members, agents, labels] = await Promise.all([
        repos.tasks.listForTeam(ctx.teamId),
        repos.workspaces.listWithBoards(ctx.teamId),
        repos.memberships.listMembers(ctx.teamId),
        repos.agents.listForTeam(ctx.teamId),
        repos.labels.listForTeam(ctx.teamId),
      ]);
      const boards = workspaces.flatMap((w) => w.boards);
      const columns = await repos.boards.listColumnsForBoards(boards.map((b) => b.id));
      return {
        tasks,
        truncated: tasks.length >= TEAM_TASKS_LIMIT,
        boards,
        columns,
        members: members.map((m) => m.user),
        agents,
        labels,
      };
    })();
    return loaded;
  }

  const columnOf = (data: TeamData, t: Task) => data.columns.find((c) => c.id === t.columnId);
  const stateOf = (data: TeamData, t: Task): Status => statusOf(columnOf(data, t)?.name ?? "");
  const isOverdue = (data: TeamData, t: Task) => !!t.dueDate && t.dueDate < ctx.today && !isResolved(stateOf(data, t));

  function assigneeName(data: TeamData, t: Task): string | null {
    if (t.assignee?.kind === "user") {
      const { userId } = t.assignee;
      return data.members.find((m) => m.id === userId)?.name ?? "Former member";
    }
    if (t.assignee?.kind === "agent") {
      const { agentId } = t.assignee;
      return `${data.agents.find((a) => a.id === agentId)?.name ?? "AI teammate"} (AI teammate)`;
    }
    return null;
  }

  function describe(data: TeamData, t: Task) {
    return {
      key: t.key,
      title: t.title,
      url: `${boardPath(ctx.teamSlug, t.boardId)}?task=${t.key}`,
      board: data.boards.find((b) => b.id === t.boardId)?.name ?? "?",
      column: columnOf(data, t)?.name ?? "?",
      state: stateOf(data, t),
      priority: t.priority,
      assignee: assigneeName(data, t),
      labels: data.labels.filter((l) => t.labelIds.includes(l.id)).map((l) => l.name),
      dueDate: t.dueDate,
      overdue: isOverdue(data, t),
      updatedAt: t.updatedAt.slice(0, 10),
    };
  }

  /** Who `who` refers to: "me", "unassigned", a member's name/email, or an AI teammate's name. */
  function assigneeFilter(data: TeamData, who: string): (t: Task) => boolean {
    if (same(who, "unassigned") || same(who, "none") || same(who, "nobody")) return (t) => t.assignee === null;
    if (same(who, "me")) return (t) => t.assignee?.kind === "user" && t.assignee.userId === ctx.userId;
    const needle = who.trim().toLowerCase();
    const people = data.members.filter(
      (m) => same(m.email, who) || same(m.name, who) || m.name.toLowerCase().split(/\s+/).includes(needle),
    );
    const bots = data.agents.filter((a) => same(a.name, who));
    if (people.length + bots.length === 0) {
      const everyone = [...data.members.map((m) => m.name), ...data.agents.map((a) => `${a.name} (AI teammate)`)];
      throw new Error(`No one on the team matches "${who}". People: ${everyone.join(", ") || "none"}.`);
    }
    if (people.length > 1) {
      throw new Error(`Several members match "${who}"; use their email: ${people.map((m) => `${m.name} <${m.email}>`).join(", ")}.`);
    }
    return (t) =>
      (t.assignee?.kind === "user" && people.some((m) => m.id === (t.assignee as { userId: string }).userId)) ||
      (t.assignee?.kind === "agent" && bots.some((a) => a.id === (t.assignee as { agentId: string }).agentId));
  }

  return {
    search_issues: tool({
      description:
        "Find issues across all of the team's boards. Every filter is optional and they combine. Results put open issues first, most urgent first (priority, then due date), and include a url for each issue.",
      inputSchema: z.object({
        text: z.string().optional().describe("Words to look for in titles and descriptions."),
        board: z.string().optional().describe("Board name."),
        state: z
          .enum(STATES)
          .optional()
          .describe('"open" means anything not done or canceled. Others are workflow states derived from column names.'),
        column: z.string().optional().describe("Exact column name, when the state isn't specific enough."),
        priority: z.array(z.enum(PRIORITIES)).optional().describe('e.g. ["urgent", "high"].'),
        assignee: z.string().optional().describe('"me", "unassigned", a member\'s name or email, or an AI teammate\'s name.'),
        label: z.string().optional().describe("Label name."),
        overdue: z.boolean().optional().describe("Only issues past their due date and not resolved."),
        dueBefore: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("YYYY-MM-DD: due on or before this date."),
        limit: z.number().int().min(1).max(MAX_RESULTS).optional().describe(`How many to return (default 25, max ${MAX_RESULTS}).`),
      }),
      execute: async (input) => {
        const data = await load();
        const board = input.board ? data.boards.find((b) => same(b.name, input.board!)) : undefined;
        if (input.board && !board) {
          throw new Error(`No board named "${input.board}". Boards: ${data.boards.map((b) => b.name).join(", ") || "none"}.`);
        }
        const label = input.label ? data.labels.find((l) => same(l.name, input.label!)) : undefined;
        if (input.label && !label) {
          throw new Error(`No label named "${input.label}". Labels: ${data.labels.map((l) => l.name).join(", ") || "none"}.`);
        }
        const byAssignee = input.assignee ? assigneeFilter(data, input.assignee) : undefined;
        const text = input.text?.trim().toLowerCase();
        const matches = data.tasks
          .filter((t) => {
            const state = stateOf(data, t);
            return (
              (!board || t.boardId === board.id) &&
              (!input.state || (input.state === "open" ? !isResolved(state) : state === input.state)) &&
              (!input.column || same(columnOf(data, t)?.name ?? "", input.column)) &&
              (!input.priority?.length || input.priority.includes(t.priority)) &&
              (!byAssignee || byAssignee(t)) &&
              (!label || t.labelIds.includes(label.id)) &&
              (!input.overdue || isOverdue(data, t)) &&
              (!input.dueBefore || (!!t.dueDate && t.dueDate <= input.dueBefore)) &&
              (!text || t.title.toLowerCase().includes(text) || t.description.toLowerCase().includes(text))
            );
          })
          .sort(
            (a, b) =>
              Number(isResolved(stateOf(data, a))) - Number(isResolved(stateOf(data, b))) ||
              URGENCY[a.priority] - URGENCY[b.priority] ||
              (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999") ||
              b.updatedAt.localeCompare(a.updatedAt),
          );
        const limit = input.limit ?? 25;
        return {
          total: matches.length,
          showing: Math.min(limit, matches.length),
          ...(data.truncated && { note: `Only the ${TEAM_TASKS_LIMIT} most recently updated issues were searched.` }),
          issues: matches.slice(0, limit).map((t) => describe(data, t)),
        };
      },
    }),

    get_issue: tool({
      description: "One issue in full by its key: details, description and its latest comments.",
      inputSchema: z.object({ key: z.string().describe('An issue key, e.g. "ENG-12".') }),
      execute: async ({ key }) => {
        const data = await load();
        const parsed = parseTaskKey(key.trim().toUpperCase());
        const t = parsed && data.tasks.find((task) => task.key === `${parsed.prefix}-${parsed.number}`);
        if (!t) throw new Error(`No issue ${key.trim().toUpperCase()} in this team.`);
        const comments = await repos.comments.listForTask(t.id);
        const name = (c: (typeof comments)[number]) =>
          c.author.kind === "user"
            ? (data.members.find((m) => m.id === (c.author as { userId: string }).userId)?.name ?? "Former member")
            : `${data.agents.find((a) => a.id === (c.author as { agentId: string }).agentId)?.name ?? "AI teammate"} (AI teammate)`;
        return {
          ...describe(data, t),
          description: t.description.slice(0, 4000),
          parentKey: data.tasks.find((p) => p.id === t.parentId)?.key ?? null,
          subtasks: data.tasks.filter((s) => s.parentId === t.id).map((s) => ({ key: s.key, title: s.title, state: stateOf(data, s) })),
          comments: comments.slice(-10).map((c) => ({ author: name(c), date: c.createdAt.slice(0, 10), body: c.body.slice(0, 1500) })),
        };
      },
    }),

    team_overview: tool({
      description:
        "Team-wide numbers: issues per board and state, open issues per person (with urgent/high and overdue counts), and totals for open, overdue, unassigned and urgent/high.",
      inputSchema: z.object({}),
      execute: async () => {
        const data = await load();
        const open = data.tasks.filter((t) => !isResolved(stateOf(data, t)));
        const hot = (t: Task) => t.priority === "urgent" || t.priority === "high";
        const people = new Map<string, { open: number; urgentOrHigh: number; overdue: number }>();
        for (const t of open) {
          const who = assigneeName(data, t) ?? "Unassigned";
          const row = people.get(who) ?? { open: 0, urgentOrHigh: 0, overdue: 0 };
          row.open += 1;
          if (hot(t)) row.urgentOrHigh += 1;
          if (isOverdue(data, t)) row.overdue += 1;
          people.set(who, row);
        }
        return {
          today: ctx.today,
          ...(data.truncated && { note: `Only the ${TEAM_TASKS_LIMIT} most recently updated issues were counted.` }),
          totals: {
            issues: data.tasks.length,
            open: open.length,
            overdue: open.filter((t) => isOverdue(data, t)).length,
            unassigned: open.filter((t) => t.assignee === null).length,
            urgentOrHigh: open.filter(hot).length,
          },
          boards: data.boards.map((b) => ({
            board: b.name,
            columns: data.columns
              .filter((c) => c.boardId === b.id)
              .map((c) => ({ column: c.name, state: statusOf(c.name), issues: data.tasks.filter((t) => t.columnId === c.id).length })),
          })),
          openByAssignee: [...people.entries()]
            .map(([assignee, counts]) => ({ assignee, ...counts }))
            .sort((a, b) => b.open - a.open),
        };
      },
    }),
  };
}
