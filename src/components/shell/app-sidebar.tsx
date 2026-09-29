import { Layers, LogOut, SquareKanban } from "lucide-react";
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
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import type { Board, Team, User, Workspace } from "@/lib/domain";
import { boardPath } from "@/lib/paths";
import { signOutAction } from "@/server/actions/auth";
import { navItems } from "./nav-items";
import { TeamSwitcher } from "./team-switcher";

export type SidebarWorkspace = Workspace & { boards: Board[] };

export function AppSidebar({
  user,
  team,
  teams,
  workspaces,
}: {
  user: User;
  team: Team;
  teams: Team[];
  workspaces: SidebarWorkspace[];
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
                    <SidebarMenuSub>
                      {workspace.boards.map((board) => (
                        <SidebarMenuSubItem key={board.id}>
                          <SidebarMenuSubButton asChild>
                            <Link href={boardPath(team.slug, board.id)}>
                              <SquareKanban />
                              <span>{board.name}</span>
                            </Link>
                          </SidebarMenuSubButton>
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
        <div className="min-w-0 px-2 text-sm group-data-[collapsible=icon]:hidden">
          <p className="truncate font-medium">{user.name}</p>
          <p className="text-muted-foreground truncate text-xs">{user.email}</p>
        </div>
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
