import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BoardView } from "@/components/board/board-view";
import { requireTeamMember } from "@/server/auth/guards";
import { can } from "@/server/auth/permissions";
import { aiAvailable } from "@/server/ai/model";
import { supabaseConfig } from "@/lib/supabase/config";
import { getRepositories } from "@/server/data";
import { resolveDataBackend } from "@/server/data/backend";

export const metadata: Metadata = { title: "Board" };

export default async function BoardPage({ params, searchParams }: PageProps<"/[team]/board/[boardId]">) {
  const [{ team: teamSlug, boardId }, { task: taskKey }] = await Promise.all([params, searchParams]);
  const { user, team, membership } = await requireTeamMember(teamSlug);
  const repos = getRepositories();
  const board = await repos.boards.get(boardId);
  const workspace = board ? await repos.workspaces.get(board.workspaceId) : null;
  if (!board || !workspace || workspace.teamId !== team.id) notFound();

  const [columns, tasks, members, labels] = await Promise.all([
    repos.boards.listColumns(board.id),
    repos.tasks.listForBoard(board.id),
    repos.memberships.listMembers(team.id),
    repos.labels.listForTeam(team.id),
  ]);
  // ?task=ENG-12 opens the task sheet (PRD §5.3).
  const openTask =
    typeof taskKey === "string" ? (tasks.find((task) => task.key === taskKey.toUpperCase()) ?? null) : null;
  const comments = openTask ? await repos.comments.listForTask(openTask.id) : [];

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
      canModerate={can(membership.role, "comment:moderate")}
      realtime={
        resolveDataBackend(process.env.DATA_BACKEND) === "supabase" ? supabaseConfig() : null
      }
    />
  );
}
