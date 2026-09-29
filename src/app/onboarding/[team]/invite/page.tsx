import type { Metadata } from "next";
import { InviteForm } from "@/components/onboarding/invite-form";
import { OnboardingStep } from "@/components/onboarding/onboarding-step";
import { boardPath, teamPath } from "@/lib/paths";
import { requireTeamMember } from "@/server/auth/guards";

export const metadata: Metadata = { title: "Invite teammates" };

export default async function InvitePage({ params, searchParams }: PageProps<"/onboarding/[team]/invite">) {
  const { team } = await requireTeamMember((await params).team);
  const { board } = await searchParams;
  const boardId = typeof board === "string" ? board : "";

  return (
    <OnboardingStep
      step={3}
      title="Invite your teammates"
      description="They'll get an email with a link to join. You can always do this later."
    >
      <InviteForm
        teamSlug={team.slug}
        boardId={boardId}
        skipHref={boardId ? boardPath(team.slug, boardId) : teamPath(team.slug)}
      />
    </OnboardingStep>
  );
}
