"use client";

import { Pause, Play } from "lucide-react";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";

const KEY = "trackaai:marketing-motion";
const EVENT = "trackaai:marketing-motion";

// The choice lives in localStorage when allowed, else in memory for this visit;
// a same-tab event tells subscribers it changed.
let memoryPaused = false;
function readPaused(): boolean {
  try {
    return localStorage.getItem(KEY) === "paused";
  } catch {
    return memoryPaused;
  }
}
function writePaused(paused: boolean) {
  memoryPaused = paused;
  try {
    if (paused) localStorage.setItem(KEY, "paused");
    else localStorage.removeItem(KEY);
  } catch {
    // Storage blocked (private mode, previews): remembered for this visit only.
  }
  window.dispatchEvent(new Event(EVENT));
}
function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/**
 * WCAG 2.2.2 (Pause, Stop, Hide): the landing page's looping decorations
 * (meteors, pulses, progress) run longer than 5s, so visitors get a visible
 * way to stop them. Sets data-motion="paused" on the `.marketing` root (see
 * globals.css); the choice is remembered per browser when storage allows.
 */
export function MotionToggle() {
  const ref = useRef<HTMLButtonElement>(null);
  const paused = useSyncExternalStore(subscribe, readPaused, () => false);

  useEffect(() => {
    const root = ref.current?.closest<HTMLElement>(".marketing");
    if (!root) return;
    if (paused) root.dataset.motion = "paused";
    else delete root.dataset.motion;
  }, [paused]);

  return (
    <Button
      ref={ref}
      type="button"
      size="icon"
      variant="ghost"
      aria-pressed={paused}
      aria-label="Pause animations"
      title={paused ? "Play animations" : "Pause animations"}
      onClick={() => writePaused(!paused)}
      className="text-muted-foreground hover:text-foreground size-8"
    >
      {paused ? <Play aria-hidden /> : <Pause aria-hidden />}
    </Button>
  );
}
