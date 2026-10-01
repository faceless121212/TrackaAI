import { planLimitMessage, type Plan, type PlanResource } from "@/lib/domain";

// Backend-agnostic errors. Server actions map them to form errors / 404s.

// The repositories are cached on globalThis (see ./index.ts), but a production
// build gives route handlers and pages their own copy of this module, so the
// class a repository threw from may not be the one a caller imports. Each error
// carries the `kind` of its class and ancestors under a global symbol, and
// `instanceof` checks those instead of the prototype chain. Every subclass
// declares its own `kind` (a class without one matches nothing, rather than
// everything its parent matches); class names aren't used, as bundlers mangle them.
const KINDS = Symbol.for("trackaai.error-kinds");
type Tagged = { [KINDS]?: string[] };

abstract class TaggedError extends Error {
  static readonly kind: string;

  static [Symbol.hasInstance](value: unknown): boolean {
    if (!Object.hasOwn(this, "kind")) return false;
    return typeof value === "object" && value !== null && ((value as Tagged)[KINDS]?.includes(this.kind) ?? false);
  }

  constructor(message: string) {
    super(message);
    const kinds: string[] = [];
    for (let c = new.target; c !== TaggedError; c = Object.getPrototypeOf(c)) {
      if (Object.hasOwn(c, "kind")) kinds.push(c.kind);
    }
    (this as Tagged)[KINDS] = kinds;
  }
}

export class NotFoundError extends TaggedError {
  static readonly kind: string = "NotFoundError";

  constructor(entity: string, id: string) {
    super(`${entity} ${id} not found`);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends TaggedError {
  static readonly kind: string = "ConflictError";

  /** The input field the conflict belongs to, e.g. "slug" or "email". */
  readonly field: string;

  constructor(field: string, message: string) {
    super(message);
    this.name = "ConflictError";
    this.field = field;
  }
}

/** The team's plan doesn't allow more of `resource`; the message names the plan to upgrade to. */
export class PlanLimitError extends ConflictError {
  static readonly kind: string = "PlanLimitError";

  readonly plan: Plan;
  readonly resource: PlanResource;

  constructor(plan: Plan, resource: PlanResource) {
    super("plan", planLimitMessage(plan, resource));
    this.name = "PlanLimitError";
    this.plan = plan;
    this.resource = resource;
  }
}

/** Too many requests in a short window; `retryAfter` is in seconds. */
export class RateLimitError extends TaggedError {
  static readonly kind: string = "RateLimitError";

  readonly retryAfter: number;

  constructor(retryAfter: number) {
    super("You're going a bit fast. Wait a minute, then try again.");
    this.name = "RateLimitError";
    this.retryAfter = retryAfter;
  }
}

// AI teammate run limits (enforced by start_agent_run and the mock alike).
export const AGENT_NOT_ASSIGNED = "Assign the task to this AI teammate first.";
export const AGENT_BUSY = "Your AI teammates are already working on 3 tasks. Try again when one finishes.";
export const AGENT_DAILY_LIMIT = "Your team has used today's 50 AI teammate runs. Try again tomorrow.";
export const AGENT_WORKER_MISSING = "AI teammates aren't set up on this server yet.";
