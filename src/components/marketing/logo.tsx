import Link from "next/link";
import { cn } from "@/lib/utils";

/** The TrackaAI mark (three Kanban columns, the last one lit) and wordmark. */
export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("inline-flex items-center gap-2 font-semibold tracking-tight", className)}>
      <svg viewBox="0 0 24 24" className="size-6" aria-hidden>
        <rect x="1" y="1" width="22" height="22" rx="6" className="fill-foreground/10 stroke-foreground/15" />
        <rect x="5.5" y="6" width="3" height="12" rx="1.5" className="fill-foreground/70" />
        <rect x="10.5" y="6" width="3" height="8" rx="1.5" className="fill-foreground/70" />
        <rect x="15.5" y="6" width="3" height="5" rx="1.5" className="fill-mkt-accent" />
      </svg>
      <span>TrackaAI</span>
    </Link>
  );
}
