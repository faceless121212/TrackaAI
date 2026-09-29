import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckoutForm } from "@/components/billing/checkout-form";
import { SettingsSection } from "@/components/settings/settings-section";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PLAN_CATALOG, compareTiers, planFeatures, planSchema } from "@/lib/domain";
import { settingsPath } from "@/lib/paths";
import { requireTeamMember } from "@/server/auth/guards";
import { can } from "@/server/auth/permissions";

export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage({ params, searchParams }: PageProps<"/[team]/settings/billing/checkout">) {
  const { team, membership } = await requireTeamMember((await params).team);
  const billing = settingsPath(team.slug, "billing");
  const parsed = planSchema.safeParse((await searchParams).plan);
  if (!can(membership.role, "billing:manage") || !parsed.success || compareTiers(parsed.data, team.plan) <= 0) {
    redirect(billing);
  }
  const plan = parsed.data;
  const info = PLAN_CATALOG[plan];

  return (
    <SettingsSection title={`Upgrade ${team.name} to ${info.name}`} description={info.tagline}>
      <Alert>
        <AlertTitle>Test mode</AlertTitle>
        <AlertDescription>
          This checkout is simulated: no card is needed and nothing is charged. Confirming switches the plan at once.
        </AlertDescription>
      </Alert>
      <dl className="divide-y rounded-md border text-sm">
        <div className="flex justify-between p-3">
          <dt>{info.name} plan</dt>
          <dd className="font-medium">${info.priceMonthly} / month</dd>
        </div>
        <div className="flex justify-between p-3">
          <dt className="text-muted-foreground">Includes</dt>
          <dd className="text-right">
            {planFeatures(plan)
              .filter((f) => f.included)
              .map((f) => f.label)
              .join(" · ")}
          </dd>
        </div>
        <div className="flex justify-between p-3">
          <dt className="font-medium">Due today</dt>
          <dd className="font-medium">$0.00 (simulated)</dd>
        </div>
      </dl>
      <CheckoutForm teamSlug={team.slug} plan={plan} cancelHref={billing} />
    </SettingsSection>
  );
}
