import "server-only";
import { after } from "next/server";
import { createTextStreamResponse, toTextStream } from "ai";
import type { z } from "zod";
import type { AiFeature, Role, Team } from "@/lib/domain";
import { settingsPath } from "@/lib/paths";
import { can } from "@/server/auth/permissions";
import { assertWithinPlan } from "@/server/billing/limits";
import { PlanLimitError, getRepositories } from "@/server/data";
import { aiAvailable, generationModel } from "./model";
import { finalUsage, streamStructured } from "./stream";

export function aiError(error: string, status: number, upgradeHref?: string) {
  return Response.json({ error, upgradeHref }, { status });
}

/**
 * Runs one metered AI generation for a team and streams the object to
 * useObject. The run is reserved (and the plan's monthly limit enforced,
 * atomically) before the model is called; its tokens are filled in once the
 * stream has finished. Aborted runs still count: the model keeps generating.
 */
export async function streamForTeam<T extends z.ZodType>(options: {
  team: Pick<Team, "id" | "slug" | "plan">;
  userId: string;
  role: Role;
  feature: AiFeature;
  schema: T;
  instructions: string;
  prompt: string;
  /** What the mock model (AI_MOCK=1) streams. */
  mockOutput: () => z.infer<T>;
}): Promise<Response> {
  if (!aiAvailable()) return aiError("AI isn't set up on this server yet.", 503);
  const repos = getRepositories();
  const { model, modelId } = generationModel(options.mockOutput);
  let runId: string;
  try {
    await assertWithinPlan(repos, options.team, "aiRuns");
    runId = await repos.aiUsage.startRun({
      teamId: options.team.id,
      userId: options.userId,
      feature: options.feature,
      model: modelId,
    });
  } catch (error) {
    if (!(error instanceof PlanLimitError)) throw error;
    // Only the owner can upgrade; everyone else is told to ask them.
    return can(options.role, "billing:manage")
      ? aiError(error.message, 402, settingsPath(options.team.slug, "billing"))
      : aiError(`${error.message} Ask the team owner to upgrade.`, 402);
  }

  const result = streamStructured({ model, schema: options.schema, instructions: options.instructions, prompt: options.prompt });
  after(async () => {
    try {
      await repos.aiUsage.finishRun(runId, await finalUsage(result));
    } catch (error) {
      console.error("[ai] run failed or its tokens couldn't be saved", error);
    }
  });
  return createTextStreamResponse({ stream: toTextStream({ stream: result.stream }) });
}

/** For route handlers: a JSON 401 instead of the sign-in redirect pages get. */
export const signedOut = () => aiError("Your session has ended. Sign in again.", 401);
export const forbidden = () => aiError("You can't use AI on this board.", 403);
