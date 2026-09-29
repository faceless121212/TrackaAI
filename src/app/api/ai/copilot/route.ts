import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
  toUIMessageStream,
  validateUIMessages,
} from "ai";
import { PLAN_CATALOG } from "@/lib/domain";
import { settingsPath } from "@/lib/paths";
import { toolApprovalSecret } from "@/server/ai/approval-secret";
import { copilotInstructions } from "@/server/ai/copilot/instructions";
import { parseCopilotRequest } from "@/server/ai/copilot/request";
import { COPILOT_MUTATIONS, createCopilotTools } from "@/server/ai/copilot/tools";
import { copilotModel } from "@/server/ai/model";
import { aiError, recordTokensAfter, reserveRun, signedOut } from "@/server/ai/respond";
import { requireBoardAccess } from "@/server/auth/guards";
import { can } from "@/server/auth/permissions";
import { getCurrentUser } from "@/server/auth/session";
import { getRepositories } from "@/server/data";

export const maxDuration = 60;

/** The board copilot: chat with tools; every change waits for the user's approval. */
export async function POST(request: Request) {
  if (!(await getCurrentUser())) return signedOut();
  const parsed = parseCopilotRequest(await request.text());
  if (!parsed.ok) return aiError(parsed.error, parsed.status);
  const secret = toolApprovalSecret();
  if (!secret) return aiError("The copilot isn't set up on this server yet.", 503);
  const { user, team, membership, board } = await requireBoardAccess(parsed.boardId);

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
    messages = await validateUIMessages({ messages: parsed.messages, tools });
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
    // A card left unanswered (or a stopped step) must not wedge the chat.
    messages: await convertToModelMessages(messages, { ignoreIncompleteToolCalls: true }),
    tools,
    // Only offer changes the caller is allowed to make.
    activeTools: (Object.keys(tools) as (keyof typeof tools)[]).filter((name) => {
      if (name === "create_task") return can(membership.role, "task:create");
      return (COPILOT_MUTATIONS as readonly string[]).includes(name) ? can(membership.role, "task:update") : true;
    }),
    toolApproval: Object.fromEntries(COPILOT_MUTATIONS.map((name) => [name, "user-approval" as const])),
    experimental_toolApprovalSecret: secret,
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
