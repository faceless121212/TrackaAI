import type { LanguageModelV4StreamPart } from "@ai-sdk/provider";
import { simulateReadableStream, type LanguageModel } from "ai";
import { MockLanguageModelV4 } from "ai/test";

const usage = {
  inputTokens: { total: 200, noCache: 200, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 40, text: 40, reasoning: undefined },
};

type Prompt = { role: string; content: string | { type: string; text?: string }[] }[];

/**
 * A scripted copilot for e2e runs (AI_MOCK=1): "move ENG-1 to Done" calls
 * move_task; after a tool result it confirms; anything else gets a canned reply.
 */
export function mockCopilotModel(): LanguageModel {
  return new MockLanguageModelV4({
    doStream: async ({ prompt }) => {
      const messages = prompt as unknown as Prompt;
      const last = messages.at(-1);
      const lastUser = [...messages].reverse().find((m) => m.role === "user");
      const userText = Array.isArray(lastUser?.content)
        ? lastUser.content.map((p) => p.text ?? "").join(" ")
        : (lastUser?.content ?? "");
      const move = /move (\w+-\d+) to (.+)/i.exec(userText);

      const text = (value: string): LanguageModelV4StreamPart[] => [
        { type: "text-start" as const, id: "t" },
        { type: "text-delta" as const, id: "t", delta: value },
        { type: "text-end" as const, id: "t" },
      ];
      const chunks: LanguageModelV4StreamPart[] =
        last?.role === "tool"
          ? [...text("Done."), finish("stop")]
          : move
            ? [
                {
                  type: "tool-call" as const,
                  toolCallId: `call-${move[1]}`,
                  toolName: "move_task",
                  input: JSON.stringify({ key: move[1], column: move[2].trim() }),
                },
                finish("tool-calls"),
              ]
            : [...text("This is the mock copilot. Ask me to move a task, e.g. \"move ENG-1 to Done\"."), finish("stop")];
      return { stream: simulateReadableStream({ chunks, chunkDelayInMs: 20 }) };
    },
  });
}

function finish(reason: "stop" | "tool-calls"): LanguageModelV4StreamPart {
  return { type: "finish", finishReason: { unified: reason, raw: undefined }, usage };
}
