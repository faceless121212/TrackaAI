import { Rocket } from "lucide-react";
import Image from "next/image";
import askAi from "../../../public/marketing/ask-ai.png";
import { Eyebrow, SectionHeading } from "./marketing-shell";

const STEPS = [
  { title: "Create your team", body: "Sign up, name your team and get a board with sensible columns in under three minutes." },
  { title: "Bring your work", body: "Add issues by hand with C, or let the AI task writer draft them from a sentence." },
  { title: "Hand it to AI", body: "Assign issues to AI teammates and ask Ask AI what needs you next." },
];

/** "How it works", around a CSS laptop whose lid opens as it scrolls into view. */
export function HowItWorks() {
  return (
    <section aria-labelledby="how-title" className="border-mkt-line relative isolate overflow-hidden border-y">
      <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(45%_60%_at_70%_50%,var(--mkt-glow),transparent_70%)]" />
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 py-24 sm:px-6 sm:py-32 lg:grid-cols-[2fr_3fr]">
        <div className="space-y-8">
          <div className="space-y-4">
            <Eyebrow icon={Rocket}>How it works</Eyebrow>
            <SectionHeading id="how-title">From sign-up to shipped, in three steps</SectionHeading>
          </div>
          <ol className="space-y-6">
            {STEPS.map((step, i) => (
              <li key={step.title} className="flex gap-4">
                <span className="text-mkt-accent font-mono text-sm tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                <div className="space-y-1">
                  <h3 className="font-semibold">{step.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <figure className="mx-auto w-full max-w-2xl">
          {/* Lid: bezel + screen. Opens on scroll (see .mkt-lid in globals.css). */}
          <div className="mkt-lid border-foreground/15 rounded-t-2xl border bg-mkt-bezel p-2 pb-3 shadow-2xl shadow-mkt-shadow sm:p-3">
            <div className="bg-foreground/20 mx-auto mb-2 size-1.5 rounded-full" aria-hidden />
            <Image
              src={askAi}
              alt="Ask AI answering “What's urgent?” with a list of the team's most urgent open issues, each linked."
              placeholder="blur"
              sizes="(min-width: 1024px) 640px, (min-width: 672px) 672px, 100vw"
              className="rounded-md"
            />
          </div>
          {/* Base: a thin deck with a notch for opening the lid. */}
          <div aria-hidden className="from-foreground/25 to-foreground/10 relative -mx-[6%] h-3 rounded-b-xl bg-gradient-to-b sm:h-4">
            <div className="bg-background/40 absolute top-0 left-1/2 h-1.5 w-1/5 -translate-x-1/2 rounded-b-md" />
          </div>
        </figure>
      </div>
    </section>
  );
}
