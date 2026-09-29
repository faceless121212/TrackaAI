import { taskDraftSchema, taskWriterRequestSchema, type TaskDraft } from "@/lib/domain";
import { TASK_WRITER_INSTRUCTIONS, taskWriterPrompt } from "@/server/ai/prompts";
import { aiError, forbidden, signedOut, streamForTeam } from "@/server/ai/respond";
import { requireBoardAccess } from "@/server/auth/guards";
import { can } from "@/server/auth/permissions";
import { getCurrentUser } from "@/server/auth/session";
import { getRepositories } from "@/server/data";

export const maxDuration = 30;

/** Streams a task draft (title, description, priority, labels) from a one-liner. */
export async function POST(request: Request) {
  if (!(await getCurrentUser())) return signedOut();
  const parsed = taskWriterRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return aiError(parsed.error.issues[0]?.message ?? "Invalid request", 400);
  const { user, team, membership, board } = await requireBoardAccess(parsed.data.boardId);
  if (!can(membership.role, "task:create")) return forbidden();
  const labels = await getRepositories().labels.listForTeam(team.id);

  return streamForTeam({
    team,
    userId: user.id,
    role: membership.role,
    feature: "task_writer",
    schema: taskDraftSchema,
    instructions: TASK_WRITER_INSTRUCTIONS,
    prompt: taskWriterPrompt({ request: parsed.data.prompt, boardName: board.name, labels }),
    // In mock mode, the request "invalid" streams a broken draft (e2e covers the failure path).
    mockOutput: (): TaskDraft =>
      parsed.data.prompt === "invalid"
        ? ({ title: "Half a dr" } as TaskDraft)
        : {
            title: `Draft: ${parsed.data.prompt}`.slice(0, 80),
            description: `Written by the mock model.\n\n## Acceptance criteria\n- [ ] ${parsed.data.prompt}\n- [ ] Tested`,
            priority: "high",
            labels: labels.slice(0, 1).map((label) => label.name),
          },
  });
}
