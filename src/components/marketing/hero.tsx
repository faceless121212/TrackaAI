import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PRICING_PATH, SIGN_UP_PATH } from "@/lib/auth/routes";
import dashboard from "../../../public/marketing/dashboard.png";
import { AmbientLight, Meteors } from "./effects";

export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="relative isolate overflow-hidden">
      <AmbientLight />
      <Meteors />
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 [background-image:linear-gradient(var(--mkt-line)_1px,transparent_1px),linear-gradient(90deg,var(--mkt-line)_1px,transparent_1px)] [background-size:72px_72px] [mask-image:radial-gradient(ellipse_at_top,black_5%,transparent_55%)]" />

      <div className="mx-auto flex max-w-6xl flex-col items-center px-4 pt-20 text-center sm:px-6 sm:pt-28">
        <Link
          href="/#features"
          className="border-mkt-line bg-mkt-surface/70 text-muted-foreground hover:text-foreground mb-8 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs backdrop-blur transition-colors"
        >
          <span className="bg-mkt-accent size-1.5 rounded-full shadow-[0_0_8px_var(--mkt-accent)]" aria-hidden />
          New: Ask AI, a chat with every issue in your team
          <ArrowRight className="size-3" aria-hidden />
        </Link>
        <h1
          id="hero-title"
          className="max-w-4xl text-4xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-6xl lg:text-7xl"
        >
          <span className="from-foreground to-foreground/70 bg-gradient-to-b bg-clip-text text-transparent">
            Project management with{" "}
          </span>
          <span className="from-foreground via-mkt-accent to-mkt-accent bg-gradient-to-r bg-clip-text text-transparent">
            AI teammates
          </span>
          <span className="from-foreground to-foreground/70 bg-gradient-to-b bg-clip-text text-transparent"> built in</span>
        </h1>
        <p className="text-muted-foreground mt-6 max-w-xl text-lg leading-relaxed text-pretty">
          Plan and ship on fast Kanban boards. Then hand issues to AI teammates, ask your board anything and draft tasks
          from a sentence.
        </p>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Button size="lg" className="shadow-[0_0_24px_-4px_var(--mkt-glow)]" asChild>
            <Link href={SIGN_UP_PATH}>
              Start free <ArrowRight aria-hidden />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href={PRICING_PATH}>See pricing</Link>
          </Button>
        </div>
        <p className="text-muted-foreground mt-4 font-mono text-xs">Free for solo work · No card needed</p>
      </div>

      {/* The product, tilted back, straightening as it scrolls into view. */}
      <div className="relative mx-auto mt-16 max-w-6xl px-4 sm:mt-20 sm:px-6">
        <div aria-hidden className="bg-mkt-glow absolute inset-x-12 top-0 h-48 rounded-full blur-3xl" />
        <div className="mkt-tilt border-mkt-line bg-mkt-surface/60 shadow-mkt-shadow relative rounded-2xl border p-1.5 shadow-2xl [mask-image:linear-gradient(to_bottom,black_78%,transparent)] sm:p-2">
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
