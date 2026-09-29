"use server";

import { refresh, revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { compareTiers, planSchema } from "@/lib/domain";
import { formValues, type ActionResult, type FormState } from "@/lib/forms";
import { settingsPath, teamPath } from "@/lib/paths";
import { requireTeamMember } from "@/server/auth/guards";
import { assertCan } from "@/server/auth/permissions";
import { getRepositories } from "@/server/data";
import { toActionError } from "./shared";

// Billing is simulated: a confirmed checkout switches the plan directly. A real
// payment provider would switch it from its webhook instead.

/** The simulated checkout's "Subscribe": moves the team up to a paid plan. */
export async function completeCheckoutAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData, ["teamSlug", "plan"]);
  const { team, membership } = await requireTeamMember(values.teamSlug);
  assertCan(membership.role, "billing:manage");
  const plan = planSchema.safeParse(values.plan);
  if (!plan.success || compareTiers(plan.data, team.plan) <= 0) {
    return { formError: "Choose a plan above your current one." };
  }

  await getRepositories().teams.setPlan(team.id, plan.data);
  revalidatePath(teamPath(team.slug), "layout");
  redirect(`${settingsPath(team.slug, "billing")}?upgraded=${plan.data}`);
}

/** Moves the team down to a cheaper plan. Nothing is deleted; limits apply to new additions. */
export async function downgradeAction(teamSlug: string, plan: string): Promise<ActionResult> {
  try {
    const { team, membership } = await requireTeamMember(teamSlug);
    assertCan(membership.role, "billing:manage");
    const next = planSchema.parse(plan);
    if (compareTiers(next, team.plan) >= 0) return { ok: false, error: "Upgrades go through checkout." };
    await getRepositories().teams.setPlan(team.id, next);
  } catch (error) {
    return toActionError(error);
  }
  refresh();
  return { ok: true };
}
