import type { Metadata } from "next";
import { CreateWorkspaceForm } from "@/components/onboarding/create-workspace-form";
import { OnboardingStep } from "@/components/onboarding/onboarding-step";
import { createWorkspaceAction } from "@/server/actions/onboarding";
import { requireTeamMember } from "@/server/auth/guards";

export const metadata: Metadata = { title: "Create a workspace" };

export default async function CreateWorkspacePage({ params }: PageProps<"/onboarding/[team]/workspace">) {
  const { team } = await requireTeamMember((await params).team);

  return (
    <OnboardingStep
      step={2}
      title="Create your first workspace"
      description="Workspaces group boards, like Engineering or Marketing. The key prefix starts every task ID."
    >
      <CreateWorkspaceForm teamSlug={team.slug} action={createWorkspaceAction} />
    </OnboardingStep>
  );
}
