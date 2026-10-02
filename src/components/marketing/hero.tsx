import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PRICING_PATH, SIGN_UP_PATH } from "@/lib/auth/routes";
import dashboard from "../../../public/marketing/dashboard.png";

export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="relative isolate overflow-hidden">
      {/* Atmosphere: an accent glow from the top and a faint grid that fades out. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-x-0 top-0 h-[640px] bg-[radial-gradient(60%_60%_at_50%_0%,var(--mkt-glow),transparent_70%)]" />
        <div className="absolute inset-0 [background-image:linear-gradient(var(--mkt-line)_1px,transparent_1px),linear-gradient(90deg,var(--mkt-line)_1px,transparent_1px)] [background-size:64px_64px] [mask-image:radial-gradient(ellipse_at_top,black_20%,transparent_65%)]" />
      </div>

      <div className="mx-auto flex max-w-6xl flex-col items-center px-4 pt-20 text-center sm:px-6 sm:pt-28">
        <Link
          href="/#features"
          className="border-mkt-line bg-mkt-surface/70 text-muted-foreground hover:text-foreground mb-8 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs transition-colors"
        >
          <span className="bg-mkt-accent size-1.5 rounded-full" aria-hidden />
          New: Ask AI, a chat with every issue in your team
          <ArrowRight className="size-3" aria-hidden />
        </Link>
        <h1
          id="hero-title"
          className="from-foreground to-foreground/55 max-w-4xl bg-gradient-to-b bg-clip-text text-4xl leading-[1.05] font-semibold tracking-tight text-balance text-transparent sm:text-6xl lg:text-7xl"
        >
          Project management with AI teammates built in
        </h1>
        <p className="text-muted-foreground mt-6 max-w-xl text-lg leading-relaxed text-pretty">
          Plan and ship on fast Kanban boards. Then hand issues to AI teammates, ask your board anything and draft tasks
          from a sentence.
        </p>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Button size="lg" asChild>
            <Link href={SIGN_UP_PATH}>
              Get started free <ArrowRight aria-hidden />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href={PRICING_PATH}>See pricing</Link>
          </Button>
        </div>
        <p className="text-muted-foreground mt-4 font-mono text-xs">Free for solo work · No card needed</p>
      </div>

      <div className="relative mx-auto mt-16 max-w-6xl px-4 sm:mt-20 sm:px-6">
        <div aria-hidden className="bg-mkt-glow absolute inset-x-16 -top-10 h-40 rounded-full blur-3xl" />
        <div className="border-mkt-line bg-mkt-surface/60 relative rounded-2xl border p-1.5 shadow-2xl shadow-black/60 [mask-image:linear-gradient(to_bottom,black_75%,transparent)] sm:p-2">
          <Image
            src={dashboard}
            alt="A TrackaAI board: Backlog, Todo, In Progress, In Review and Done columns with prioritised, labelled issues assigned to teammates and an AI teammate."
            priority
            placeholder="blur"
            sizes="(min-width: 1152px) 1120px, 100vw"
            className="border-mkt-line rounded-xl border"
          />
        </div>
      </div>
    </section>
  );
}
