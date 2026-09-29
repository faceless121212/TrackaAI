"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { settingsPath, type SettingsSection } from "@/lib/paths";
import { cn } from "@/lib/utils";

const SECTIONS: { section: SettingsSection; label: string }[] = [
  { section: "general", label: "General" },
  { section: "members", label: "Members" },
  { section: "labels", label: "Labels" },
  { section: "profile", label: "Profile" },
  { section: "billing", label: "Billing" },
];

export function SettingsNav({ teamSlug }: { teamSlug: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Settings" className="flex gap-1 border-b">
      {SECTIONS.map(({ section, label }) => {
        const href = settingsPath(teamSlug, section);
        const active = pathname === href || (section !== "general" && pathname.startsWith(`${href}/`));
        return (
          <Link
            key={section}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm transition-colors",
              active
                ? "border-primary text-foreground font-medium"
                : "text-muted-foreground hover:text-foreground border-transparent",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
