import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { User } from "@/lib/domain";
import { SIGN_OUT_PATH } from "@/lib/auth/routes";
import { getRepositories } from "@/server/data";

/** The signed-in user's id (Supabase verifies the token locally: no round trip). */
export const getCurrentUserId = cache(async (): Promise<string | null> => getRepositories().auth.currentUserId());

/** The signed-in user, via whichever backend owns sessions (mock cookie or Supabase Auth). */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const userId = await getCurrentUserId();
  return userId ? getRepositories().users.getById(userId) : null;
});

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  // A session that no longer maps to a user (bad signature, reset database) is
  // cleared by /sign-out, which then sends the visitor to sign in.
  if (!user) redirect(SIGN_OUT_PATH);
  return user;
}

export async function requireUserId(): Promise<string> {
  const userId = await getCurrentUserId();
  if (!userId) redirect(SIGN_OUT_PATH);
  return userId;
}
