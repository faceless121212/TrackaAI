import { describe, expect, it } from "vitest";
import { SESSION_TTL_SECONDS, signSessionToken, verifySessionToken } from "./session-token";

const SECRET = "test-secret";
const NOW = Date.UTC(2026, 0, 1);

describe("session tokens", () => {
  it("round-trips the user id", () => {
    const token = signSessionToken("user-1", SECRET, NOW);
    expect(verifySessionToken(token, SECRET, NOW)).toBe("user-1");
  });

  it("rejects a token signed with another secret", () => {
    const token = signSessionToken("user-1", "other", NOW);
    expect(verifySessionToken(token, SECRET, NOW)).toBeNull();
  });

  it("rejects a tampered user id", () => {
    const [, expiresAt, signature] = signSessionToken("user-1", SECRET, NOW).split(".");
    expect(verifySessionToken(`user-2.${expiresAt}.${signature}`, SECRET, NOW)).toBeNull();
  });

  it("rejects an expired token", () => {
    const token = signSessionToken("user-1", SECRET, NOW);
    expect(verifySessionToken(token, SECRET, NOW + SESSION_TTL_SECONDS * 1000)).toBeNull();
  });

  it.each(["", "garbage", "a.b", "a.b.c.d"])("rejects malformed token %j", (token) => {
    expect(verifySessionToken(token, SECRET, NOW)).toBeNull();
  });
});
