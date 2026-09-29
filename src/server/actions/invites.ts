"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FormState } from "@/lib/forms";
import { teamPath } from "@/lib/paths";
import { requireUser } from "@/server/auth/session";
import { ConflictError, NotFoundError, getRepositories } from "@/server/data";

export async function acceptInviteAction(token: string): Promise<FormState> {
  const user = await requireUser();
  const repos = getRepositories();
  let teamId: string;
  try {
    teamId = (await repos.invites.accept(token, user.id)).teamId;
  } catch (error) {
    if (error instanceof ConflictError) return { formError: error.message };
    if (error instanceof NotFoundError) return { formError: "This invite link is no longer valid." };
    throw error;
  }
  const team = await repos.teams.get(teamId);
  revalidatePath("/", "layout");
  redirect(team ? teamPath(team.slug) : "/");
}
