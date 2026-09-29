import { AppHeader } from "@/components/shell/app-header";
import { AppSidebar } from "@/components/shell/app-sidebar";
import { ThemePreferenceSync } from "@/components/theme/theme-preference-sync";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { requireTeamMember } from "@/server/auth/guards";
import { can } from "@/server/auth/permissions";
import { getRepositories } from "@/server/data";

export default async function TeamLayout({ children, params }: LayoutProps<"/[team]">) {
  const { user, team, membership } = await requireTeamMember((await params).team);
  const repos = getRepositories();
  const [teams, workspaces] = await Promise.all([
    repos.teams.listForUser(user.id),
    repos.workspaces.listForTeam(team.id),
  ]);
  const tree = await Promise.all(
    workspaces.map(async (workspace) => ({
      ...workspace,
      boards: await repos.boards.listForWorkspace(workspace.id),
    })),
  );
  const boards = tree.flatMap((workspace) => workspace.boards.map(({ id, name }) => ({ id, name })));

  return (
    <SidebarProvider>
      <ThemePreferenceSync preference={user.theme} />
      <AppSidebar
        user={user}
        team={team}
        teams={teams}
        workspaces={tree}
        canManage={can(membership.role, "workspace:create")}
      />
      {/* min-w-0 keeps wide content (the board) from pushing the header off-screen. */}
      <SidebarInset className="min-w-0">
        <AppHeader teamSlug={team.slug} boards={boards} />
        <div className="flex min-h-0 flex-1 flex-col p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
