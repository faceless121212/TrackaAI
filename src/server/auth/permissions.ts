import type { InviteRole, Role } from "@/lib/domain";

// Single source of truth for role checks. M3 adds member-management actions.
const EVERYONE = ["owner", "admin", "member"] as const;
const MANAGERS = ["owner", "admin"] as const;
const OWNER = ["owner"] as const;

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
  "team:update": MANAGERS,
  "label:manage": MANAGERS,
  "team:delete": OWNER,
  "billing:manage": OWNER,
  "ownership:transfer": OWNER,
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

/**
 * Whether `actor` may change `target`'s role or remove them. The owner manages
 * admins and members; admins manage members; nobody manages the owner
 * (ownership moves only through an explicit transfer).
 */
export function canManageMember(actor: Role, target: Role): boolean {
  if (target === "owner") return false;
  if (actor === "owner") return true;
  return actor === "admin" && target === "member";
}

/** Roles `actor` can give to someone they manage (never "owner"). */
export function assignableRoles(actor: Role): InviteRole[] {
  return actor === "member" ? [] : ["admin", "member"];
}

/** The owner has to transfer ownership before leaving, so a team always has one. */
export function canLeaveTeam(role: Role): boolean {
  return role !== "owner";
}
