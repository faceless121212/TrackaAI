import { Bot, Check, MessageSquareText, Sparkles, Workflow } from "lucide-react";
import type { ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IconChip } from "./effects";
import { Eyebrow, SectionHeading } from "./marketing-shell";

// Real workflows in place of testimonials (there are no customers to quote yet).
// User-controlled tabs, not an auto-rotating carousel: moving content must be pausable.

type Step = { text: string };
const WORKFLOWS: { id: string; label: string; icon: typeof Bot; title: string; steps: Step[]; panel: ReactNode }[] = [
  {
    id: "teammate",
    label: "Hand off a spec",
    icon: Bot,
    title: "An AI teammate drafts the spec while you keep working",
    steps: [
      { text: "Create a Spec writer teammate in Settings" },
      { text: "Assign it “Write the Q4 roadmap spec”" },
      { text: "It posts the spec as a comment and moves the issue to In Review" },
    ],
    panel: (
      <div className="space-y-3 text-sm">
        <p className="text-muted-foreground text-xs">ENG-6 · In Review</p>
        <p className="font-medium">Q4 roadmap: goal, assumptions, acceptance criteria</p>
        <ul className="text-muted-foreground space-y-1.5">
          <li>• Goal: ship SSO and usage billing</li>
          <li>• Assumption: Okta first, then Google</li>
          <li>• Done when: admins can enforce SSO</li>
        </ul>
      </div>
    ),
  },
  {
    id: "triage",
    label: "Triage with Ask AI",
    icon: MessageSquareText,
    title: "Find out what's on fire before stand-up",
    steps: [
      { text: "Open Ask AI from the sidebar" },
      { text: "Ask “What's urgent and who has it?”" },
      { text: "Jump straight to each issue from the answer" },
    ],
    panel: (
      <div className="space-y-2 text-sm">
        <p className="bg-foreground/10 ml-auto w-fit rounded-lg px-3 py-1.5">What&apos;s urgent and who has it?</p>
        <p>ENG-8 Fix timezone drift: Leo, due tomorrow</p>
        <p>ENG-11 Search across workspaces: you, due in 2 days</p>
      </div>
    ),
  },
  {
    id: "plan",
    label: "Plan with the Copilot",
    icon: Sparkles,
    title: "Reorganise a board in one sentence",
    steps: [
      { text: "Open the Copilot on a board" },
      { text: "Say “Move the bugs to Todo and assign them to Leo”" },
      { text: "Approve each proposed change, or deny the ones you don't want" },
    ],
    panel: (
      <div className="space-y-2 text-sm">
        {["Move ENG-8 to Todo", "Assign ENG-8 to Leo Park", "Move ENG-13 to Todo"].map((change) => (
          <div key={change} className="border-mkt-line flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
            <span>{change}</span>
            <Check className="text-mkt-accent size-4" aria-hidden />
          </div>
        ))}
      </div>
    ),
  },
];

export function Workflows() {
  return (
    <section aria-labelledby="workflows-title" className="mx-auto max-w-6xl px-4 pb-24 sm:px-6 sm:pb-32">
      <div className="max-w-2xl space-y-4">
        <Eyebrow icon={Workflow}>Workflows</Eyebrow>
        <SectionHeading id="workflows-title">How teams put AI to work</SectionHeading>
      </div>
      <Tabs defaultValue={WORKFLOWS[0].id} className="mt-10">
        <TabsList className="bg-mkt-surface/60 border-mkt-line h-auto flex-wrap border">
          {WORKFLOWS.map((w) => (
            <TabsTrigger key={w.id} value={w.id} className="data-[state=active]:text-foreground gap-2 px-3 py-1.5">
              <w.icon className="size-4" aria-hidden />
              {w.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {WORKFLOWS.map((w) => (
          <TabsContent key={w.id} value={w.id} className="mt-6">
            <div className="border-mkt-line from-mkt-surface/80 to-mkt-surface/30 grid gap-8 rounded-2xl border bg-gradient-to-b p-6 md:grid-cols-2 md:p-8">
              <div className="space-y-5">
                <IconChip icon={w.icon} />
                <h3 className="text-xl font-semibold tracking-tight">{w.title}</h3>
                <ol className="space-y-3">
                  {w.steps.map((step, i) => (
                    <li key={step.text} className="flex gap-3">
                      <span className="text-mkt-accent font-mono text-sm tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                      <span className="text-muted-foreground">{step.text}</span>
                    </li>
                  ))}
                </ol>
              </div>
              <div aria-hidden className="border-mkt-line bg-background/60 self-center rounded-xl border p-5">
                {w.panel}
              </div>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </section>
  );
}
