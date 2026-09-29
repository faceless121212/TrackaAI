import type {
  Board,
  Column,
  CreateBoardInput,
  CreateTaskInput,
  CreateTeamInput,
  CreateWorkspaceInput,
  Membership,
  Role,
  Task,
  Team,
  UpdateTaskInput,
  User,
  Workspace,
} from "@/lib/domain";

// Every backend (mock in M1, Supabase in M4) implements these. UI and server
// actions depend only on this file, never on a concrete backend.

export interface UsersRepo {
  getById(id: string): Promise<User | null>;
  getByEmail(email: string): Promise<User | null>;
  create(input: { email: string; name: string }): Promise<User>;
}

export interface TeamsRepo {
  /** Creates the team and makes `ownerId` its owner. */
  create(input: CreateTeamInput & { ownerId: string }): Promise<Team>;
  getBySlug(slug: string): Promise<Team | null>;
  listForUser(userId: string): Promise<Team[]>;
}

export interface MembershipsRepo {
  list(teamId: string): Promise<Membership[]>;
  get(teamId: string, userId: string): Promise<Membership | null>;
  setRole(teamId: string, userId: string, role: Role): Promise<Membership>;
  remove(teamId: string, userId: string): Promise<void>;
}

export interface WorkspacesRepo {
  create(input: CreateWorkspaceInput): Promise<Workspace>;
  get(id: string): Promise<Workspace | null>;
  listForTeam(teamId: string): Promise<Workspace[]>;
}

export interface BoardsRepo {
  /** Creates the board and seeds DEFAULT_COLUMNS. */
  create(input: CreateBoardInput): Promise<Board>;
  get(id: string): Promise<Board | null>;
  listForWorkspace(workspaceId: string): Promise<Board[]>;
  listColumns(boardId: string): Promise<Column[]>;
}

export interface TasksRepo {
  /** Allocates the next task number for the board's workspace and places the task last in its column. */
  create(input: CreateTaskInput & { createdBy: string }): Promise<Task>;
  getByKey(workspaceId: string, key: string): Promise<Task | null>;
  listForBoard(boardId: string): Promise<Task[]>;
  update(id: string, patch: UpdateTaskInput): Promise<Task>;
  move(id: string, to: { columnId: string; position: string }): Promise<Task>;
}

export interface Repositories {
  users: UsersRepo;
  teams: TeamsRepo;
  memberships: MembershipsRepo;
  workspaces: WorkspacesRepo;
  boards: BoardsRepo;
  tasks: TasksRepo;
}
