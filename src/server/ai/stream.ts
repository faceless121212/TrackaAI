import { Output, streamText, type LanguageModel } from "ai";
import type { z } from "zod";

export type TokenUsage = { inputTokens: number; outputTokens: number };

/** Streams an object matching `schema`. Stream errors are logged; the client sees a failed stream. */
export function streamStructured<T extends z.ZodType>(options: {
  model: LanguageModel;
  schema: T;
  instructions: string;
  prompt: string;
}) {
  return streamText({
    model: options.model,
    output: Output.object({ schema: options.schema }),
    instructions: options.instructions,
    prompt: options.prompt,
    maxOutputTokens: 2000,
    onError: ({ error }) => console.error("[ai] stream failed", error),
  });
}

/** Token counts once the stream has finished. */
export async function finalUsage(result: ReturnType<typeof streamStructured>): Promise<TokenUsage> {
  const usage = await result.totalUsage;
  return { inputTokens: usage.inputTokens ?? 0, outputTokens: usage.outputTokens ?? 0 };
}
