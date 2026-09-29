import { describe, expect, it } from "vitest";
import { PLAN_CATALOG, PLANS, canAdd, compareTiers, limitFor, planFeatures, planLimitMessage } from "./plans";
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
    expect(planLimitMessage("free", "workspaces")).toBe(
      "The Free plan includes 1 workspace. Upgrade to Lite for up to 10 workspaces.",
    );
    expect(planLimitMessage("lite", "workspaces")).toBe(
      "The Lite plan includes up to 10 workspaces. Upgrade to Pro for unlimited workspaces.",
    );
  });

  it("describes each plan for the pricing table", () => {
    expect(planFeatures("free")).toEqual([
      { label: "Just you", included: true },
      { label: "1 workspace", included: true },
      { label: "10 AI runs / month", included: true },
      { label: "Board copilot", included: false },
      { label: "AI teammate", included: false },
    ]);
    expect(planFeatures("lite").slice(0, 3).map((f) => f.label)).toEqual([
      "Up to 3 people",
      "Up to 10 workspaces",
      "100 AI runs / month",
    ]);
    expect(planFeatures("pro").every((f) => f.included)).toBe(true);
    expect(planFeatures("pro")[0].label).toBe("Unlimited people");
  });

  it("keeps /pricing and /auth free of team slugs", () => {
    expect(RESERVED_SLUGS).toEqual(expect.arrayContaining(["pricing", "auth"]));
  });
});
