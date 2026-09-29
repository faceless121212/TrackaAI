import type { Role } from "@/lib/domain";

// Single source of truth for role checks. M3 adds member-management actions.
const EVERYONE = ["owner", "admin", "member"] as const;
const MANAGERS = ["owner", "admin"] as const;

const RULES = {
  "team:read": EVERYONE,
  "task:create": EVERYONE,
  "task:update": EVERYONE,
  "task:delete": EVERYONE,
  "comment:create": EVERYONE,
  "comment:moderate": MANAGERS, // delete other people's comments
  "workspace:create": MANAGERS,
  "workspace:update": MANAGERS,
  "workspace:delete": MANAGERS,
  "board:create": MANAGERS,
  "board:update": MANAGERS,
  "board:delete": MANAGERS,
  "column:manage": MANAGERS,
  "member:invite": MANAGERS,
} as const satisfies Record<string, readonly Role[]>;

export type Action = keyof typeof RULES;

export class ForbiddenError extends Error {
  constructor(role: Role, action: Action) {
    super(`A ${role} cannot ${action}`);
    this.name = "ForbiddenError";
  }
}

export function can(role: Role, action: Action): boolean {
  return (RULES[action] as readonly Role[]).includes(role);
}

export function assertCan(role: Role, action: Action): void {
  if (!can(role, action)) throw new ForbiddenError(role, action);
}
