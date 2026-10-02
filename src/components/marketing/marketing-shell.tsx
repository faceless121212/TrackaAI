import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { IconChip } from "./effects";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

/**
 * Frame for the marketing pages. Always dark (Linear-style), whatever the
 * visitor's app theme: `dark` switches every token, `marketing` tints them.
 */
export function MarketingShell({
  children,
  signedIn,
  animated,
}: {
  children: ReactNode;
  signedIn?: boolean;
  /** The page has looping animations: show the "Pause animations" control. */
  animated?: boolean;
}) {
  return (
    <div className="dark marketing bg-background text-foreground flex min-h-svh flex-col [color-scheme:dark]">
      <SiteHeader signedIn={signedIn} motionToggle={animated} />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}

/** Small mono label above a section heading, with an optional 3D icon chip. */
export function Eyebrow({ children, icon, center }: { children: ReactNode; icon?: LucideIcon; center?: boolean }) {
  return (
    <div className={center ? "flex items-center justify-center gap-3" : "flex items-center gap-3"}>
      {icon && <IconChip icon={icon} className="size-8 rounded-lg [&_svg]:size-4" />}
      <p className="text-mkt-accent font-mono text-xs tracking-widest uppercase">{children}</p>
    </div>
  );
}

/** Section heading: white fading into the cyan accent. */
export function SectionHeading({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <h2
      id={id}
      className="from-foreground via-foreground to-mkt-accent/80 bg-gradient-to-br bg-clip-text text-3xl font-semibold tracking-tight text-balance text-transparent sm:text-4xl"
    >
      {children}
    </h2>
  );
}
