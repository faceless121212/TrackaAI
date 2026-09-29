import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { requireTeamMember } from "@/server/auth/guards";
import { getRepositories } from "@/server/data";

export const metadata: Metadata = { title: "Board" };

// Read-only in M1; drag & drop, task dialogs and filters arrive in M2.
export default async function BoardPage({ params }: PageProps<"/[team]/board/[boardId]">) {
  const { team: teamSlug, boardId } = await params;
  const { team } = await requireTeamMember(teamSlug);
  const repos = getRepositories();
  const board = await repos.boards.get(boardId);
  const workspace = board ? await repos.workspaces.get(board.workspaceId) : null;
  if (!board || !workspace || workspace.teamId !== team.id) notFound();

  const [columns, tasks] = await Promise.all([
    repos.boards.listColumns(board.id),
    repos.tasks.listForBoard(board.id),
  ]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div>
        <p className="text-muted-foreground text-sm">{workspace.name}</p>
        <h1 className="text-xl font-semibold">{board.name}</h1>
      </div>
      <div className="flex min-h-0 flex-1 gap-3 overflow-x-auto pb-2">
        {columns.map((column) => {
          const columnTasks = tasks.filter((task) => task.columnId === column.id);
          return (
            <section
              key={column.id}
              aria-label={column.name}
              className="bg-muted/40 flex w-72 shrink-0 flex-col gap-2 rounded-lg border p-2"
            >
              <header className="flex items-center justify-between px-1 py-0.5">
                <h2 className="text-sm font-medium">{column.name}</h2>
                <Badge variant="secondary">{columnTasks.length}</Badge>
              </header>
              {columnTasks.map((task) => (
                <article key={task.id} className="bg-card space-y-1 rounded-md border p-3 text-sm">
                  <p className="text-muted-foreground font-mono text-xs">{task.key}</p>
                  <p>{task.title}</p>
                </article>
              ))}
              {columnTasks.length === 0 && (
                <p className="text-muted-foreground px-1 py-6 text-center text-xs">No tasks</p>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
