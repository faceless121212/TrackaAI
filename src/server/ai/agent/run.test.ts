// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";
import { createTaskInputSchema, type Agent, type Task, type User } from "@/lib/domain";
import { emptyDb } from "@/server/data/mock/db";
import { createMockRepositories } from "@/server/data/mock/repositories";
import { createMemoryStore } from "@/server/data/mock/store";
import type { Repositories } from "@/server/data/types";
import { failingModel, textModel } from "../mock-model";
import { agentPrompt, runAgentTask } from "./run";

let repos: Repositories;
let store: ReturnType<typeof createMemoryStore>;
let owner: User;
let task: Task;
let agent: Agent;

beforeEach(async () => {
  store = createMemoryStore(emptyDb());
  repos = createMockRepositories(store);
  ({ user: owner } = await repos.auth.signUp({ name: "Owner", email: "owner@example.test", password: "password1" }));
  const team = await repos.teams.create({ name: "Acme", slug: "acme", ownerId: owner.id });
  await repos.teams.setPlan(team.id, "pro");
  const workspace = await repos.workspaces.create({ teamId: team.id, name: "Eng", keyPrefix: "ENG" });
  const board = await repos.boards.create({ workspaceId: workspace.id, name: "Eng", description: null });
  const [todo] = await repos.boards.listColumns(board.id);
  agent = await repos.agents.create(team.id, { name: "Spec writer", specialty: "Writes specs", createdBy: owner.id });
  task = await repos.tasks.create({
    ...createTaskInputSchema.parse({
      boardId: board.id,
      columnId: todo.id,
      title: "CSV export",
      description: "Let users export the board.",
      assignee: { kind: "agent", agentId: agent.id },
    }),
    createdBy: owner.id,
  });
  await repos.comments.create({ taskId: task.id, body: "Include labels please", author: { kind: "user", userId: owner.id } });
});

describe("runAgentTask", () => {
  it("posts the result as the agent, hands the task to In Review and logs usage", async () => {
    const run = await repos.agentRuns.start(task.id, agent.id, owner.id);
    await runAgentTask({ repos, runId: run.id, userId: owner.id, model: textModel("## Spec\n- Export CSV"), modelId: "mock" });

    const finished = await repos.agentRuns.get(run.id);
    expect(finished).toMatchObject({ status: "succeeded" });
    expect(await repos.comments.get(finished!.commentId!)).toMatchObject({
      author: { kind: "agent", agentId: agent.id },
      body: "## Spec\n- Export CSV",
    });
    const columns = await repos.boards.listColumns(task.boardId);
    expect((await repos.tasks.get(task.id))?.columnId).toBe(columns.find((c) => c.name === "In Review")!.id);
    const usage = await store.read((db) => db.aiUsage);
    expect(usage).toEqual([expect.objectContaining({ feature: "agent", inputTokens: 300, outputTokens: 120 })]);
  });

  it("records a failure with a readable reason and leaves the task where it was", async () => {
    const run = await repos.agentRuns.start(task.id, agent.id, owner.id);
    await runAgentTask({ repos, runId: run.id, userId: owner.id, model: failingModel("overloaded"), modelId: "mock" });
    expect(await repos.agentRuns.get(run.id)).toMatchObject({ status: "failed", error: expect.stringContaining("overloaded") });
    expect((await repos.tasks.get(task.id))?.columnId).toBe(task.columnId);
  });

  it("does nothing for a run that isn't the caller's queued run", async () => {
    const run = await repos.agentRuns.start(task.id, agent.id, owner.id);
    await runAgentTask({ repos, runId: run.id, userId: "someone-else", model: textModel("x"), modelId: "mock" });
    expect(await repos.agentRuns.get(run.id)).toMatchObject({ status: "queued" });
  });

  it("gives the model the task and recent comments, fenced as data", () => {
    const prompt = agentPrompt({
      task: { ...task, key: "ENG-1" },
      column: "Todo",
      labels: ["Feature"],
      comments: [{ author: "Owner", body: "Include labels please" }],
    });
    expect(prompt).toContain("<task>\nENG-1: CSV export");
    expect(prompt).toContain("Status: Todo");
    expect(prompt).toContain("<comments>\nOwner: Include labels please\n</comments>");
  });
});
