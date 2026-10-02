import { CircleHelp, Plus } from "lucide-react";
import { Eyebrow, SectionHeading } from "./marketing-shell";

export type FaqItem = { question: string; answer: string };

export const PRODUCT_FAQ: FaqItem[] = [
  {
    question: "Can AI change my board without asking?",
    answer:
      "No. The Copilot proposes every change as a card you approve or deny, Ask AI only reads, and an AI teammate only comments on and moves the issue it was given.",
  },
  {
    question: "Who can see my team's issues?",
    answer:
      "Only members of your team. Every query is scoped to your team in the database, and AI features run with your own permissions.",
  },
  {
    question: "What counts as an AI run?",
    answer:
      "Each AI request: drafting or breaking down a task, a Copilot or Ask AI message, or an AI teammate run. Free includes 10 a month, Lite 100 and Pro unlimited.",
  },
  {
    question: "Is billing real?",
    answer: "Not yet. Plans and limits work exactly as described, but checkout is simulated and no card is ever charged.",
  },
];

export const PRICING_FAQ: FaqItem[] = [
  {
    question: "Is the price per person?",
    answer: "No, per team. Lite is $10 a month for up to three people; Pro is $25 a month for everyone.",
  },
  {
    question: "Can I switch plans later?",
    answer:
      "Any time, from Settings → Billing. Downgrading keeps all your data; you just can't add more than the new plan allows.",
  },
  PRODUCT_FAQ[2],
  PRODUCT_FAQ[3],
];

/** Native <details> disclosure: keyboard- and screen-reader-friendly with no JavaScript. */
export function Faq({ items, title = "Questions, answered" }: { items: FaqItem[]; title?: string }) {
  return (
    <section id="faq" aria-labelledby="faq-title" className="mx-auto max-w-3xl scroll-mt-20 px-4 py-24 sm:px-6 sm:py-32">
      <div className="space-y-4 text-center">
        <Eyebrow icon={CircleHelp} center>
          FAQ
        </Eyebrow>
        <SectionHeading id="faq-title">{title}</SectionHeading>
      </div>
      <div className="divide-mkt-line border-mkt-line mt-12 divide-y border-y">
        {items.map((item) => (
          <details key={item.question} className="group py-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-6 font-medium [&::-webkit-details-marker]:hidden">
              {item.question}
              <Plus className="text-muted-foreground size-4 shrink-0 transition-transform duration-200 group-open:rotate-45 motion-reduce:transition-none" aria-hidden />
            </summary>
            <p className="text-muted-foreground mt-3 leading-relaxed">{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
