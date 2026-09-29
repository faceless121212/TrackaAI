import { describe, expect, it } from "vitest";
import { PLAN_CATALOG, PLANS, canAdd, compareTiers, limitFor, planLimitMessage } from "./plans";
import { RESERVED_SLUGS } from "./constants";

describe("plan limits", () => {
  it.each([
    ["free", "members", 1],
    ["free", "workspaces", 1],
    ["free", "aiRuns", 10],
    ["lite", "members", 3],
    ["lite", "workspaces", 10],
    ["lite", "aiRuns", 100],
    ["pro", "members", null],
    ["pro", "workspaces", null],
    ["pro", "aiRuns", null],
  ] as const)("%s allows %s: %s", (plan, resource, limit) => {
    expect(limitFor(plan, resource)).toBe(limit);
  });

  it("allows adding up to the limit and not past it", () => {
    expect(canAdd("lite", "members", 2)).toBe(true); // owner + 1 → a third fits
    expect(canAdd("lite", "members", 3)).toBe(false);
    expect(canAdd("lite", "members", 1, 2)).toBe(true); // exactly fills 3
    expect(canAdd("lite", "members", 1, 3)).toBe(false);
    expect(canAdd("free", "workspaces", 0)).toBe(true);
    expect(canAdd("free", "workspaces", 1)).toBe(false);
    expect(canAdd("pro", "members", 10_000, 50)).toBe(true);
  });

  it("gates the Pro-only AI features", () => {
    expect(PLAN_CATALOG.free.features.copilot).toBe(false);
    expect(PLAN_CATALOG.lite.features.aiTeammate).toBe(false);
    expect(PLAN_CATALOG.pro.features.copilot && PLAN_CATALOG.pro.features.aiTeammate).toBe(true);
  });

  it("orders tiers so the UI can say upgrade or downgrade", () => {
    expect(PLANS).toEqual(["free", "lite", "pro"]);
    expect(compareTiers("free", "lite")).toBeLessThan(0);
    expect(compareTiers("pro", "lite")).toBeGreaterThan(0);
    expect(compareTiers("lite", "lite")).toBe(0);
  });

  it("explains a reached limit and names the next plan", () => {
    expect(planLimitMessage("free", "members")).toBe(
      "The Free plan is for one person. Upgrade to Lite to invite teammates.",
    );
    expect(planLimitMessage("lite", "workspaces")).toBe(
      "The Lite plan includes up to 10 workspaces. Upgrade to Pro for unlimited workspaces.",
    );
  });

  it("keeps /pricing and /auth free of team slugs", () => {
    expect(RESERVED_SLUGS).toEqual(expect.arrayContaining(["pricing", "auth"]));
  });
});
