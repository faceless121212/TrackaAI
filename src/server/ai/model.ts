import "server-only";
import { anthropic } from "@ai-sdk/anthropic";
import type { LanguageModel } from "ai";
import { jsonStreamModel } from "./mock-model";

/** Cheap generation (task writer, breakdown). */
export const GENERATION_MODEL = "claude-haiku-4-5";

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
