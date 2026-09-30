"use server";

import { refresh } from "next/cache";
import { agentInputSchema } from "@/lib/domain";
import { formValues, type ActionResult, type FormState } from "@/lib/forms";
import { assertAgentsAvailable, queueAgentRun } from "@/server/ai/agent/queue";
import { requireTaskAccess, requireTeamMember } from "@/server/auth/guards";
import { assertCan } from "@/server/auth/permissions";
import { getRepositories } from "@/server/data";
import { conflictToFormState, toActionError, zodToFormState } from "./shared";

async function requireAgentManager(teamSlug: string) {
  const access = await requireTeamMember(teamSlug);
  assertCan(access.membership.role, "agent:manage");
  return access;
}

export async function createAgentAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData, ["teamSlug", "name", "specialty"]);
  const { user, team, membership } = await requireAgentManager(values.teamSlug);
  const parsed = agentInputSchema.safeParse(values);
  if (!parsed.success) return zodToFormState(parsed.error, values);
  try {
    assertAgentsAvailable(team);
    await getRepositories().agents.create(team.id, { ...parsed.data, createdBy: user.id });
  } catch (error) {
    return conflictToFormState(error, values, { slug: team.slug, role: membership.role });
  }
  refresh();
  return { ok: true };
}

export async function updateAgentAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData, ["teamSlug", "agentId", "name", "specialty"]);
  const { team } = await requireAgentManager(values.teamSlug);
  const parsed = agentInputSchema.safeParse(values);
  if (!parsed.success) return zodToFormState(parsed.error, values);
  const repos = getRepositories();
  const agent = await repos.agents.get(values.agentId);
  if (!agent || agent.teamId !== team.id) return { formError: "This AI teammate no longer exists.", values };
  try {
    await repos.agents.update(agent.id, parsed.data);
  } catch (error) {
    return conflictToFormState(error, values);
  }
  refresh();
  return { ok: true };
}

export async function deleteAgentAction(teamSlug: string, agentId: string): Promise<ActionResult> {
  try {
    const { team } = await requireAgentManager(teamSlug);
    const repos = getRepositories();
    const agent = await repos.agents.get(agentId);
    if (!agent || agent.teamId !== team.id) return { ok: false, error: "This AI teammate no longer exists." };
    await repos.agents.delete(agentId);
  } catch (error) {
    return toActionError(error);
  }
  refresh();
  return { ok: true };
}

/** Runs the task's assigned AI teammate again (after a failure, or for a fresh take). */
export async function retryAgentRunAction(taskId: string): Promise<ActionResult> {
  try {
    const { user, team, membership, task } = await requireTaskAccess(taskId);
    assertCan(membership.role, "task:update");
    if (task.assignee?.kind !== "agent") return { ok: false, error: "Assign an AI teammate first." };
    assertAgentsAvailable(team);
    await queueAgentRun(task.id, task.assignee.agentId, user.id);
  } catch (error) {
    return toActionError(error);
  }
  refresh();
  return { ok: true };
}
