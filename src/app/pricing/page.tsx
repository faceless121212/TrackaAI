import type { Metadata } from "next";
import Link from "next/link";
import { PricingTable } from "@/components/billing/pricing-table";
import { Button } from "@/components/ui/button";
import { PLAN_CATALOG, PLANS, type Plan } from "@/lib/domain";
import { SIGN_IN_PATH, SIGN_UP_PATH } from "@/lib/auth/routes";
import { settingsPath } from "@/lib/paths";
import { getCurrentUser } from "@/server/auth/session";
import { getRepositories } from "@/server/data";

export const metadata: Metadata = { title: "Pricing" };

// Public: works signed in (links to your team's billing) and signed out.
export default async function PricingPage() {
  const user = await getCurrentUser();
  const [team] = user ? await getRepositories().teams.listForUser(user.id) : [];
  const href = team ? settingsPath(team.slug, "billing") : user ? "/" : SIGN_UP_PATH;

  const actions = Object.fromEntries(
    PLANS.map((plan) => [
      plan,
      <Button key={plan} className="w-full" variant={plan === "pro" ? "default" : "outline"} asChild>
        <Link href={href}>
          {user ? (plan === team?.plan ? "Your current plan" : `Choose ${PLAN_CATALOG[plan].name}`) : plan === "free" ? "Get started" : `Start with ${PLAN_CATALOG[plan].name}`}
        </Link>
      </Button>,
    ]),
  ) as Record<Plan, React.ReactNode>;

  return (
    <main className="mx-auto w-full max-w-5xl space-y-10 px-4 py-10 sm:px-6">
      <header className="flex items-center justify-between">
        <Link href="/" className="font-semibold">
          TrackaAI
        </Link>
        <Button variant="ghost" asChild>
          <Link href={user ? "/" : SIGN_IN_PATH}>{user ? "Open app" : "Sign in"}</Link>
        </Button>
      </header>
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-semibold">Simple plans for every team size</h1>
        <p className="text-muted-foreground">Start free on your own. Upgrade when you bring your team.</p>
      </div>
      <PricingTable current={team?.plan} actions={actions} />
      <p className="text-muted-foreground text-center text-sm">
        Prices are per team, billed monthly. Billing is simulated in this version: no card is charged.
      </p>
    </main>
  );
}
