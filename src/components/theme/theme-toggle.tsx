"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { setThemePreferenceAction } from "@/server/actions/profile";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle theme"
      onClick={() => {
        const next = resolvedTheme === "light" ? "dark" : "light";
        setTheme(next);
        // Saved per user (PRD §6); failures only mean the choice doesn't follow you to other devices.
        void setThemePreferenceAction(next);
      }}
    >
      <Sun className="hidden size-4 dark:block" />
      <Moon className="size-4 dark:hidden" />
    </Button>
  );
}
