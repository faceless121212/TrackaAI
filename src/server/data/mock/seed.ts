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
