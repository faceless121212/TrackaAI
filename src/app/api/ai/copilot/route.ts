import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
  toUIMessageStream,
  validateUIMessages,
} from "ai";
import { z } from "zod";
import { PLAN_CATALOG, idSchema } from "@/lib/domain";
import { settingsPath } from "@/lib/paths";
import { toolApprovalSecret } from "@/server/ai/approval-secret";
import { copilotInstructions } from "@/server/ai/copilot/instructions";
import { COPILOT_MUTATIONS, createCopilotTools } from "@/server/ai/copilot/tools";
import { copilotModel } from "@/server/ai/model";
import { aiError, recordTokensAfter, reserveRun, signedOut } from "@/server/ai/respond";
import { requireBoardAccess } from "@/server/auth/guards";
import { can } from "@/server/auth/permissions";
import { getCurrentUser } from "@/server/auth/session";
import { getRepositories } from "@/server/data";

export const maxDuration = 60;

const requestSchema = z.object({
  boardId: idSchema,
  // The client resends the whole chat each turn; keep it bounded.
  messages: z.array(z.unknown()).min(1).max(60),
});

/** The board copilot: chat with tools; every change waits for the user's approval. */
export async function POST(request: Request) {
  if (!(await getCurrentUser())) return signedOut();
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return aiError("Invalid request", 400);
  const { user, team, membership, board } = await requireBoardAccess(parsed.data.boardId);

  if (!PLAN_CATALOG[team.plan].features.copilot) {
    const message = "The board copilot is part of the Pro plan.";
    return can(membership.role, "billing:manage")
      ? aiError(`${message} Upgrade to use it.`, 402, settingsPath(team.slug, "billing"))
      : aiError(`${message} Ask the team owner to upgrade.`, 402);
  }

  const repos = getRepositories();
  const tools = createCopilotTools({ repos, userId: user.id, teamId: team.id, role: membership.role, board });
  let messages;
  try {
    messages = await validateUIMessages({ messages: parsed.data.messages, tools });
  } catch {
    return aiError("This conversation can't be continued. Start a new one.", 400);
  }

  const { model, modelId } = copilotModel();
  const run = await reserveRun({ team, userId: user.id, role: membership.role, feature: "copilot", modelId });
  if (run instanceof Response) return run;

  const [columns, members, labels] = await Promise.all([
    repos.boards.listColumns(board.id),
    repos.memberships.listMembers(team.id),
    repos.labels.listForTeam(team.id),
  ]);
  const result = streamText({
    model,
    instructions: copilotInstructions({
      board,
      columns,
      members: members.map((m) => m.user),
      labels,
      userName: user.name,
      today: new Date().toISOString().slice(0, 10),
    }),
    messages: await convertToModelMessages(messages),
    tools,
    toolApproval: Object.fromEntries(COPILOT_MUTATIONS.map((name) => [name, "user-approval" as const])),
    experimental_toolApprovalSecret: toolApprovalSecret(),
    stopWhen: isStepCount(6),
    maxOutputTokens: 1500,
    onError: ({ error }) => console.error("[ai] copilot failed", error),
  });
  recordTokensAfter(run.id, async () => {
    const usage = await result.totalUsage;
    return { inputTokens: usage.inputTokens ?? 0, outputTokens: usage.outputTokens ?? 0 };
  });
  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      onError: () => "The copilot ran into a problem. Please try again.",
    }),
  });
}
