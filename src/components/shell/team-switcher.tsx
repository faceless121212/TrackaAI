"use client";

import { Check, ChevronsUpDown, Plus } from "lucide-react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import type { Team } from "@/lib/domain";
import { ONBOARDING_PATH, teamPath } from "@/lib/paths";

type TeamLink = Pick<Team, "id" | "name" | "slug">;

function TeamMark({ name }: { name: string }) {
  return (
    <span className="bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-md text-sm font-bold">
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

export function TeamSwitcher({ current, teams }: { current: TeamLink; teams: TeamLink[] }) {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton size="lg" aria-label={`Switch team (current: ${current.name})`}>
              <TeamMark name={current.name} />
              <span className="truncate font-semibold">{current.name}</span>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-56">
            <DropdownMenuLabel>Teams</DropdownMenuLabel>
            {teams.map((team) => (
              <DropdownMenuItem key={team.id} asChild>
                <Link href={teamPath(team.slug)}>
                  {team.name}
                  {team.id === current.id && <Check className="ml-auto" />}
                </Link>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={ONBOARDING_PATH}>
                <Plus />
                Create team
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
