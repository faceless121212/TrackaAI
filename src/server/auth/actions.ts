"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, SIGN_IN_PATH, safeNextPath } from "@/lib/auth/routes";

// M0 stub: any visitor becomes "dev-user". Replaced by mock auth in M1 and Supabase Auth in M4.
export async function devSignIn(formData: FormData) {
  const store = await cookies();
  store.set(SESSION_COOKIE, "dev-user", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
  });
  redirect(safeNextPath(formData.get("next")?.toString()));
}

export async function signOut() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect(SIGN_IN_PATH);
}
