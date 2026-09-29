import { taskDraftSchema, taskWriterRequestSchema, type TaskDraft } from "@/lib/domain";
import { TASK_WRITER_INSTRUCTIONS, taskWriterPrompt } from "@/server/ai/prompts";
import { aiError, streamForTeam } from "@/server/ai/respond";
import { requireBoardAccess } from "@/server/auth/guards";
import { assertCan } from "@/server/auth/permissions";
import { getRepositories } from "@/server/data";

export const maxDuration = 30;

/** Streams a task draft (title, description, priority, labels) from a one-liner. */
export async function POST(request: Request) {
  const parsed = taskWriterRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return aiError(parsed.error.issues[0]?.message ?? "Invalid request", 400);
  const { user, team, membership, board } = await requireBoardAccess(parsed.data.boardId);
  assertCan(membership.role, "task:create");
  const labels = await getRepositories().labels.listForTeam(team.id);

  return streamForTeam({
    team,
    userId: user.id,
    feature: "task_writer",
    schema: taskDraftSchema,
    instructions: TASK_WRITER_INSTRUCTIONS,
    prompt: taskWriterPrompt({ request: parsed.data.prompt, boardName: board.name, labels }),
    mockOutput: (): TaskDraft => ({
      title: `Draft: ${parsed.data.prompt}`.slice(0, 80),
      description: `Written by the mock model.\n\n## Acceptance criteria\n- [ ] ${parsed.data.prompt}\n- [ ] Tested`,
      priority: "high",
      labels: labels.slice(0, 1).map((label) => label.name),
    }),
  });
}
