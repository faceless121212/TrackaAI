import type { Metadata } from "next";
import Link from "next/link";
import { DowngradeButton } from "@/components/billing/downgrade-button";
import { PricingTable } from "@/components/billing/pricing-table";
import { SettingsSection } from "@/components/settings/settings-section";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PLAN_CATALOG, PLANS, compareTiers, limitFor, planSchema, type Plan } from "@/lib/domain";
import { checkoutPath } from "@/lib/paths";
import { requireTeamMember } from "@/server/auth/guards";
import { can } from "@/server/auth/permissions";
import { getRepositories } from "@/server/data";

export const metadata: Metadata = { title: "Billing" };

function Meter({ label, used, limit }: { label: string; used: number; limit: number | null }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className="text-muted-foreground">{limit === null ? `${used} · Unlimited` : `${used} of ${limit}`}</span>
      </div>
      {limit !== null && <Progress value={Math.min(100, (used / limit) * 100)} aria-label={`${label} used`} />}
    </div>
  );
}

export default async function BillingPage({ params, searchParams }: PageProps<"/[team]/settings/billing">) {
  const { team, membership } = await requireTeamMember((await params).team);
  const { upgraded } = await searchParams;
  const usage = await getRepositories().teams.usage(team.id);
  const seats = usage.members + usage.pendingInvites;
  const canManage = can(membership.role, "billing:manage");
  const justUpgraded = planSchema.safeParse(upgraded);

  /** Which of `plan`'s limits the team is already above. */
  const overLimits = (plan: Plan) => {
    const over: string[] = [];
    const members = limitFor(plan, "members");
    const workspaces = limitFor(plan, "workspaces");
    if (members !== null && seats > members) over.push(`${seats} people and invites`);
    if (workspaces !== null && usage.workspaces > workspaces) over.push(`${usage.workspaces} workspaces`);
    return over;
  };
  const currentOver = overLimits(team.plan);

  const actions = Object.fromEntries(
    PLANS.map((plan) => {
      const tier = compareTiers(plan, team.plan);
      let action;
      if (tier === 0) {
        action = (
          <Button variant="outline" className="w-full" disabled>
            Current plan
          </Button>
        );
      } else if (!canManage) {
        action = <p className="text-muted-foreground text-sm">Only the team owner can change the plan.</p>;
      } else if (tier > 0) {
        action = (
          <Button className="w-full" asChild>
            <Link href={checkoutPath(team.slug, plan)}>Upgrade to {PLAN_CATALOG[plan].name}</Link>
          </Button>
        );
      } else {
        action = <DowngradeButton teamSlug={team.slug} plan={plan} overLimit={overLimits(plan)} />;
      }
      return [plan, action];
    }),
  ) as Record<Plan, React.ReactNode>;

  return (
    <>
      {justUpgraded.success && justUpgraded.data === team.plan && (
        <Alert>
          <AlertTitle>You&apos;re on {PLAN_CATALOG[team.plan].name} now</AlertTitle>
          <AlertDescription>Your new limits apply right away.</AlertDescription>
        </Alert>
      )}
      {currentOver.length > 0 && (
        <Alert variant="destructive">
          <AlertTitle>Your team is above the {PLAN_CATALOG[team.plan].name} plan&apos;s limits</AlertTitle>
          <AlertDescription>
            Everything you have is kept, but you can&apos;t add more ({currentOver.join(", ")}) until you&apos;re back
            under the limits or upgrade.
          </AlertDescription>
        </Alert>
      )}
      <SettingsSection
        title={`${PLAN_CATALOG[team.plan].name} plan`}
        description="What your team uses of its plan. Pending invites hold a seat until they're accepted or expire."
      >
        <div className="space-y-4">
          <Meter label="People" used={seats} limit={limitFor(team.plan, "members")} />
          <Meter label="Workspaces" used={usage.workspaces} limit={limitFor(team.plan, "workspaces")} />
        </div>
      </SettingsSection>
      <section className="space-y-3">
        <div className="space-y-1">
          <h2 className="font-medium">Plans</h2>
          <p className="text-muted-foreground text-sm">Billing is simulated in this version: no card is charged.</p>
        </div>
        <PricingTable current={team.plan} actions={actions} />
      </section>
    </>
  );
}
