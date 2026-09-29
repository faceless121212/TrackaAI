import "server-only";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/auth/routes";
import type { SessionStore } from "@/server/data/mock/session";
import { SESSION_TTL_SECONDS, signSessionToken, verifySessionToken } from "./session-token";

// Mock backend only: an HMAC-signed cookie. Supabase Auth sets its own cookies.
const SECRET = process.env.SESSION_SECRET || "trackaai-mock-dev-secret";

export const cookieSession: SessionStore = {
  async get() {
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    return token ? verifySessionToken(token, SECRET) : null;
  },
  async set(userId) {
    (await cookies()).set(SESSION_COOKIE, signSessionToken(userId, SECRET), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: SESSION_TTL_SECONDS,
    });
  },
  async clear() {
    (await cookies()).delete(SESSION_COOKIE);
  },
};
