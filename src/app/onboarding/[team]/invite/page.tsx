import type { Metadata } from "next";
import Link from "next/link";
import { InviteForm } from "@/components/onboarding/invite-form";
import { OnboardingStep } from "@/components/onboarding/onboarding-step";
import { Button } from "@/components/ui/button";
import { canAdd, planLimitMessage } from "@/lib/domain";
import { boardPath, settingsPath, teamPath } from "@/lib/paths";
import { requireTeamMember } from "@/server/auth/guards";

export const metadata: Metadata = { title: "Invite teammates" };

export default async function InvitePage({ params, searchParams }: PageProps<"/onboarding/[team]/invite">) {
  const { team } = await requireTeamMember((await params).team);
  const { board } = await searchParams;
  const boardId = typeof board === "string" ? board : "";
  const next = boardId ? boardPath(team.slug, boardId) : teamPath(team.slug);

  // New teams start on Free, which is for one person: offer the plans instead.
  if (!canAdd(team.plan, "members", 1)) {
    return (
      <OnboardingStep step={3} title="Working with others?" description={planLimitMessage(team.plan, "members")}>
        <div className="flex gap-2">
          <Button className="flex-1" asChild>
            <Link href={next}>Go to your board</Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href={settingsPath(team.slug, "billing")}>See plans</Link>
          </Button>
        </div>
      </OnboardingStep>
    );
  }

  return (
    <OnboardingStep
      step={3}
      title="Invite your teammates"
      description="They'll get a link to join. You can always do this later."
    >
      <InviteForm teamSlug={team.slug} boardId={boardId} skipHref={next} />
    </OnboardingStep>
  );
}
