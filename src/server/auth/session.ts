import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { User } from "@/lib/domain";
import { SIGN_OUT_PATH } from "@/lib/auth/routes";
import { getRepositories } from "@/server/data";

/** The signed-in user, via whichever backend owns sessions (mock cookie or Supabase Auth). */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const repos = getRepositories();
  const userId = await repos.auth.currentUserId();
  return userId ? repos.users.getById(userId) : null;
});

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  // A session that no longer maps to a user (bad signature, reset database) is
  // cleared by /sign-out, which then sends the visitor to sign in.
  if (!user) redirect(SIGN_OUT_PATH);
  return user;
}
