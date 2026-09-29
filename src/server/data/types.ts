import type {
  Board,
  Column,
  CreateBoardInput,
  CreateInvitesInput,
  CreateTaskInput,
  CreateTeamInput,
  CreateWorkspaceInput,
  Invite,
  Membership,
  Role,
  SignInInput,
  SignUpInput,
  Task,
  Team,
  UpdateTaskInput,
  User,
  Workspace,
} from "@/lib/domain";

// Every backend (mock in M1, Supabase in M4) implements these. UI and server
// actions depend only on this file, never on a concrete backend.
// Methods throw NotFoundError / ConflictError from ./errors.

export interface AuthRepo {
  /** Creates the user and their credentials. Throws ConflictError("email") if taken. */
  signUp(input: SignUpInput): Promise<User>;
  /** Returns the user, or null for an unknown email or wrong password. */
  signIn(input: SignInInput): Promise<User | null>;
}

export interface UsersRepo {
  getById(id: string): Promise<User | null>;
  getByEmail(email: string): Promise<User | null>;
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

export interface InvitesRepo {
  /** Creates member invites valid for INVITE_TTL_DAYS, skipping existing members and pending invites. */
  create(input: CreateInvitesInput & { invitedBy: string }): Promise<Invite[]>;
  listPending(teamId: string): Promise<Invite[]>;
}

export interface Repositories {
  auth: AuthRepo;
  users: UsersRepo;
  teams: TeamsRepo;
  memberships: MembershipsRepo;
  workspaces: WorkspacesRepo;
  boards: BoardsRepo;
  tasks: TasksRepo;
  invites: InvitesRepo;
}
