import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BoardView } from "@/components/board/board-view";
import type { CopilotAccess } from "@/components/board/copilot-panel";
import { PLAN_CATALOG, type Role, type Team } from "@/lib/domain";
import { settingsPath } from "@/lib/paths";
import { requireTeamMember } from "@/server/auth/guards";
import { requireUserId } from "@/server/auth/session";
import { can } from "@/server/auth/permissions";
import { approvalSecretConfigured } from "@/server/ai/approval-secret";
import { aiAvailable } from "@/server/ai/model";
import { supabaseConfig } from "@/lib/supabase/config";
import { getRepositories } from "@/server/data";
import { resolveDataBackend } from "@/server/data/backend";

export const metadata: Metadata = { title: "Board" };
// Server actions from this page may keep working after the response: an AI
// teammate run (after()) needs up to about a minute.
export const maxDuration = 120;

export default async function BoardPage({ params, searchParams }: PageProps<"/[team]/board/[boardId]">) {
  const [{ team: teamSlug, boardId }, { task: taskKey }] = await Promise.all([params, searchParams]);
  const userId = await requireUserId();
  const repos = getRepositories();
  // Two rounds of parallel reads. RLS limits everything to the caller's teams;
  // the access check ties the board in the URL to this team.
  const [{ user, team, membership }, access, columns, tasks] = await Promise.all([
    requireTeamMember(teamSlug),
    repos.access.board(boardId, userId),
    repos.boards.listColumns(boardId),
    repos.tasks.listForBoard(boardId),
  ]);
  if (!access || access.team.id !== team.id) notFound();
  const { board, workspace } = access;

  // ?task=ENG-12 opens the task sheet (PRD §5.3).
  const openTask =
    typeof taskKey === "string" ? (tasks.find((task) => task.key === taskKey.toUpperCase()) ?? null) : null;
  const [members, labels, agents, comments, agentRuns] = await Promise.all([
    repos.memberships.listMembers(team.id),
    repos.labels.listForTeam(team.id),
    repos.agents.listForTeam(team.id),
    openTask ? repos.comments.listForTask(openTask.id) : [],
    openTask ? repos.agentRuns.listForTask(openTask.id) : [],
  ]);

  return (
    <BoardView
      board={board}
      workspaceName={workspace.name}
      columns={columns}
      tasks={tasks}
      members={members.map(({ user: member }) => ({
        id: member.id,
        name: member.name,
        email: member.email,
        avatarUrl: member.avatarUrl,
      }))}
      labels={labels}
      comments={comments}
      openTaskId={openTask?.id ?? null}
      currentUserId={user.id}
      canManage={can(membership.role, "column:manage")}
      aiEnabled={aiAvailable()}
      agents={agents.map(({ id, name, specialty }) => ({ id, name, specialty }))}
      canAssignAgents={PLAN_CATALOG[team.plan].features.aiTeammate}
      agentRuns={agentRuns}
      copilot={copilotAccess(team, membership.role)}
      canModerate={can(membership.role, "comment:moderate")}
      realtime={
        resolveDataBackend(process.env.DATA_BACKEND) === "supabase" ? supabaseConfig() : null
      }
    />
  );
}

function copilotAccess(team: Team, role: Role): CopilotAccess | null {
  // Hidden until the server can run it (AI key, and a signing secret in production).
  if (!aiAvailable() || !approvalSecretConfigured()) return null;
  if (PLAN_CATALOG[team.plan].features.copilot) return { status: "on" };
  return can(role, "billing:manage")
    ? { status: "upgrade", message: "The board copilot is part of the Pro plan.", upgradeHref: settingsPath(team.slug, "billing") }
    : { status: "upgrade", message: "The board copilot is part of the Pro plan. Ask the team owner to upgrade." };
}
