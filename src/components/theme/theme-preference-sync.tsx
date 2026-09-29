"use client";

import { useTheme } from "next-themes";
import { useEffect, useRef } from "react";
import type { Theme } from "@/lib/domain";

/**
 * Applies the signed-in user's saved theme (e.g. on a new device). Runs once
 * per saved value, so later toggles in this tab aren't overridden.
 */
export function ThemePreferenceSync({ preference }: { preference: Theme | undefined }) {
  const { setTheme } = useTheme();
  const applied = useRef<Theme | undefined>(undefined);

  useEffect(() => {
    if (!preference || applied.current === preference) return;
    applied.current = preference;
    setTheme(preference);
  }, [preference, setTheme]);

  return null;
}
