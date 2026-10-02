import { Bot, Command, MessageSquareText, PenLine, Sparkles, type LucideIcon } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { IconChip } from "./effects";
import { Eyebrow, SectionHeading } from "./marketing-shell";

type Feature = { icon: LucideIcon; title: string; body: string; visual: ReactNode; wide?: boolean };

// Decorative, CSS-animated vignettes that echo the real product (aria-hidden;
// the card text says what they show). Static under reduced motion.
function Chip({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("border-mkt-line bg-background/60 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs", className)}>
      {children}
    </span>
  );
}
const panel = "border-mkt-line bg-background/60 rounded-xl border";
const delay = (s: number) => ({ "--mkt-delay": `${s}s` }) as CSSProperties;

const teammateVisual = (
  <div className={cn(panel, "space-y-3 p-4 text-left")}>
    <div className="flex items-center gap-2 text-xs">
      <span className="bg-mkt-accent/15 text-mkt-accent grid size-6 place-items-center rounded-full">
        <Bot className="size-3.5" />
      </span>
      <span className="font-medium">Spec writer</span>
      <span className="text-muted-foreground">AI teammate · working on ENG-6</span>
    </div>
    <div className="bg-foreground/10 h-1.5 overflow-hidden rounded-full">
      <div className="mkt-fill from-mkt-accent/60 to-mkt-accent h-full w-full rounded-full bg-gradient-to-r" />
    </div>
    <div className="mkt-rise space-y-1.5 text-sm" style={delay(0.8)}>
      <p className="font-medium">Q4 roadmap: goal and acceptance criteria</p>
      <div className="bg-foreground/10 h-2 w-11/12 rounded-full" />
      <div className="bg-foreground/10 h-2 w-4/5 rounded-full" />
    </div>
    <Chip className="mkt-rise">
      <span className="size-1.5 rounded-full bg-[var(--label-green)]" /> Moved to In Review
    </Chip>
  </div>
);

const copilotVisual = (
  <div className={cn(panel, "space-y-3 p-4 text-left text-sm")}>
    <p className="text-muted-foreground text-xs">Proposed change</p>
    <p className="font-medium">Move ENG-8 to Done</p>
    <div className="flex gap-2">
      <span className="mkt-pulse bg-foreground text-background rounded-md px-2.5 py-1 text-xs font-medium">Approve</span>
      <span className="border-mkt-line rounded-md border px-2.5 py-1 text-xs">Deny</span>
    </div>
  </div>
);

const askVisual = (
  <div className="space-y-2 text-left text-sm">
    <p className="mkt-rise bg-foreground/10 ml-auto w-fit rounded-lg px-3 py-1.5">What&apos;s urgent?</p>
    <div className={cn(panel, "mkt-rise space-y-1.5 p-3")} style={delay(0.6)}>
      <p className="text-muted-foreground text-xs">2 open issues</p>
      <p className="decoration-mkt-accent/50 underline underline-offset-4">ENG-8 Fix timezone drift</p>
      <p className="decoration-mkt-accent/50 underline underline-offset-4">ENG-13 Crash on empty export</p>
    </div>
  </div>
);

const writerVisual = (
  <div className="space-y-2 text-left text-sm">
    <div className={cn(panel, "text-muted-foreground px-3 py-2")}>
      <span className="mkt-typing inline-block align-bottom font-mono text-xs">export the board as CSV</span>
    </div>
    <div className={cn(panel, "mkt-rise space-y-2 p-3")} style={delay(2.8)}>
      <p className="font-medium">Export a board to CSV</p>
      <div className="flex gap-1.5">
        <Chip>
          <span className="size-1.5 rounded-full bg-[var(--label-purple)]" /> Feature
        </Chip>
        <Chip>High</Chip>
      </div>
    </div>
  </div>
);

function Key({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        "border-mkt-line bg-background/60 grid h-9 w-fit min-w-9 place-items-center rounded-md border px-2 font-mono text-sm shadow-[inset_0_-2px_0_var(--mkt-line)]",
        className,
      )}
    >
      {children}
    </kbd>
  );
}

const keyboardVisual = (
  <div className="text-muted-foreground grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2.5 text-left text-sm">
    <Key className="mkt-pulse">C</Key>
    <span>Create an issue</span>
    <div className="flex gap-1">
      <Key>⌘</Key>
      <Key>K</Key>
    </div>
    <span>Jump anywhere</span>
    <Key>Space</Key>
    <span>Pick up and move a card</span>
  </div>
);

const FEATURES: Feature[] = [
  {
    icon: Bot,
    title: "AI teammates",
    body: "Assign an issue to an AI teammate with a specialty. It writes the spec, plan or draft as a comment and hands the issue to review.",
    visual: teammateVisual,
    wide: true,
  },
  {
    icon: Sparkles,
    title: "Board copilot",
    body: "Ask about a board or tell it what to change. Every change is a card you approve first.",
    visual: copilotVisual,
  },
  {
    icon: MessageSquareText,
    title: "Ask AI",
    body: "Chat with every issue in your team: what's urgent, what's overdue, who has what. Answers link straight to the issue.",
    visual: askVisual,
  },
  {
    icon: PenLine,
    title: "Tasks from a sentence",
    body: "Type one line and get a title, description, acceptance criteria and labels. Break big issues into sub-tasks in one click.",
    visual: writerVisual,
  },
  {
    icon: Command,
    title: "Fast, keyboard-first",
    body: "Every action has a shortcut, and realtime boards keep the whole team in sync.",
    visual: keyboardVisual,
  },
];

export function Features() {
  return (
    <section id="features" aria-labelledby="features-title" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-24 sm:px-6 sm:py-32">
      <div className="max-w-2xl space-y-4">
        <Eyebrow icon={Sparkles}>AI built in</Eyebrow>
        <SectionHeading id="features-title">Your team, plus teammates that never sleep</SectionHeading>
        <p className="text-muted-foreground text-lg leading-relaxed">
          Everything you expect from a modern tracker, with AI that works inside your boards and never acts without your
          say-so.
        </p>
      </div>
      <ul className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature) => (
          <li
            key={feature.title}
            className={cn(
              "group border-mkt-line from-mkt-surface/80 to-mkt-surface/30 relative flex flex-col gap-6 overflow-hidden rounded-2xl border bg-gradient-to-b p-6 transition-colors duration-200",
              "hover:border-mkt-accent/30",
              feature.wide && "lg:col-span-2",
            )}
          >
            {/* A faint cyan corner glow that brightens on hover. */}
            <div aria-hidden className="bg-mkt-glow absolute -top-16 -right-16 size-40 rounded-full opacity-40 blur-3xl transition-opacity duration-300 group-hover:opacity-80" />
            <div className="relative space-y-3">
              <IconChip icon={feature.icon} />
              <h3 className="pt-1 font-semibold">{feature.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{feature.body}</p>
            </div>
            <div aria-hidden className="relative mt-auto">
              {feature.visual}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
