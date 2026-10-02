import { describe, expect, it } from "vitest";
import { configuredAppUrl, resolveAppOrigin } from "./app-url";

describe("resolveAppOrigin", () => {
  it("prefers the configured APP_URL, ignoring request headers", () => {
    expect(
      resolveAppOrigin({ appUrl: "https://tracka.app/some/path", host: "evil.test", proto: "https", production: true }),
    ).toBe("https://tracka.app");
  });

  it("falls back to the request host in development", () => {
    expect(resolveAppOrigin({ host: "localhost:3000", production: false })).toBe("http://localhost:3000");
    expect(resolveAppOrigin({ host: "tracka.test", proto: "https", production: false })).toBe("https://tracka.test");
  });

  it("refuses to trust the Host header in production", () => {
    expect(() => resolveAppOrigin({ host: "evil.test", production: true })).toThrow(/APP_URL/);
  });
});

describe("configuredAppUrl", () => {
  it("uses APP_URL, else the deployment address Vercel sets (never a request header)", () => {
    expect(configuredAppUrl({ APP_URL: "https://tracka.app", VERCEL_URL: "x.vercel.app" })).toBe("https://tracka.app");
    expect(configuredAppUrl({ VERCEL_URL: "trackaai-git-feature-acme.vercel.app" })).toBe("https://trackaai-git-feature-acme.vercel.app");
    expect(configuredAppUrl({})).toBeUndefined();
    expect(configuredAppUrl({ APP_URL: "" })).toBeUndefined();
  });
});
