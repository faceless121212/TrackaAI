import "server-only";
import { after } from "next/server";
import { createTextStreamResponse, toTextStream } from "ai";
import type { z } from "zod";
import type { AiFeature, Role, Team } from "@/lib/domain";
import { settingsPath } from "@/lib/paths";
import { can } from "@/server/auth/permissions";
import { assertWithinPlan } from "@/server/billing/limits";
import { PlanLimitError, RateLimitError, getRepositories } from "@/server/data";
import { aiAvailable, generationModel } from "./model";
import { finalUsage, streamStructured, type TokenUsage } from "./stream";

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
  const { model, modelId } = generationModel(options.mockOutput);
  const run = await reserveRun({ ...options, modelId });
  if (run instanceof Response) return run;

  const result = streamStructured({ model, schema: options.schema, instructions: options.instructions, prompt: options.prompt });
  recordTokensAfter(run.id, () => finalUsage(result));
  return createTextStreamResponse({ stream: toTextStream({ stream: result.stream }) });
}

type RunOptions = { team: Pick<Team, "id" | "slug" | "plan">; userId: string; role: Role; feature: AiFeature; modelId: string };

/**
 * Reserves one AI run (enforcing the plan's monthly limit atomically), or
 * returns the error response: 503 without a key, 429 when the user is over the
 * per-minute burst limit, 402 at the monthly limit (with the upgrade link for
 * the owner; everyone else is told to ask them).
 */
export async function reserveRun(options: RunOptions): Promise<{ id: string } | Response> {
  if (!aiAvailable()) return aiError("AI isn't set up on this server yet.", 503);
  const repos = getRepositories();
  try {
    await assertWithinPlan(repos, options.team, "aiRuns");
    const id = await repos.aiUsage.startRun({
      teamId: options.team.id,
      userId: options.userId,
      feature: options.feature,
      model: options.modelId,
    });
    return { id };
  } catch (error) {
    if (error instanceof RateLimitError) {
      const response = aiError(error.message, 429);
      response.headers.set("Retry-After", String(error.retryAfter));
      return response;
    }
    if (!(error instanceof PlanLimitError)) throw error;
    return can(options.role, "billing:manage")
      ? aiError(error.message, 402, settingsPath(options.team.slug, "billing"))
      : aiError(`${error.message} Ask the team owner to upgrade.`, 402);
  }
}

/** Fills in the run's tokens once the response has finished. */
export function recordTokensAfter(runId: string, usage: () => Promise<TokenUsage>) {
  after(async () => {
    try {
      await getRepositories().aiUsage.finishRun(runId, await usage());
    } catch (error) {
      console.error("[ai] run failed or its tokens couldn't be saved", error);
    }
  });
}

/** For route handlers: a JSON 401 instead of the sign-in redirect pages get. */
export const signedOut = () => aiError("Your session has ended. Sign in again.", 401);
export const forbidden = () => aiError("You can't use AI on this board.", 403);
