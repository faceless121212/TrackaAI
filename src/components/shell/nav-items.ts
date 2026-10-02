import { Inbox, Settings, Sparkles, type LucideIcon } from "lucide-react";
import { askPath, settingsPath, teamPath } from "@/lib/paths";

export type NavItem = { title: string; href: string; icon: LucideIcon };

// Team-level destinations, shared by the sidebar and the palette.
export function navItems(teamSlug: string): NavItem[] {
  return [
    { title: "My tasks", href: teamPath(teamSlug), icon: Inbox },
    { title: "Ask AI", href: askPath(teamSlug), icon: Sparkles },
    { title: "Settings", href: settingsPath(teamSlug), icon: Settings },
  ];
}
