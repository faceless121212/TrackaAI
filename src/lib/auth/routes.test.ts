import { describe, expect, it } from "vitest";
import { isOpenPath, isPublicPath, safeNextPath, signInRedirectPath, withNext } from "./routes";

describe("isPublicPath", () => {
  it("treats sign-in, sign-up and their sub-paths as public", () => {
    expect(isPublicPath("/sign-in")).toBe(true);
    expect(isPublicPath("/sign-in/magic")).toBe(true);
    expect(isPublicPath("/sign-up")).toBe(true);
  });

  it("treats everything else as protected", () => {
    expect(isPublicPath("/")).toBe(false);
    expect(isPublicPath("/sign-inx")).toBe(false);
    expect(isPublicPath("/acme/board")).toBe(false);
  });
});

describe("isOpenPath", () => {
  it("lets /sign-out and the email-confirmation callback through regardless of session", () => {
    expect(isOpenPath("/sign-out")).toBe(true);
    expect(isOpenPath("/auth/callback")).toBe(true);
    expect(isOpenPath("/sign-in")).toBe(false);
    expect(isOpenPath("/")).toBe(false);
  });
});

describe("signInRedirectPath", () => {
  it("omits next for the home page", () => {
    expect(signInRedirectPath("/", "")).toBe("/sign-in");
  });

  it("encodes the original path and query as next", () => {
    expect(signInRedirectPath("/acme/board", "?task=ENG-1")).toBe(
      "/sign-in?next=%2Facme%2Fboard%3Ftask%3DENG-1",
    );
  });
});

describe("safeNextPath", () => {
  it("keeps same-origin relative paths", () => {
    expect(safeNextPath("/acme/board?task=ENG-1")).toBe("/acme/board?task=ENG-1");
  });

  it.each([
    null,
    undefined,
    "",
    "https://evil.test",
    "//evil.test",
    "/\\evil.test",
    "acme",
    // Browsers strip tab/CR/LF from URLs, turning these into //evil.test.
    "/\t/evil.test",
    "/\n/evil.test",
    "/\r/evil.test",
  ])(
    "falls back to / for %s",
    (value) => {
      expect(safeNextPath(value)).toBe("/");
    },
  );
});

describe("withNext", () => {
  it("carries a safe next path between the auth pages", () => {
    expect(withNext("/sign-up", "/invite/abc")).toBe("/sign-up?next=%2Finvite%2Fabc");
    expect(withNext("/sign-up", "/")).toBe("/sign-up");
    expect(withNext("/sign-in", "https://evil.test")).toBe("/sign-in");
  });
});
