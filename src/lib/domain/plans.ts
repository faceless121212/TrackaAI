import { PLANS, type Plan } from "./schemas";

export { PLANS };

/** What a plan limits. `aiRuns` is per team per calendar month (enforced from M7). */
export type PlanResource = "members" | "workspaces" | "aiRuns";

type PlanInfo = {
  name: string;
  /** Monthly price per team in USD (billing is simulated; no card is charged). */
  priceMonthly: number;
  tagline: string;
  /** null = unlimited. Members include the owner and pending invites. */
  limits: Record<PlanResource, number | null>;
  features: { copilot: boolean; aiTeammate: boolean };
};

// Single source of truth for plans: pricing pages, assertWithinPlan and the
// database's private.plan_limit() (a PGlite test keeps them in sync).
export const PLAN_CATALOG: Record<Plan, PlanInfo> = {
  free: {
    name: "Free",
    priceMonthly: 0,
    tagline: "For working on your own.",
    limits: { members: 1, workspaces: 1, aiRuns: 10 },
    features: { copilot: false, aiTeammate: false },
  },
  lite: {
    name: "Lite",
    priceMonthly: 10,
    tagline: "For you and a couple of teammates.",
    limits: { members: 3, workspaces: 10, aiRuns: 100 },
    features: { copilot: false, aiTeammate: false },
  },
  pro: {
    name: "Pro",
    priceMonthly: 25,
    tagline: "For growing teams, with every AI feature.",
    limits: { members: null, workspaces: null, aiRuns: null },
    features: { copilot: true, aiTeammate: true },
  },
};

const RESOURCE_NOUN: Record<PlanResource, string> = {
  members: "teammates",
  workspaces: "projects",
  aiRuns: "AI runs",
};

export function limitFor(plan: Plan, resource: PlanResource): number | null {
  return PLAN_CATALOG[plan].limits[resource];
}

/** Whether `adding` more fit on top of `used` under the plan's limit. */
export function canAdd(plan: Plan, resource: PlanResource, used: number, adding = 1): boolean {
  const limit = limitFor(plan, resource);
  return limit === null || used + adding <= limit;
}

/** Negative when `a` is a lower tier than `b`. */
export function compareTiers(a: Plan, b: Plan): number {
  return PLANS.indexOf(a) - PLANS.indexOf(b);
}

/** The cheapest plan above `plan` that allows more of `resource`, if any. */
export function nextPlanFor(plan: Plan, resource: PlanResource): Plan | null {
  const current = limitFor(plan, resource);
  return (
    PLANS.find((p) => {
      if (compareTiers(p, plan) <= 0) return false;
      const limit = limitFor(p, resource);
      return limit === null || (current !== null && limit > current);
    }) ?? null
  );
}

export function planLimitMessage(plan: Plan, resource: PlanResource): string {
  const noun = RESOURCE_NOUN[resource];
  const unit = resource === "members" ? "people" : noun;
  const solo = plan === "free" && resource === "members";
  const current = solo
    ? "The Free plan is for one person."
    : `The ${PLAN_CATALOG[plan].name} plan includes up to ${limitFor(plan, resource)} ${unit}.`;
  const next = nextPlanFor(plan, resource);
  if (!next) return current;
  const nextLimit = limitFor(next, resource);
  const gain = solo
    ? "to invite teammates"
    : nextLimit === null
      ? `for unlimited ${noun}`
      : `for up to ${nextLimit} ${unit}`;
  return `${current} Upgrade to ${PLAN_CATALOG[next].name} ${gain}.`;
}
