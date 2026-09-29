// Columns seeded on every new board (PRD §5.1).
export const DEFAULT_COLUMNS = ["Backlog", "Todo", "In Progress", "In Review", "Done"] as const;

// Top-level routes that a team slug (/[team]) must never shadow.
export const RESERVED_SLUGS: readonly string[] = [
  "api",
  "invite",
  "onboarding",
  "settings",
  "sign-in",
  "sign-out",
  "sign-up",
];

export const MAX_INVITES_PER_BATCH = 10;
export const INVITE_TTL_DAYS = 7;
