import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { User } from "@/lib/domain";
import { SESSION_COOKIE, SIGN_OUT_PATH } from "@/lib/auth/routes";
import { getRepositories } from "@/server/data";
import { SESSION_TTL_SECONDS, signSessionToken, verifySessionToken } from "./session-token";

// Mock backend only; Supabase Auth manages sessions from M4 on.
const SECRET = process.env.SESSION_SECRET || "trackaai-mock-dev-secret";

export async function startSession(userId: string) {
  const store = await cookies();
  store.set(SESSION_COOKIE, signSessionToken(userId, SECRET), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function endSession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export const getCurrentUser = cache(async (): Promise<User | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const userId = token ? verifySessionToken(token, SECRET) : null;
  return userId ? getRepositories().users.getById(userId) : null;
});

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  // A cookie that no longer maps to a user (bad signature, reset mock db) is
  // cleared by /sign-out, which then sends the visitor to sign in.
  if (!user) redirect(SIGN_OUT_PATH);
  return user;
}
