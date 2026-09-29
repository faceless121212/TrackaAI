import "server-only";
import { after } from "next/server";
import { createTextStreamResponse, toTextStream } from "ai";
import type { z } from "zod";
import type { AiFeature, Team } from "@/lib/domain";
import { settingsPath } from "@/lib/paths";
import { assertWithinPlan } from "@/server/billing/limits";
import { PlanLimitError, getRepositories } from "@/server/data";
import { aiAvailable, generationModel } from "./model";
import { finalUsage, streamStructured } from "./stream";

export function aiError(error: string, status: number, upgradeHref?: string) {
  return Response.json({ error, upgradeHref }, { status });
}

/**
 * Runs one metered AI generation for a team and streams the object to
 * useObject. Checks the plan's monthly AI runs first and logs the run (with
 * tokens) to ai_usage once the stream has finished.
 */
export async function streamForTeam<T extends z.ZodType>(options: {
  team: Pick<Team, "id" | "slug" | "plan">;
  userId: string;
  feature: AiFeature;
  schema: T;
  instructions: string;
  prompt: string;
  /** What the mock model (AI_MOCK=1) streams. */
  mockOutput: () => z.infer<T>;
}): Promise<Response> {
  if (!aiAvailable()) return aiError("AI isn't set up on this server yet.", 503);
  const repos = getRepositories();
  try {
    await assertWithinPlan(repos, options.team, "aiRuns");
  } catch (error) {
    if (error instanceof PlanLimitError) return aiError(error.message, 402, settingsPath(options.team.slug, "billing"));
    throw error;
  }

  const { model, modelId } = generationModel(options.mockOutput);
  const result = streamStructured({ model, schema: options.schema, instructions: options.instructions, prompt: options.prompt });
  after(async () => {
    try {
      const usage = await finalUsage(result);
      await repos.aiUsage.record({ teamId: options.team.id, userId: options.userId, feature: options.feature, model: modelId, ...usage });
    } catch (error) {
      console.error("[ai] couldn't record usage", error);
    }
  });
  return createTextStreamResponse({ stream: toTextStream({ stream: result.stream }) });
}
