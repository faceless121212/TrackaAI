import type { ReactNode } from "react";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

/**
 * Frame for the marketing pages. Always dark (Linear-style), whatever the
 * visitor's app theme: `dark` switches every token, `marketing` tints them.
 */
export function MarketingShell({ children, signedIn }: { children: ReactNode; signedIn?: boolean }) {
  return (
    <div className="dark marketing bg-background text-foreground flex min-h-svh flex-col [color-scheme:dark]">
      <SiteHeader signedIn={signedIn} />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}

/** Small mono label above a section heading. */
export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="text-mkt-accent font-mono text-xs tracking-widest uppercase">{children}</p>;
}

/** Section heading with the white-to-grey fade of the hero. */
export function SectionHeading({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <h2
      id={id}
      className="from-foreground to-foreground/60 bg-gradient-to-b bg-clip-text text-3xl font-semibold tracking-tight text-balance text-transparent sm:text-4xl"
    >
      {children}
    </h2>
  );
}
