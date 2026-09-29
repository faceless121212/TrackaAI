import type { Metadata } from "next";
import { CreateTeamForm } from "@/components/onboarding/create-team-form";
import { OnboardingStep } from "@/components/onboarding/onboarding-step";

export const metadata: Metadata = { title: "Create your team" };

export default function CreateTeamPage() {
  return (
    <OnboardingStep
      step={1}
      title="Create your team"
      description="Your team holds workspaces, boards and people."
    >
      <CreateTeamForm />
    </OnboardingStep>
  );
}
