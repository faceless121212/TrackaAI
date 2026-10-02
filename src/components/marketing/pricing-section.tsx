import { ArrowRight, CreditCard } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { PricingTable } from "@/components/billing/pricing-table";
import { Button } from "@/components/ui/button";
import { PLAN_CATALOG, PLANS, type Plan } from "@/lib/domain";
import { PRICING_PATH, SIGN_UP_PATH } from "@/lib/auth/routes";
import { Eyebrow, SectionHeading } from "./marketing-shell";

/** Sign-up buttons for visitors: one per plan. */
export function visitorPlanActions(): Record<Plan, ReactNode> {
  return Object.fromEntries(
    PLANS.map((plan) => [
      plan,
      <Button key={plan} className="w-full" variant={plan === "pro" ? "default" : "outline"} asChild>
        <Link href={SIGN_UP_PATH}>{plan === "free" ? "Get started" : `Start with ${PLAN_CATALOG[plan].name}`}</Link>
      </Button>,
    ]),
  ) as Record<Plan, ReactNode>;
}

/** The landing page's pricing: the shared table, then a link to the full comparison. */
export function PricingSection() {
  return (
    <section id="pricing" aria-labelledby="pricing-title" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-24 sm:px-6 sm:py-32">
      <div className="mx-auto max-w-2xl space-y-4 text-center">
        <Eyebrow icon={CreditCard} center>
          Pricing
        </Eyebrow>
        <SectionHeading id="pricing-title">Simple pricing that grows with your team</SectionHeading>
        <p className="text-muted-foreground text-lg">Per team, not per seat. Start free and upgrade when you bring people in.</p>
      </div>
      <div className="mt-14">
        <PricingTable actions={visitorPlanActions()} />
      </div>
      <div className="mt-8 text-center">
        <Button variant="link" asChild>
          <Link href={PRICING_PATH}>
            Compare every plan <ArrowRight aria-hidden />
          </Link>
        </Button>
      </div>
    </section>
  );
}
