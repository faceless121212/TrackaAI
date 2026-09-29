import { Inbox, type LucideIcon } from "lucide-react";

export type NavItem = { title: string; href: string; icon: LucideIcon };

// Milestones append entries here (workspaces in M2, members/settings in M3).
export const NAV_ITEMS: NavItem[] = [{ title: "My tasks", href: "/", icon: Inbox }];
