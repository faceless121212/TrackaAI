import type { Metadata } from "next";
import { CreateLabelForm, LabelList } from "@/components/settings/labels";
import { SettingsSection } from "@/components/settings/settings-section";
import { requireTeamMember } from "@/server/auth/guards";
import { can } from "@/server/auth/permissions";
import { getRepositories } from "@/server/data";

export const metadata: Metadata = { title: "Labels" };

export default async function LabelsPage({ params }: PageProps<"/[team]/settings/labels">) {
  const { team, membership } = await requireTeamMember((await params).team);
  const labels = await getRepositories().labels.listForTeam(team.id);
  const canManage = can(membership.role, "label:manage");

  return (
    <SettingsSection
      title="Labels"
      description={canManage ? "Click a name to rename it. Deleting a label removes it from every task." : "Owners and admins manage labels."}
    >
      <LabelList labels={labels} canManage={canManage} />
      {canManage && <CreateLabelForm teamSlug={team.slug} />}
    </SettingsSection>
  );
}
