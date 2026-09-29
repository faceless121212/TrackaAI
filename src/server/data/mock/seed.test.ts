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
