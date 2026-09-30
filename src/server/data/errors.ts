import { planLimitMessage, type Plan, type PlanResource } from "@/lib/domain";

// Backend-agnostic errors. Server actions map them to form errors / 404s.

// The repositories are cached on globalThis (see ./index.ts), but a production
// build gives route handlers and pages their own copy of this module, so the
// class a repository threw from may not be the one a caller imports. Each error
// carries its kinds under a global symbol, and `instanceof` checks those
// instead of the prototype chain.
const KINDS = Symbol.for("trackaai.error-kinds");
type Tagged = { [KINDS]?: string[] };

function tag(error: Error, kind: string) {
  const tagged = error as Error & Tagged;
  tagged[KINDS] = [...(tagged[KINDS] ?? []), kind];
}

function hasKind(value: unknown, kind: string): boolean {
  return typeof value === "object" && value !== null && ((value as Tagged)[KINDS]?.includes(kind) ?? false);
}

export class NotFoundError extends Error {
  static [Symbol.hasInstance](value: unknown): value is NotFoundError {
    return hasKind(value, "NotFoundError");
  }

  constructor(entity: string, id: string) {
    super(`${entity} ${id} not found`);
    this.name = "NotFoundError";
    tag(this, "NotFoundError");
  }
}

export class ConflictError extends Error {
  static [Symbol.hasInstance](value: unknown): value is ConflictError {
    return hasKind(value, "ConflictError");
  }

  /** The input field the conflict belongs to, e.g. "slug" or "email". */
  readonly field: string;

  constructor(field: string, message: string) {
    super(message);
    this.name = "ConflictError";
    this.field = field;
    tag(this, "ConflictError");
  }
}

/** The team's plan doesn't allow more of `resource`; the message names the plan to upgrade to. */
export class PlanLimitError extends ConflictError {
  static [Symbol.hasInstance](value: unknown): value is PlanLimitError {
    return hasKind(value, "PlanLimitError");
  }

  readonly plan: Plan;
  readonly resource: PlanResource;

  constructor(plan: Plan, resource: PlanResource) {
    super("plan", planLimitMessage(plan, resource));
    this.name = "PlanLimitError";
    this.plan = plan;
    this.resource = resource;
    tag(this, "PlanLimitError");
  }
}

/** Too many requests in a short window; `retryAfter` is in seconds. */
export class RateLimitError extends Error {
  static [Symbol.hasInstance](value: unknown): value is RateLimitError {
    return hasKind(value, "RateLimitError");
  }

  readonly retryAfter: number;

  constructor(retryAfter: number) {
    super("You're going a bit fast. Wait a minute, then try again.");
    this.name = "RateLimitError";
    this.retryAfter = retryAfter;
    tag(this, "RateLimitError");
  }
}

// AI teammate run limits (enforced by start_agent_run and the mock alike).
export const AGENT_NOT_ASSIGNED = "Assign the task to this AI teammate first.";
export const AGENT_BUSY = "Your AI teammates are already working on 3 tasks. Try again when one finishes.";
export const AGENT_DAILY_LIMIT = "Your team has used today's 50 AI teammate runs. Try again tomorrow.";
