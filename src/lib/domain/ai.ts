import { z } from "zod";
import { PRIORITIES, idSchema, type Label } from "./schemas";

// Shapes the AI features stream. Shared by the route handlers (server) and
// useObject (client), so both validate the same thing.

export const AI_FEATURES = ["task_writer", "breakdown"] as const;
export type AiFeature = (typeof AI_FEATURES)[number];

export const taskDraftSchema = z.object({
  title: z.string().describe("A short, specific task title in the imperative, at most 80 characters."),
  description: z
    .string()
    .describe("Markdown: one or two sentences of context, then '## Acceptance criteria' with 2-5 checklist items."),
  priority: z.enum(PRIORITIES).describe("How urgent the task is; 'none' if the request gives no hint."),
  labels: z.array(z.string()).describe("Names of fitting labels, chosen only from the team's labels."),
});
export type TaskDraft = z.infer<typeof taskDraftSchema>;

export const breakdownSchema = z.object({
  subtasks: z
    .array(
      z.object({
        title: z.string().describe("A concrete, independently finishable step, at most 80 characters."),
        description: z.string().describe("One sentence on what done looks like, or an empty string."),
      }),
    )
    .min(3)
    .max(8),
});
export type Breakdown = z.infer<typeof breakdownSchema>;

const promptSchema = z.string().trim().min(1, "Describe the task in a few words").max(500);

export const taskWriterRequestSchema = z.object({ boardId: idSchema, prompt: promptSchema });
export const breakdownRequestSchema = z.object({ taskId: idSchema });

/** The team's label ids for the names the model suggested (unknown names are dropped). */
export function matchLabelIds(names: readonly (string | undefined)[] | undefined, labels: Label[]): string[] {
  const byName = new Map(labels.map((label) => [label.name.toLowerCase(), label.id]));
  const ids = (names ?? []).flatMap((name) => byName.get(name?.trim().toLowerCase() ?? "") ?? []);
  return [...new Set(ids)];
}
