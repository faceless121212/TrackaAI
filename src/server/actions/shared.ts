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
