import type {
  Board,
  Column,
  Comment,
  Invite,
  Label,
  Membership,
  Task,
  Team,
  User,
  Workspace,
} from "@/lib/domain";
import type { AiUsageInput } from "../types";

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
  labels: Label[];
  comments: Comment[];
  aiUsage: (AiUsageInput & { id: string; createdAt: string })[];
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
    labels: [],
    comments: [],
    aiUsage: [],
  };
}
