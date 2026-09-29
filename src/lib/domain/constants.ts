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

// Label colours map to --label-<name> CSS variables in globals.css.
export const LABEL_COLORS = ["gray", "red", "orange", "yellow", "green", "blue", "purple", "pink"] as const;

// Seeded on every new team; editable from team settings in M3.
export const DEFAULT_LABELS = [
  { name: "Bug", color: "red" },
  { name: "Feature", color: "purple" },
  { name: "Improvement", color: "blue" },
  { name: "Docs", color: "gray" },
] as const;
