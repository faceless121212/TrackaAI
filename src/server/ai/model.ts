import "server-only";
import { anthropic } from "@ai-sdk/anthropic";
import type { LanguageModel } from "ai";
import { mockAskModel } from "./ask/mock-ask-model";
import { mockCopilotModel } from "./copilot/mock-copilot-model";
import { jsonStreamModel, textModel } from "./mock-model";

/** Cheap generation (task writer, breakdown). */
export const GENERATION_MODEL = "claude-haiku-4-5";
/** Conversation with tools (board copilot). */
export const COPILOT_MODEL = "claude-sonnet-5";
/** "Ask AI": team-wide, read-only chat about the team's issues. */
export const ASK_MODEL = "claude-sonnet-5-5";

/** AI_MOCK=1 (e2e, CI) streams canned output instead of calling Anthropic. */
export function aiMocked(): boolean {
  return process.env.AI_MOCK === "1";
}

export function aiAvailable(): boolean {
  return aiMocked() || Boolean(process.env.ANTHROPIC_API_KEY);
}

/** The model for a request; in mock mode it streams `mockOutput()` instead. */
export function generationModel(mockOutput: () => unknown): { model: LanguageModel; modelId: string } {
  if (aiMocked()) return { model: jsonStreamModel(JSON.stringify(mockOutput())), modelId: "mock" };
  return { model: anthropic(GENERATION_MODEL), modelId: GENERATION_MODEL };
}

export function copilotModel(): { model: LanguageModel; modelId: string } {
  if (aiMocked()) return { model: mockCopilotModel(), modelId: "mock" };
  return { model: anthropic(COPILOT_MODEL), modelId: COPILOT_MODEL };
}

export function askModel(): { model: LanguageModel; modelId: string } {
  if (aiMocked()) return { model: mockAskModel(), modelId: "mock" };
  return { model: anthropic(ASK_MODEL), modelId: ASK_MODEL };
}

/** AI teammates write longer deliverables. */
export function agentModel(): { model: LanguageModel; modelId: string } {
  if (aiMocked()) {
    return {
      model: textModel("**Summary:** a first pass from the mock AI teammate.\n\n## Plan\n- Step one\n- Step two"),
      modelId: "mock",
    };
  }
  return { model: anthropic(COPILOT_MODEL), modelId: COPILOT_MODEL };
}
