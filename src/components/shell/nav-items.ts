import { Inbox, Settings, type LucideIcon } from "lucide-react";
import { settingsPath, teamPath } from "@/lib/paths";

export type NavItem = { title: string; href: string; icon: LucideIcon };

// Team-level destinations, shared by the sidebar and the palette.
export function navItems(teamSlug: string): NavItem[] {
  return [
    { title: "My tasks", href: teamPath(teamSlug), icon: Inbox },
    { title: "Settings", href: settingsPath(teamSlug), icon: Settings },
  ];
}
