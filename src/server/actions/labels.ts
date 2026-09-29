"use server";

import { refresh } from "next/cache";
import { labelInputSchema, updateLabelInputSchema, type UpdateLabelInput } from "@/lib/domain";
import { formValues, type ActionResult, type FormState } from "@/lib/forms";
import { requireLabelAccess, requireTeamMember } from "@/server/auth/guards";
import { assertCan } from "@/server/auth/permissions";
import { getRepositories } from "@/server/data";
import { conflictToFormState, toActionError, zodToFormState } from "./shared";

export async function createLabelAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData, ["teamSlug", "name", "color"]);
  const { team, membership } = await requireTeamMember(values.teamSlug);
  assertCan(membership.role, "label:manage");
  const parsed = labelInputSchema.safeParse({ name: values.name, color: values.color });
  if (!parsed.success) return zodToFormState(parsed.error, values);

  try {
    await getRepositories().labels.create(team.id, parsed.data);
  } catch (error) {
    return conflictToFormState(error, values);
  }
  refresh();
  return { ok: true };
}

export async function updateLabelAction(labelId: string, patch: UpdateLabelInput): Promise<ActionResult> {
  try {
    const { membership } = await requireLabelAccess(labelId);
    assertCan(membership.role, "label:manage");
    await getRepositories().labels.update(labelId, updateLabelInputSchema.parse(patch));
  } catch (error) {
    return toActionError(error);
  }
  refresh();
  return { ok: true };
}

export async function deleteLabelAction(labelId: string): Promise<ActionResult> {
  try {
    const { membership } = await requireLabelAccess(labelId);
    assertCan(membership.role, "label:manage");
    await getRepositories().labels.delete(labelId);
  } catch (error) {
    return toActionError(error);
  }
  refresh();
  return { ok: true };
}
