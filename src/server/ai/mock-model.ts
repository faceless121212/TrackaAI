import { simulateReadableStream, type LanguageModel } from "ai";
import { MockLanguageModelV4 } from "ai/test";

/** A model that streams `json` in a few chunks, for e2e runs (AI_MOCK=1) and tests. */
export function jsonStreamModel(json: string, usage = { input: 100, output: 50 }): LanguageModel {
  const size = Math.ceil(json.length / 4);
  const deltas = Array.from({ length: Math.ceil(json.length / size) }, (_, i) => json.slice(i * size, (i + 1) * size));
  return new MockLanguageModelV4({
    doStream: async () => ({
      stream: simulateReadableStream({
        chunkDelayInMs: 30,
        chunks: [
          { type: "text-start", id: "t" },
          ...deltas.map((delta) => ({ type: "text-delta" as const, id: "t", delta })),
          { type: "text-end", id: "t" },
          {
            type: "finish",
            finishReason: { unified: "stop", raw: undefined },
            logprobs: undefined,
            usage: {
              inputTokens: { total: usage.input, noCache: usage.input, cacheRead: undefined, cacheWrite: undefined },
              outputTokens: { total: usage.output, text: usage.output, reasoning: undefined },
            },
          },
        ],
      }),
    }),
  });
}

/** A model that answers `text` in one go (generateText), for e2e runs and tests. */
export function textModel(text: string, usage = { input: 300, output: 120 }): LanguageModel {
  return new MockLanguageModelV4({
    doGenerate: async () => ({
      content: [{ type: "text", text }],
      finishReason: { unified: "stop", raw: undefined },
      usage: {
        inputTokens: { total: usage.input, noCache: usage.input, cacheRead: undefined, cacheWrite: undefined },
        outputTokens: { total: usage.output, text: usage.output, reasoning: undefined },
      },
      warnings: [],
    }),
  });
}

/** A model whose every call fails, for testing error paths. */
export function failingModel(message: string): LanguageModel {
  return new MockLanguageModelV4({
    doGenerate: async () => {
      throw new Error(message);
    },
  });
}
