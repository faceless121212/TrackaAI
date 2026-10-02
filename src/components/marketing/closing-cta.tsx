import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SIGN_UP_PATH } from "@/lib/auth/routes";

export function ClosingCta() {
  return (
    <section aria-labelledby="cta-title" className="relative isolate overflow-hidden">
      <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(50%_80%_at_50%_100%,var(--mkt-glow),transparent_70%)]" />
      <div className="mx-auto flex max-w-3xl flex-col items-center px-4 py-24 text-center sm:px-6 sm:py-32">
        <h2
          id="cta-title"
          className="from-foreground to-foreground/60 bg-gradient-to-b bg-clip-text text-4xl font-semibold tracking-tight text-balance text-transparent sm:text-5xl"
        >
          Less busywork. More shipped.
        </h2>
        <p className="text-muted-foreground mt-5 text-lg">Set up your team in under three minutes. Free for solo work.</p>
        <Button size="lg" className="mt-10" asChild>
          <Link href={SIGN_UP_PATH}>
            Create your team <ArrowRight aria-hidden />
          </Link>
        </Button>
      </div>
    </section>
  );
}
