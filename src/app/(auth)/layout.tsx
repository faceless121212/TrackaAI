import Link from "next/link";
import { PRICING_PATH } from "@/lib/auth/routes";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        {children}
        <p className="text-muted-foreground text-center text-sm">
          <Link href={PRICING_PATH} className="underline underline-offset-4">
            See plans and pricing
          </Link>
        </p>
      </div>
    </main>
  );
}
