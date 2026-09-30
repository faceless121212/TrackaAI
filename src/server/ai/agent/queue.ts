import "server-only";
import { after } from "next/server";
import { PLAN_CATALOG, type AgentRun, type Team } from "@/lib/domain";
import { ConflictError, getRepositories } from "@/server/data";
import { agentModel, aiAvailable } from "../model";
import { runAgentTask } from "./run";

export const AGENTS_NEED_PRO = "AI teammates are part of the Pro plan.";

/** Throws ConflictError unless the team can use AI teammates right now. */
export function assertAgentsAvailable(team: Pick<Team, "plan">) {
  if (!PLAN_CATALOG[team.plan].features.aiTeammate) throw new ConflictError("plan", AGENTS_NEED_PRO);
  if (!aiAvailable()) throw new ConflictError("agent", "AI isn't set up on this server yet.");
}

/**
 * Queues a run of `agentId` on `taskId` and works on it after the response is
 * sent, with the requesting member's session. (A job queue can replace after().)
 */
export async function queueAgentRun(taskId: string, agentId: string, userId: string): Promise<AgentRun> {
  const run = await getRepositories().agentRuns.start(taskId, agentId, userId);
  after(() => runAgentTask({ repos: getRepositories(), runId: run.id, userId, ...agentModel() }));
  return run;
}
