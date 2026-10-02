import type { LucideIcon } from "lucide-react";
import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

/** A raised "3D" tile for a section or feature icon: highlight, depth shadow, slight tilt. */
export function IconChip({ icon: Icon, className }: { icon: LucideIcon; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "border-foreground/10 from-foreground/15 to-foreground/[0.02] relative grid size-10 shrink-0 place-items-center rounded-xl border bg-gradient-to-b",
        "shadow-[inset_0_1px_0_var(--mkt-line),0_10px_24px_-8px_var(--mkt-shadow)] [transform:perspective(400px)_rotateX(14deg)]",
        className,
      )}
    >
      <Icon className="text-mkt-accent size-5 drop-shadow-[0_0_10px_var(--mkt-glow)]" />
    </span>
  );
}

const METEORS: { left: string; top: string; delay: string; duration: string }[] = [
  { left: "70%", top: "-4%", delay: "0s", duration: "7s" },
  { left: "88%", top: "6%", delay: "2.4s", duration: "8.5s" },
  { left: "55%", top: "-8%", delay: "4.1s", duration: "6.5s" },
  { left: "96%", top: "22%", delay: "5.6s", duration: "9s" },
];

/** Thin streaks of light gliding diagonally across the hero (hidden under reduced motion). */
export function Meteors() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {METEORS.map((m) => (
        <span
          key={m.left}
          className="mkt-meteor from-mkt-accent absolute h-px w-32 bg-gradient-to-r to-transparent opacity-0"
          style={{ left: m.left, top: m.top, "--mkt-meteor-delay": m.delay, "--mkt-meteor-duration": m.duration } as CSSProperties}
        />
      ))}
    </div>
  );
}

/** The diagonal band of ambient light behind a section. */
export function AmbientLight({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 -z-10 overflow-hidden", className)}>
      <div className="via-mkt-glow absolute -top-1/3 left-1/4 h-[160%] w-1/3 rotate-[25deg] bg-gradient-to-b from-transparent to-transparent blur-3xl" />
      <div className="absolute inset-x-0 top-0 h-[560px] bg-[radial-gradient(50%_50%_at_50%_0%,var(--mkt-glow),transparent_70%)]" />
    </div>
  );
}
