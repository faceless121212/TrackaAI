"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { AUTH_CALLBACK_PATH, CHECK_EMAIL_PATH, SIGN_IN_PATH, safeNextPath, withNext } from "@/lib/auth/routes";
import { signInInputSchema, signUpInputSchema } from "@/lib/domain";
import { formValues, type FormState } from "@/lib/forms";
import { ONBOARDING_PATH } from "@/lib/paths";
import { ConflictError, getRepositories } from "@/server/data";
import { absoluteUrl } from "./shared";

export async function signUpAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData, ["name", "email", "password", "next"]);
  const echo = { name: values.name, email: values.email };
  const parsed = signUpInputSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values: echo };

  // Invitees arrive with ?next=/invite/<token>; everyone else starts onboarding.
  const next = safeNextPath(values.next);
  let needsConfirmation: boolean;
  try {
    ({ needsConfirmation } = await getRepositories().auth.signUp({
      ...parsed.data,
      // Where the confirmation email's link lands (Supabase); ignored by the mock.
      redirectTo: await absoluteUrl(withNext(AUTH_CALLBACK_PATH, next)),
    }));
  } catch (error) {
    if (error instanceof ConflictError) return { fieldErrors: { [error.field]: [error.message] }, values: echo };
    throw error;
  }
  if (needsConfirmation) redirect(CHECK_EMAIL_PATH);
  redirect(next === "/" ? ONBOARDING_PATH : next);
}

export async function signInAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData, ["email", "password", "next"]);
  const echo = { email: values.email };
  const parsed = signInInputSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values: echo };

  let user;
  try {
    user = await getRepositories().auth.signIn(parsed.data);
  } catch (error) {
    // e.g. the email isn't confirmed yet.
    if (error instanceof ConflictError) return { formError: error.message, values: echo };
    throw error;
  }
  if (!user) return { formError: "Invalid email or password.", values: echo };
  redirect(safeNextPath(values.next));
}

export async function signOutAction() {
  await getRepositories().auth.signOut();
  redirect(SIGN_IN_PATH);
}
