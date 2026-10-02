import { createTaskInputSchema, type Priority } from "@/lib/domain";
import { emptyDb, type MockDb } from "./db";
import { createMockRepositories } from "./repositories";
import { DEMO_USER } from "./seed";
import { createMemoryStore } from "./store";

// A fuller "Acme" team for the marketing screenshot (MOCK_SEED=showcase,
// `pnpm screenshot`): several people, an AI teammate, and a board that looks
// like a real week of work. The dev/e2e seed (./seed.ts) stays small.

const PEOPLE = [
  { name: "Maya Chen", email: "maya@acme.test" },
  { name: "Leo Park", email: "leo@acme.test" },
  { name: "Sara Ali", email: "sara@acme.test" },
] as const;

type Who = "demo" | 0 | 1 | 2 | "agent" | null;
const TASKS: { column: number; title: string; priority: Priority; labels?: string[]; who: Who; dueIn?: number }[] = [
  { column: 0, title: "Audit onboarding emails", priority: "low", labels: ["Docs"], who: null },
  { column: 0, title: "Evaluate feature-flag providers", priority: "none", labels: ["Improvement"], who: 2 },
  { column: 0, title: "Dark mode for the mobile app", priority: "medium", labels: ["Feature"], who: null },
  { column: 1, title: "SSO with Okta and Google Workspace", priority: "high", labels: ["Feature"], who: 0, dueIn: 6 },
  { column: 1, title: "Rate-limit the public API", priority: "medium", labels: ["Improvement"], who: 1, dueIn: 9 },
  { column: 1, title: "Write the Q4 roadmap spec", priority: "medium", labels: ["Docs"], who: "agent", dueIn: 4 },
  { column: 2, title: "Realtime presence on boards", priority: "high", labels: ["Feature"], who: "demo", dueIn: 3 },
  { column: 2, title: "Fix timezone drift in due dates", priority: "urgent", labels: ["Bug"], who: 1, dueIn: 1 },
  { column: 2, title: "Usage-based billing dashboard", priority: "medium", labels: ["Feature"], who: 2, dueIn: 8 },
  { column: 3, title: "Keyboard shortcuts cheat sheet", priority: "low", labels: ["Docs", "Improvement"], who: 0 },
  { column: 3, title: "Search across every workspace", priority: "high", labels: ["Feature"], who: "demo", dueIn: 2 },
  { column: 4, title: "Command palette", priority: "medium", labels: ["Feature"], who: 0 },
  { column: 4, title: "Crash on empty board export", priority: "urgent", labels: ["Bug"], who: 1 },
  { column: 4, title: "Faster board loading", priority: "high", labels: ["Improvement"], who: 2 },
];

const daysFromNow = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

export async function seedShowcaseDb(): Promise<MockDb> {
  const store = createMemoryStore(emptyDb());
  const repos = createMockRepositories(store);

  const { user } = await repos.auth.signUp({ ...DEMO_USER, name: "Alex Rivera" });
  const team = await repos.teams.create({ name: "Acme", slug: "acme", ownerId: user.id });
  await repos.teams.setPlan(team.id, "pro");
  const invites = await repos.invites.create({ teamId: team.id, emails: PEOPLE.map((p) => p.email), invitedBy: user.id });
  const people = [];
  for (const [i, person] of PEOPLE.entries()) {
    const { user: member } = await repos.auth.signUp({ ...person, password: "showcase-password" });
    await repos.invites.accept(invites[i].token, member.id);
    people.push(member);
  }
  const agent = await repos.agents.create(team.id, { name: "Spec writer", specialty: "Turns ideas into specs", createdBy: user.id });

  const workspace = await repos.workspaces.create({ teamId: team.id, name: "Product", keyPrefix: "ENG" });
  const board = await repos.boards.create({ workspaceId: workspace.id, name: "Engineering", description: null });
  await repos.boards.create({ workspaceId: workspace.id, name: "Launch plan", description: null });
  const design = await repos.workspaces.create({ teamId: team.id, name: "Design", keyPrefix: "DES" });
  await repos.boards.create({ workspaceId: design.id, name: "Brand refresh", description: null });
  const columns = await repos.boards.listColumns(board.id);
  const labels = await repos.labels.listForTeam(team.id);

  for (const task of TASKS) {
    const assignee =
      task.who === null
        ? null
        : task.who === "agent"
          ? ({ kind: "agent", agentId: agent.id } as const)
          : ({ kind: "user", userId: task.who === "demo" ? user.id : people[task.who].id } as const);
    await repos.tasks.create({
      ...createTaskInputSchema.parse({
        boardId: board.id,
        columnId: columns[task.column].id,
        title: task.title,
        priority: task.priority,
        dueDate: task.dueIn === undefined ? null : daysFromNow(task.dueIn),
        labelIds: labels.filter((l) => task.labels?.includes(l.name)).map((l) => l.id),
        assignee,
      }),
      createdBy: user.id,
    });
  }

  return store.snapshot();
}
