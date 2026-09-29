import type { Metadata } from "next";
import { SettingsSection } from "@/components/settings/settings-section";
import { DeleteTeamButton, TeamNameForm } from "@/components/settings/team-forms";
import { requireTeamMember } from "@/server/auth/guards";
import { can } from "@/server/auth/permissions";

export const metadata: Metadata = { title: "Team settings" };

export default async function GeneralSettingsPage({ params }: PageProps<"/[team]/settings">) {
  const { team, membership } = await requireTeamMember((await params).team);

  return (
    <>
      <SettingsSection title="Team" description={`Your team lives at /${team.slug}.`}>
        {can(membership.role, "team:update") ? (
          <TeamNameForm teamSlug={team.slug} name={team.name} />
        ) : (
          <p className="text-sm">{team.name}</p>
        )}
      </SettingsSection>
      {can(membership.role, "team:delete") && (
        <SettingsSection title="Danger zone" description="Deleting the team removes everything in it for everyone.">
          <DeleteTeamButton teamSlug={team.slug} name={team.name} />
        </SettingsSection>
      )}
    </>
  );
}
