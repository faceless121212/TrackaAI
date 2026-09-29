import { describe, expect, it } from "vitest";
import { parseAiError } from "./ai-error";

describe("parseAiError", () => {
  it("reads the route's JSON error and upgrade link", () => {
    const error = new Error(JSON.stringify({ error: "Out of AI runs.", upgradeHref: "/acme/settings/billing" }));
    expect(parseAiError(error)).toEqual({ message: "Out of AI runs.", upgradeHref: "/acme/settings/billing" });
  });

  it("falls back to a generic message", () => {
    expect(parseAiError(new Error("<html>"))).toEqual({ message: "The AI couldn't finish. Please try again." });
    expect(parseAiError(new Error("Failed to fetch"))).toEqual({ message: "Failed to fetch" });
    expect(parseAiError(undefined)).toBeNull();
  });
});
