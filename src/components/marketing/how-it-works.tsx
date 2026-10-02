import { Eyebrow, SectionHeading } from "./marketing-shell";

const STEPS = [
  {
    title: "Create your team",
    body: "Sign up, name your team and get a board with sensible columns in under three minutes.",
  },
  {
    title: "Bring your work",
    body: "Add issues by hand with C, or let the AI task writer draft them from a sentence.",
  },
  {
    title: "Hand it to AI",
    body: "Assign an issue to an AI teammate and get a spec or plan back as a comment, ready for review.",
  },
];

export function HowItWorks() {
  return (
    <section aria-labelledby="how-title" className="border-mkt-line border-y">
      <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6 sm:py-32">
        <div className="max-w-2xl space-y-4">
          <Eyebrow>How it works</Eyebrow>
          <SectionHeading id="how-title">From sign-up to shipped, in three steps</SectionHeading>
        </div>
        <ol className="mt-14 grid gap-10 md:grid-cols-3 md:gap-6">
          {STEPS.map((step, i) => (
            <li key={step.title} className="relative space-y-3">
              <div className="flex items-center gap-4">
                <span className="text-mkt-accent font-mono text-sm tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                <span aria-hidden className="bg-mkt-line h-px flex-1" />
              </div>
              <h3 className="text-lg font-semibold">{step.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
