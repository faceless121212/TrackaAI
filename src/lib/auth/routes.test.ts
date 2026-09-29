import { describe, expect, it } from "vitest";
import { isPublicPath, safeNextPath, signInRedirectPath } from "./routes";

describe("isPublicPath", () => {
  it("treats sign-in and its sub-paths as public", () => {
    expect(isPublicPath("/sign-in")).toBe(true);
    expect(isPublicPath("/sign-in/magic")).toBe(true);
  });

  it("treats everything else as protected", () => {
    expect(isPublicPath("/")).toBe(false);
    expect(isPublicPath("/sign-inx")).toBe(false);
    expect(isPublicPath("/acme/board")).toBe(false);
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

  it.each([null, undefined, "", "https://evil.test", "//evil.test", "/\\evil.test", "acme"])(
    "falls back to / for %s",
    (value) => {
      expect(safeNextPath(value)).toBe("/");
    },
  );
});
