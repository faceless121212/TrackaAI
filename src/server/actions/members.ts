"use server";

import { refresh, revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createInvitesInputSchema, inviteRoleSchema, parseEmailList } from "@/lib/domain";
import { formValues, type ActionResult, type FormState } from "@/lib/forms";
import { requireInviteAccess, requireTeamMember } from "@/server/auth/guards";
import { assertCan, assignableRoles, canLeaveTeam, canManageMember } from "@/server/auth/permissions";
import { getRepositories } from "@/server/data";
import { deliverInvites, toActionError, zodToFormState } from "./shared";

export async function inviteMembersAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData, ["teamSlug", "emails", "role"]);
  const { user, team, membership } = await requireTeamMember(values.teamSlug);
  assertCan(membership.role, "member:invite");
  const parsed = createInvitesInputSchema.safeParse({
    teamId: team.id,
    emails: parseEmailList(values.emails),
    role: values.role || undefined,
  });
  if (!parsed.success) return zodToFormState(parsed.error, values);

  const invites = await getRepositories().invites.create({ ...parsed.data, invitedBy: user.id });
  await deliverInvites(invites);
  refresh();
  const skipped = parsed.data.emails.length - invites.length;
  return {
    ok: true,
    formError: skipped > 0 ? `${skipped} already a member or already invited.` : undefined,
  };
}

async function requireInviteManager(inviteId: string) {
  const access = await requireInviteAccess(inviteId);
  assertCan(access.membership.role, "member:invite");
  return access;
}

export async function resendInviteAction(inviteId: string): Promise<ActionResult> {
  try {
    await requireInviteManager(inviteId);
    await deliverInvites([await getRepositories().invites.resend(inviteId)]);
  } catch (error) {
    return toActionError(error);
  }
  refresh();
  return { ok: true };
}

export async function revokeInviteAction(inviteId: string): Promise<ActionResult> {
  try {
    await requireInviteManager(inviteId);
    await getRepositories().invites.revoke(inviteId);
  } catch (error) {
    return toActionError(error);
  }
  refresh();
  return { ok: true };
}

const NOT_ALLOWED = "You don't have permission to change this member.";

/** Loads the caller and the target member and checks the caller may manage them. */
async function requireManageableMember(teamSlug: string, userId: string) {
  const { team, membership } = await requireTeamMember(teamSlug);
  const target = await getRepositories().memberships.get(team.id, userId);
  if (!target) return { ok: false as const, error: "This person is no longer a member." };
  if (!canManageMember(membership.role, target.role)) return { ok: false as const, error: NOT_ALLOWED };
  return { ok: true as const, team, membership, target };
}

export async function changeRoleAction(teamSlug: string, userId: string, role: string): Promise<ActionResult> {
  try {
    const access = await requireManageableMember(teamSlug, userId);
    if (!access.ok) return access;
    const next = inviteRoleSchema.parse(role);
    if (!assignableRoles(access.membership.role).includes(next)) return { ok: false, error: NOT_ALLOWED };
    await getRepositories().memberships.setRole(access.team.id, userId, next);
  } catch (error) {
    return toActionError(error);
  }
  refresh();
  return { ok: true };
}

export async function removeMemberAction(teamSlug: string, userId: string): Promise<ActionResult> {
  try {
    const access = await requireManageableMember(teamSlug, userId);
    if (!access.ok) return access;
    await getRepositories().memberships.remove(access.team.id, userId);
  } catch (error) {
    return toActionError(error);
  }
  refresh();
  return { ok: true };
}

export async function transferOwnershipAction(teamSlug: string, userId: string): Promise<ActionResult> {
  try {
    const { user, team, membership } = await requireTeamMember(teamSlug);
    assertCan(membership.role, "ownership:transfer");
    await getRepositories().memberships.transferOwnership(team.id, user.id, userId);
  } catch (error) {
    return toActionError(error);
  }
  refresh();
  return { ok: true };
}

export async function leaveTeamAction(teamSlug: string): Promise<ActionResult> {
  const { user, team, membership } = await requireTeamMember(teamSlug);
  if (!canLeaveTeam(membership.role)) {
    return { ok: false, error: "Transfer ownership to someone else before leaving." };
  }
  await getRepositories().memberships.remove(team.id, user.id);
  revalidatePath("/", "layout");
  redirect("/");
}
