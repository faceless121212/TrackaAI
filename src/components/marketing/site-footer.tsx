import Link from "next/link";
import { PRICING_PATH, SIGN_IN_PATH, SIGN_UP_PATH } from "@/lib/auth/routes";
import { Logo } from "./logo";

export function SiteFooter() {
  return (
    <footer className="border-mkt-line border-t">
      <div className="text-muted-foreground mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-3">
          <Logo className="text-foreground" />
          <span className="font-mono text-xs">© {new Date().getFullYear()}</span>
        </div>
        <nav aria-label="Footer" className="flex gap-6">
          <Link href={PRICING_PATH} className="hover:text-foreground transition-colors">
            Pricing
          </Link>
          <Link href={SIGN_IN_PATH} className="hover:text-foreground transition-colors">
            Sign in
          </Link>
          <Link href={SIGN_UP_PATH} className="hover:text-foreground transition-colors">
            Sign up
          </Link>
        </nav>
      </div>
    </footer>
  );
}
