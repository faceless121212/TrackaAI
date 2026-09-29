import type { Role } from "@/lib/domain";

// Single source of truth for role checks. M3 adds member-management actions.
const RULES = {
  "team:read": ["owner", "admin", "member"],
  "task:create": ["owner", "admin", "member"],
  "workspace:create": ["owner", "admin"],
  "board:create": ["owner", "admin"],
  "member:invite": ["owner", "admin"],
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
