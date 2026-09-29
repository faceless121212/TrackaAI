"use server";

import { refresh } from "next/cache";
import { themeSchema, updateProfileInputSchema } from "@/lib/domain";
import { formValues, type ActionResult, type FormState } from "@/lib/forms";
import { requireUser } from "@/server/auth/session";
import { getRepositories } from "@/server/data";
import { toActionError, zodToFormState } from "./shared";

export async function updateProfileAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const values = formValues(formData, ["name", "avatarUrl", "theme"]);
  const parsed = updateProfileInputSchema.safeParse({
    name: values.name,
    avatarUrl: values.avatarUrl.trim() || null,
    theme: values.theme,
  });
  if (!parsed.success) return zodToFormState(parsed.error, values);

  await getRepositories().users.update(user.id, parsed.data);
  refresh();
  return { ok: true };
}

/** Persists the theme picked from the header toggle or the palette (PRD §6: per-user preference). */
export async function setThemePreferenceAction(theme: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await getRepositories().users.update(user.id, { theme: themeSchema.parse(theme) });
  } catch (error) {
    return toActionError(error);
  }
  return { ok: true };
}
