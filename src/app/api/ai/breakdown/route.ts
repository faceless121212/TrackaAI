import { breakdownRequestSchema, breakdownSchema, type Breakdown } from "@/lib/domain";
import { BREAKDOWN_INSTRUCTIONS, breakdownPrompt } from "@/server/ai/prompts";
import { aiError, streamForTeam } from "@/server/ai/respond";
import { requireTaskAccess } from "@/server/auth/guards";
import { assertCan } from "@/server/auth/permissions";

export const maxDuration = 30;

/** Streams 3–8 suggested sub-tasks for a task (nothing is created until the user confirms). */
export async function POST(request: Request) {
  const parsed = breakdownRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return aiError("Invalid request", 400);
  const { user, team, membership, task } = await requireTaskAccess(parsed.data.taskId);
  assertCan(membership.role, "task:create");

  return streamForTeam({
    team,
    userId: user.id,
    feature: "breakdown",
    schema: breakdownSchema,
    instructions: BREAKDOWN_INSTRUCTIONS,
    prompt: breakdownPrompt(task),
    mockOutput: (): Breakdown => ({
      subtasks: ["Plan the approach", "Build it", "Test and ship"].map((step) => ({
        title: `${step}: ${task.title}`.slice(0, 80),
        description: "",
      })),
    }),
  });
}
