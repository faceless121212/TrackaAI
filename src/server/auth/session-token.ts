import { createHmac, timingSafeEqual } from "node:crypto";

// Mock-backend sessions: "<userId>.<expiresAt>.<hmac>". Supabase Auth replaces this in M4.
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function signSessionToken(userId: string, secret: string, now = Date.now()): string {
  const expiresAt = Math.floor(now / 1000) + SESSION_TTL_SECONDS;
  const payload = `${userId}.${expiresAt}`;
  return `${payload}.${sign(payload, secret)}`;
}

export function verifySessionToken(token: string, secret: string, now = Date.now()): string | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [userId, expiresAt, signature] = parts;
  const expected = Buffer.from(sign(`${userId}.${expiresAt}`, secret));
  const actual = Buffer.from(signature);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  if (Number(expiresAt) * 1000 <= now) return null;
  return userId;
}
