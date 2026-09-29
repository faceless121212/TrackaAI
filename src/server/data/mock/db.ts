import type {
  Board,
  Column,
  Invite,
  Membership,
  Task,
  Team,
  User,
  Workspace,
} from "@/lib/domain";

// Shape of .data/mock-db.json. Mirrors the Supabase tables that arrive in M4.
export type MockDb = {
  version: 1;
  users: User[];
  credentials: { userId: string; passwordHash: string }[];
  teams: Team[];
  memberships: Membership[];
  workspaces: Workspace[];
  boards: Board[];
  columns: Column[];
  tasks: Task[];
  invites: Invite[];
};

export function emptyDb(): MockDb {
  return {
    version: 1,
    users: [],
    credentials: [],
    teams: [],
    memberships: [],
    workspaces: [],
    boards: [],
    columns: [],
    tasks: [],
    invites: [],
  };
}
