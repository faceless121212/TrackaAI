import type { Metadata } from "next";
import Link from "next/link";
import { AddAgentForm, AgentList } from "@/components/settings/agents";
import { SettingsSection } from "@/components/settings/settings-section";
import { PLAN_CATALOG } from "@/lib/domain";
import { settingsPath } from "@/lib/paths";
import { requireTeamMember } from "@/server/auth/guards";
import { can } from "@/server/auth/permissions";
import { getRepositories } from "@/server/data";

export const metadata: Metadata = { title: "AI teammates" };

export default async function AgentsPage({ params }: PageProps<"/[team]/settings/agents">) {
  const { team, membership } = await requireTeamMember((await params).team);
  const agents = await getRepositories().agents.listForTeam(team.id);
  const canManage = can(membership.role, "agent:manage");
  const onPro = PLAN_CATALOG[team.plan].features.aiTeammate;

  return (
    <>
      <SettingsSection
        title="AI teammates"
        description="Assign a task to an AI teammate and it writes a first result (a spec, a plan, a draft) as a comment, then moves the task to In Review for a person to check."
      >
        {!onPro && (
          <p className="text-muted-foreground text-sm">
            AI teammates are part of the Pro plan.{" "}
            {can(membership.role, "billing:manage") ? (
              <Link href={settingsPath(team.slug, "billing")} className="text-foreground font-medium underline underline-offset-4">
                See plans
              </Link>
            ) : (
              "Ask the team owner to upgrade."
            )}
          </p>
        )}
        <AgentList
          teamSlug={team.slug}
          agents={agents.map(({ id, name, specialty }) => ({ id, name, specialty }))}
          canManage={canManage}
        />
      </SettingsSection>
      {canManage && onPro && (
        <SettingsSection title="Add an AI teammate">
          <AddAgentForm teamSlug={team.slug} />
        </SettingsSection>
      )}
    </>
  );
}
