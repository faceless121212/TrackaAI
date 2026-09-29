"use server";

import { refresh, revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { updateTeamInputSchema } from "@/lib/domain";
import { formValues, type FormState } from "@/lib/forms";
import { requireTeamMember } from "@/server/auth/guards";
import { assertCan } from "@/server/auth/permissions";
import { getRepositories } from "@/server/data";
import { zodToFormState } from "./shared";

export async function updateTeamAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData, ["teamSlug", "name"]);
  const { team, membership } = await requireTeamMember(values.teamSlug);
  assertCan(membership.role, "team:update");
  const parsed = updateTeamInputSchema.safeParse({ name: values.name });
  if (!parsed.success) return zodToFormState(parsed.error, values);

  await getRepositories().teams.update(team.id, parsed.data);
  refresh();
  return { ok: true };
}

export async function deleteTeamAction(teamSlug: string): Promise<void> {
  const { team, membership } = await requireTeamMember(teamSlug);
  assertCan(membership.role, "team:delete");
  await getRepositories().teams.delete(team.id);
  revalidatePath("/", "layout");
  redirect("/");
}
