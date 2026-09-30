import type { Metadata } from "next";
import Link from "next/link";
import { LabelChip } from "@/components/tasks/label-chip";
import { PriorityIcon } from "@/components/tasks/priority";
import { boardPath } from "@/lib/paths";
import { requireTeamMember } from "@/server/auth/guards";
import { can } from "@/server/auth/permissions";
import { getRepositories } from "@/server/data";

export const metadata: Metadata = { title: "My tasks" };

export default async function MyTasksPage({ params }: PageProps<"/[team]">) {
  const { user, team, membership } = await requireTeamMember((await params).team);
  const canCreateWorkspace = can(membership.role, "workspace:create");
  const repos = getRepositories();
  const [tasks, labels, workspaces] = await Promise.all([
    repos.tasks.listAssignedTo(team.id, user.id),
    repos.labels.listForTeam(team.id),
    repos.workspaces.listWithBoards(team.id),
  ]);
  const boards = workspaces.flatMap((w) => w.boards);
  const columns = await repos.boards.listColumnsForBoards([...new Set(tasks.map((t) => t.boardId))]);
  const boardName = new Map(boards.map((b) => [b.id, b.name]));
  const columnName = new Map(columns.map((c) => [c.id, c.name]));

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      <h1 className="text-2xl font-semibold">My tasks</h1>
      {tasks.length === 0 ? (
        <div className="text-muted-foreground rounded-lg border border-dashed px-6 py-10 text-center text-sm">
          {boards.length === 0 ? (
            <p>
              This team has no boards yet.{" "}
              {canCreateWorkspace
                ? "Create a workspace from the sidebar to get your first board."
                : "Ask a team admin to create a workspace."}
            </p>
          ) : (
            <p>Nothing assigned to you yet. Open a board from the sidebar and assign yourself a task.</p>
          )}
        </div>
      ) : (
        <ul className="divide-y rounded-lg border">
          {tasks.map((task) => (
            <li key={task.id}>
              <Link
                href={`${boardPath(team.slug, task.boardId)}?task=${task.key}`}
                className="hover:bg-muted/50 flex items-center gap-3 px-4 py-3 text-sm"
              >
                <PriorityIcon priority={task.priority} />
                <span className="text-muted-foreground w-16 shrink-0 font-mono text-xs">{task.key}</span>
                <span className="min-w-0 flex-1 truncate font-medium">{task.title}</span>
                {labels
                  .filter((label) => task.labelIds.includes(label.id))
                  .map((label) => (
                    <LabelChip key={label.id} label={label} />
                  ))}
                <span className="text-muted-foreground hidden text-xs sm:inline">
                  {boardName.get(task.boardId)} · {columnName.get(task.columnId)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
