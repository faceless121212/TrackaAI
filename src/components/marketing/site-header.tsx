import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PRICING_PATH, SIGN_IN_PATH, SIGN_UP_PATH } from "@/lib/auth/routes";
import { Logo } from "./logo";
import { MotionToggle } from "./motion-toggle";

const NAV = [
  { label: "Features", href: "/#features" },
  { label: "Pricing", href: PRICING_PATH },
  { label: "FAQ", href: "/#faq" },
];

/** Sticky, translucent top bar for the marketing pages. `signedIn` swaps the auth buttons for "Open app". */
export function SiteHeader({ signedIn = false, motionToggle = false }: { signedIn?: boolean; motionToggle?: boolean }) {
  return (
    <header className="border-mkt-line bg-mkt-bg/70 sticky top-0 z-40 border-b backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-6 px-4 sm:px-6">
        <div className="flex items-center gap-8">
          <Logo />
          <nav aria-label="Main" className="hidden items-center gap-6 sm:flex">
            {NAV.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="text-muted-foreground hover:text-foreground text-sm transition-colors duration-150"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          {motionToggle && <MotionToggle />}
          {signedIn ? (
            <Button size="sm" asChild>
              <Link href="/">Open app</Link>
            </Button>
          ) : (
            <>
              <Button size="sm" variant="ghost" asChild>
                <Link href={SIGN_IN_PATH}>Sign in</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href={SIGN_UP_PATH}>Start free</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
