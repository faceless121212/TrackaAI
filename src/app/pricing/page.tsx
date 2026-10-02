import type { Metadata } from "next";
import Link from "next/link";
import { PricingTable } from "@/components/billing/pricing-table";
import { Faq, PRICING_FAQ } from "@/components/marketing/faq";
import { Eyebrow, MarketingShell, SectionHeading } from "@/components/marketing/marketing-shell";
import { PlanComparison } from "@/components/marketing/plan-comparison";
import { visitorPlanActions } from "@/components/marketing/pricing-section";
import { Button } from "@/components/ui/button";
import { PLAN_CATALOG, PLANS, type Plan } from "@/lib/domain";
import { settingsPath } from "@/lib/paths";
import { getCurrentUser } from "@/server/auth/session";
import { getRepositories } from "@/server/data";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Free for solo work, Lite for small teams, Pro for every AI feature. Priced per team, not per seat.",
};

/** The team the buttons act on: one the user owns (only owners change plans), else their first. */
async function billingTeam(userId: string) {
  const repos = getRepositories();
  const teams = await repos.teams.listForUser(userId);
  const roles = await Promise.all(teams.map((t) => repos.memberships.get(t.id, userId)));
  return teams.find((_, i) => roles[i]?.role === "owner") ?? teams[0];
}

// Public: works signed in (links to your team's billing) and signed out.
export default async function PricingPage() {
  const user = await getCurrentUser();
  const team = user ? await billingTeam(user.id) : undefined;

  const actions = user
    ? (Object.fromEntries(
        PLANS.map((plan) => [
          plan,
          <Button key={plan} className="w-full" variant={plan === "pro" ? "default" : "outline"} asChild>
            <Link href={team ? settingsPath(team.slug, "billing") : "/"}>
              {plan === team?.plan ? "Your current plan" : `Choose ${PLAN_CATALOG[plan].name}`}
            </Link>
          </Button>,
        ]),
      ) as Record<Plan, React.ReactNode>)
    : visitorPlanActions();

  return (
    <MarketingShell signedIn={Boolean(user)}>
      <section aria-labelledby="pricing-title" className="relative isolate overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 -z-10 h-[480px] bg-[radial-gradient(55%_60%_at_50%_0%,var(--mkt-glow),transparent_70%)]"
        />
        <div className="mx-auto max-w-6xl px-4 pt-20 pb-16 sm:px-6 sm:pt-28">
          <div className="mx-auto max-w-2xl space-y-4 text-center">
            <Eyebrow>Pricing</Eyebrow>
            <h1
              id="pricing-title"
              className="from-foreground to-foreground/55 bg-gradient-to-b bg-clip-text text-4xl font-semibold tracking-tight text-balance text-transparent sm:text-6xl"
            >
              Simple plans for every team size
            </h1>
            <p className="text-muted-foreground text-lg">Start free on your own. Upgrade when you bring your team.</p>
            {team && <p className="text-muted-foreground text-sm">Showing plans for {team.name}.</p>}
          </div>
          <div className="mt-14">
            <h2 className="sr-only">Plans</h2>
            <PricingTable current={team?.plan} actions={actions} />
          </div>
          <p className="text-muted-foreground mt-6 text-center text-sm">
            Prices are per team, billed monthly. Billing is simulated in this version: no card is charged.
          </p>
        </div>
      </section>

      <section aria-labelledby="compare-title" className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <div className="mb-10 space-y-4 text-center">
          <SectionHeading id="compare-title">Compare plans</SectionHeading>
        </div>
        <PlanComparison />
      </section>

      <Faq items={PRICING_FAQ} title="Pricing questions" />
    </MarketingShell>
  );
}
