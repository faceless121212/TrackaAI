import { Layers, LogOut } from "lucide-react";
import Link from "next/link";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import type { Board, Team, User, Workspace } from "@/lib/domain";
import { boardPath, settingsPath } from "@/lib/paths";
import { MemberAvatar } from "@/components/tasks/member-avatar";
import { signOutAction } from "@/server/actions/auth";
import { BoardLink } from "./board-link";
import { navItems } from "./nav-items";
import { TeamSwitcher } from "./team-switcher";
import { NewWorkspaceButton, WorkspaceMenu } from "./workspace-actions";

export type SidebarWorkspace = Workspace & { boards: Board[] };

export function AppSidebar({
  user,
  team,
  teams,
  workspaces,
  canManage,
}: {
  user: User;
  team: Team;
  teams: Team[];
  workspaces: SidebarWorkspace[];
  /** Owners and admins can create, rename and delete workspaces and boards. */
  canManage: boolean;
}) {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <TeamSwitcher current={team} teams={teams} />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems(team.slug).map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Workspaces</SidebarGroupLabel>
          {canManage && <NewWorkspaceButton teamSlug={team.slug} />}
          <SidebarGroupContent>
            {workspaces.length === 0 ? (
              <p className="text-muted-foreground px-2 text-xs group-data-[collapsible=icon]:hidden">
                No workspaces yet
              </p>
            ) : (
              <SidebarMenu>
                {workspaces.map((workspace) => (
                  <SidebarMenuItem key={workspace.id}>
                    <SidebarMenuButton asChild tooltip={workspace.name}>
                      <span>
                        <Layers />
                        <span>{workspace.name}</span>
                      </span>
                    </SidebarMenuButton>
                    {canManage && <WorkspaceMenu workspace={workspace} />}
                    <SidebarMenuSub>
                      {workspace.boards.map((board) => (
                        <SidebarMenuSubItem key={board.id}>
                          <BoardLink href={boardPath(team.slug, board.id)} name={board.name} />
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg" tooltip="Profile">
              <Link href={settingsPath(team.slug, "profile")}>
                <MemberAvatar member={user} className="size-8" />
                <span className="min-w-0 text-sm">
                  <span className="block truncate font-medium">{user.name}</span>
                  <span className="text-muted-foreground block truncate text-xs">{user.email}</span>
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <form action={signOutAction}>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton type="submit" tooltip="Sign out">
                <LogOut />
                <span>Sign out</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </form>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
