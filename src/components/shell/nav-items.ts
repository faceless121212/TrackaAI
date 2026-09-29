import { Inbox, type LucideIcon } from "lucide-react";
import { teamPath } from "@/lib/paths";

export type NavItem = { title: string; href: string; icon: LucideIcon };

// Team-level destinations, shared by the sidebar and the palette. M3 adds members/settings.
export function navItems(teamSlug: string): NavItem[] {
  return [{ title: "My tasks", href: teamPath(teamSlug), icon: Inbox }];
}
