import { breakdownRequestSchema, breakdownSchema, type Breakdown } from "@/lib/domain";
import { BREAKDOWN_INSTRUCTIONS, breakdownPrompt } from "@/server/ai/prompts";
import { aiError, forbidden, signedOut, streamForTeam } from "@/server/ai/respond";
import { requireTaskAccess } from "@/server/auth/guards";
import { can } from "@/server/auth/permissions";
import { getCurrentUser } from "@/server/auth/session";

export const maxDuration = 30;

/** Streams 3–8 suggested sub-tasks for a task (nothing is created until the user confirms). */
export async function POST(request: Request) {
  if (!(await getCurrentUser())) return signedOut();
  const parsed = breakdownRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return aiError("Invalid request", 400);
  const { user, team, membership, task } = await requireTaskAccess(parsed.data.taskId);
  if (!can(membership.role, "task:create")) return forbidden();

  return streamForTeam({
    team,
    userId: user.id,
    role: membership.role,
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
