import type { LanguageModelV4StreamPart } from "@ai-sdk/provider";
import { simulateReadableStream, type LanguageModel } from "ai";
import { MockLanguageModelV4 } from "ai/test";

const usage = {
  inputTokens: { total: 300, noCache: 300, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 60, text: 60, reasoning: undefined },
};

type Prompt = { role: string; content: string | { type: string; text?: string; output?: unknown }[] }[];
type Found = { issues?: { key: string; title: string; url: string; priority: string }[] };

/**
 * A scripted "Ask AI" for e2e runs (AI_MOCK=1): a message mentioning "urgent"
 * calls search_issues for open urgent/high issues, then lists them as links;
 * anything else gets a canned reply.
 */
export function mockAskModel(): LanguageModel {
  return new MockLanguageModelV4({
    doStream: async ({ prompt }) => {
      const messages = prompt as unknown as Prompt;
      const last = messages.at(-1);
      const lastUser = [...messages].reverse().find((m) => m.role === "user");
      const userText = Array.isArray(lastUser?.content)
        ? lastUser.content.map((p) => p.text ?? "").join(" ")
        : (lastUser?.content ?? "");

      const text = (value: string): LanguageModelV4StreamPart[] => [
        { type: "text-start", id: "t" },
        { type: "text-delta", id: "t", delta: value },
        { type: "text-end", id: "t" },
      ];
      let chunks: LanguageModelV4StreamPart[];
      if (last?.role === "tool") {
        const part = Array.isArray(last.content) ? last.content[0] : undefined;
        const output = (part?.output as { value?: Found } | undefined)?.value ?? {};
        const lines = (output.issues ?? []).map((i) => `- [${i.key} ${i.title}](${i.url}) (${i.priority})`);
        chunks = [...text(lines.length ? `Most urgent open issues:\n\n${lines.join("\n")}` : "Nothing urgent right now."), finish("stop")];
      } else if (/urgent/i.test(userText)) {
        chunks = [
          {
            type: "tool-call",
            toolCallId: "call-urgent",
            toolName: "search_issues",
            input: JSON.stringify({ state: "open", priority: ["urgent", "high"] }),
          },
          finish("tool-calls"),
        ];
      } else {
        chunks = [...text('This is the mock Ask AI. Try "What\'s urgent?".'), finish("stop")];
      }
      return { stream: simulateReadableStream({ chunks, chunkDelayInMs: 20 }) };
    },
  });
}

function finish(reason: "stop" | "tool-calls"): LanguageModelV4StreamPart {
  return { type: "finish", finishReason: { unified: reason, raw: undefined }, usage };
}
