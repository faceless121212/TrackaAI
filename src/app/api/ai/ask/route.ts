import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
  toUIMessageStream,
  validateUIMessages,
} from "ai";
import { z } from "zod";
import { slugSchema } from "@/lib/domain";
import { askInstructions } from "@/server/ai/ask/instructions";
import { createAskTools } from "@/server/ai/ask/tools";
import { parseChatRequest } from "@/server/ai/copilot/request";
import { askModel } from "@/server/ai/model";
import { aiError, recordTokensAfter, reserveRun, signedOut } from "@/server/ai/respond";
import { requireTeamMember } from "@/server/auth/guards";
import { getCurrentUser } from "@/server/auth/session";
import { getRepositories } from "@/server/data";

export const maxDuration = 60;

/**
 * "Ask AI": a read-only chat about every issue in the team. Each message is one
 * metered AI run; the tools only read, with the caller's permissions.
 */
export async function POST(request: Request) {
  if (!(await getCurrentUser())) return signedOut();
  const parsed = parseChatRequest(await request.text(), z.object({ teamSlug: slugSchema }));
  if (!parsed.ok) return aiError(parsed.error, parsed.status);
  const { user, team, membership } = await requireTeamMember(parsed.teamSlug);

  const repos = getRepositories();
  const today = new Date().toISOString().slice(0, 10);
  const tools = createAskTools({ repos, teamId: team.id, teamSlug: team.slug, userId: user.id, today });
  let messages;
  try {
    messages = await validateUIMessages({ messages: parsed.messages, tools });
  } catch {
    return aiError("This conversation can't be continued. Start a new one.", 400);
  }

  const { model, modelId } = askModel();
  const run = await reserveRun({ team, userId: user.id, role: membership.role, feature: "ask", modelId });
  if (run instanceof Response) return run;

  const [workspaces, members] = await Promise.all([
    repos.workspaces.listWithBoards(team.id),
    repos.memberships.listMembers(team.id),
  ]);
  const result = streamText({
    model,
    instructions: askInstructions({
      teamName: team.name,
      boards: workspaces.flatMap((w) => w.boards),
      members: members.map((m) => m.user),
      userName: user.name,
      today,
    }),
    messages: await convertToModelMessages(messages, { ignoreIncompleteToolCalls: true }),
    tools,
    stopWhen: isStepCount(6),
    maxOutputTokens: 2000,
    onError: ({ error }) => console.error("[ai] ask failed", error),
  });
  recordTokensAfter(run.id, async () => {
    const usage = await result.totalUsage;
    return { inputTokens: usage.inputTokens ?? 0, outputTokens: usage.outputTokens ?? 0 };
  });
  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      onError: () => "Ask AI ran into a problem. Please try again.",
    }),
  });
}
