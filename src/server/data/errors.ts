import { planLimitMessage, type Plan, type PlanResource } from "@/lib/domain";

// Backend-agnostic errors. Server actions map them to form errors / 404s.

export class NotFoundError extends Error {
  constructor(entity: string, id: string) {
    super(`${entity} ${id} not found`);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends Error {
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
  readonly plan: Plan;
  readonly resource: PlanResource;

  constructor(plan: Plan, resource: PlanResource) {
    super("plan", planLimitMessage(plan, resource));
    this.name = "PlanLimitError";
    this.plan = plan;
    this.resource = resource;
  }
}

// AI teammate run limits (enforced by start_agent_run and the mock alike).
export const AGENT_NOT_ASSIGNED = "Assign the task to this AI teammate first.";
export const AGENT_BUSY = "Your AI teammates are already working on 3 tasks. Try again when one finishes.";
export const AGENT_DAILY_LIMIT = "Your team has used today's 50 AI teammate runs. Try again tomorrow.";
