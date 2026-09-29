"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { SIGN_IN_PATH, safeNextPath } from "@/lib/auth/routes";
import { signInInputSchema, signUpInputSchema } from "@/lib/domain";
import { formValues, type FormState } from "@/lib/forms";
import { ONBOARDING_PATH } from "@/lib/paths";
import { endSession, startSession } from "@/server/auth/session";
import { ConflictError, getRepositories } from "@/server/data";

export async function signUpAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData, ["name", "email", "password", "next"]);
  const echo = { name: values.name, email: values.email };
  const parsed = signUpInputSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values: echo };

  let userId: string;
  try {
    userId = (await getRepositories().auth.signUp(parsed.data)).id;
  } catch (error) {
    if (error instanceof ConflictError) return { fieldErrors: { [error.field]: [error.message] }, values: echo };
    throw error;
  }
  await startSession(userId);
  // Invitees arrive with ?next=/invite/<token>; everyone else starts onboarding.
  const next = safeNextPath(values.next);
  redirect(next === "/" ? ONBOARDING_PATH : next);
}

export async function signInAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData, ["email", "password", "next"]);
  const echo = { email: values.email };
  const parsed = signInInputSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values: echo };

  const user = await getRepositories().auth.signIn(parsed.data);
  if (!user) return { formError: "Invalid email or password.", values: echo };
  await startSession(user.id);
  redirect(safeNextPath(values.next));
}

export async function signOutAction() {
  await endSession();
  redirect(SIGN_IN_PATH);
}
