import type { Metadata } from "next";
import {
  InviteMembersForm,
  LeaveTeamButton,
  MemberList,
  PendingInvites,
} from "@/components/settings/members";
import { SettingsSection } from "@/components/settings/settings-section";
import { invitePath } from "@/lib/paths";
import { absoluteUrl } from "@/server/actions/shared";
import { requireTeamMember } from "@/server/auth/guards";
import { assignableRoles, can, canLeaveTeam, canManageMember } from "@/server/auth/permissions";
import { getRepositories } from "@/server/data";

export const metadata: Metadata = { title: "Members" };

export default async function MembersPage({ params }: PageProps<"/[team]/settings/members">) {
  const { user, team, membership } = await requireTeamMember((await params).team);
  const repos = getRepositories();
  const canInvite = can(membership.role, "member:invite");
  const [members, invites] = await Promise.all([
    repos.memberships.listMembers(team.id),
    canInvite ? repos.invites.listPending(team.id) : Promise.resolve([]),
  ]);
  const inviteRows = await Promise.all(
    invites.map(async (invite) => ({
      id: invite.id,
      email: invite.email,
      role: invite.role,
      expiresAt: invite.expiresAt,
      link: await absoluteUrl(invitePath(invite.token)),
    })),
  );

  return (
    <>
      <SettingsSection title="Members" description={`${members.length} ${members.length === 1 ? "person" : "people"} in ${team.name}.`}>
        <MemberList
          teamSlug={team.slug}
          currentUserId={user.id}
          assignableRoles={assignableRoles(membership.role)}
          canTransfer={can(membership.role, "ownership:transfer")}
          members={members.map((m) => ({
            userId: m.userId,
            name: m.user.name,
            email: m.user.email,
            avatarUrl: m.user.avatarUrl,
            role: m.role,
            manageable: m.userId !== user.id && canManageMember(membership.role, m.role),
          }))}
        />
      </SettingsSection>

      {canInvite && (
        <>
          <SettingsSection
            title="Invite people"
            description="They get a link that is valid for 7 days. Emails start sending in M5; until then, copy the link below."
          >
            <InviteMembersForm teamSlug={team.slug} />
          </SettingsSection>
          <SettingsSection title="Pending invites">
            <PendingInvites invites={inviteRows} />
          </SettingsSection>
        </>
      )}

      {canLeaveTeam(membership.role) && (
        <SettingsSection title="Leave team" description="You'll lose access to its workspaces and boards.">
          <LeaveTeamButton teamSlug={team.slug} teamName={team.name} />
        </SettingsSection>
      )}
    </>
  );
}
