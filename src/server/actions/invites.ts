"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FormState } from "@/lib/forms";
import { teamPath } from "@/lib/paths";
import { requireUser } from "@/server/auth/session";
import { assertSeatToJoin } from "@/server/billing/limits";
import { ConflictError, NotFoundError, PlanLimitError, getRepositories } from "@/server/data";

export async function acceptInviteAction(token: string): Promise<FormState> {
  const user = await requireUser();
  const repos = getRepositories();
  let teamId: string;
  const preview = await repos.invites.preview(token);
  try {
    // A used, expired or wrong-account invite gets its own error from accept().
    const live = preview && !preview.invite.acceptedAt && new Date(preview.invite.expiresAt) > new Date();
    if (live) await assertSeatToJoin(repos, preview.invite.teamId);
    teamId = (await repos.invites.accept(token, user.id)).teamId;
  } catch (error) {
    // The upgrade copy is for the owner; the invitee can only ask them.
    if (error instanceof PlanLimitError) {
      const team = preview?.teamName ?? "This team";
      return { formError: `${team} is full on its current plan. Ask the team owner to upgrade, then try again.` };
    }
    if (error instanceof ConflictError) return { formError: error.message };
    if (error instanceof NotFoundError) return { formError: "This invite link is no longer valid." };
    throw error;
  }
  const team = await repos.teams.get(teamId);
  revalidatePath("/", "layout");
  redirect(team ? teamPath(team.slug) : "/");
}
