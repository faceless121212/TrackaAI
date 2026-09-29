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

  const { user } = await repos.auth.signUp(DEMO_USER);
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
