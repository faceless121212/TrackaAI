import type {
  Board,
  Column,
  Comment,
  CommentAuthor,
  CreateCommentInput,
  CreateBoardInput,
  CreateInvitesInput,
  CreateTaskInput,
  CreateTeamInput,
  CreateWorkspaceInput,
  Invite,
  Label,
  Membership,
  Role,
  SignInInput,
  SignUpInput,
  Task,
  Team,
  UpdateBoardInput,
  UpdateTaskInput,
  UpdateWorkspaceInput,
  User,
  Workspace,
} from "@/lib/domain";

export type TeamMember = Membership & { user: User };

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
  /** Creates the team, makes `ownerId` its owner and seeds DEFAULT_LABELS. */
  create(input: CreateTeamInput & { ownerId: string }): Promise<Team>;
  get(id: string): Promise<Team | null>;
  getBySlug(slug: string): Promise<Team | null>;
  listForUser(userId: string): Promise<Team[]>;
}

export interface MembershipsRepo {
  list(teamId: string): Promise<Membership[]>;
  get(teamId: string, userId: string): Promise<Membership | null>;
  /** Memberships joined with their users, ordered by name. */
  listMembers(teamId: string): Promise<TeamMember[]>;
  setRole(teamId: string, userId: string, role: Role): Promise<Membership>;
  remove(teamId: string, userId: string): Promise<void>;
}

export interface WorkspacesRepo {
  create(input: CreateWorkspaceInput): Promise<Workspace>;
  get(id: string): Promise<Workspace | null>;
  listForTeam(teamId: string): Promise<Workspace[]>;
  update(id: string, patch: UpdateWorkspaceInput): Promise<Workspace>;
  /** Deletes the workspace with all of its boards, columns, tasks and comments. */
  delete(id: string): Promise<void>;
}

export interface BoardsRepo {
  /** Creates the board and seeds DEFAULT_COLUMNS. */
  create(input: CreateBoardInput): Promise<Board>;
  get(id: string): Promise<Board | null>;
  listForWorkspace(workspaceId: string): Promise<Board[]>;
  update(id: string, patch: UpdateBoardInput): Promise<Board>;
  /** Deletes the board with its columns, tasks and comments. */
  delete(id: string): Promise<void>;
  listColumns(boardId: string): Promise<Column[]>;
  getColumn(id: string): Promise<Column | null>;
  /** Appends a column at the end of the board. */
  createColumn(boardId: string, name: string): Promise<Column>;
  renameColumn(id: string, name: string): Promise<Column>;
  /** Moves the column to `index` among the board's other columns. */
  moveColumn(id: string, index: number): Promise<Column>;
  /** Throws ConflictError("column") if the column still has tasks or is the board's last. */
  deleteColumn(id: string): Promise<void>;
}

export interface TasksRepo {
  /**
   * Allocates the next task number for the board's workspace and places the
   * task at the end of its column (or the start, for quick-add).
   */
  create(input: CreateTaskInput & { createdBy: string; placement?: "start" | "end" }): Promise<Task>;
  get(id: string): Promise<Task | null>;
  getByKey(workspaceId: string, key: string): Promise<Task | null>;
  listForBoard(boardId: string): Promise<Task[]>;
  /** Tasks in any of the team's boards assigned to the user, most recently updated first. */
  listAssignedTo(teamId: string, userId: string): Promise<Task[]>;
  update(id: string, patch: UpdateTaskInput): Promise<Task>;
  /** Moves the task to `index` among the other tasks of `columnId` (same board). */
  move(id: string, to: { columnId: string; index: number }): Promise<Task>;
  /** Deletes the task and its comments; its sub-tasks become top-level. */
  delete(id: string): Promise<void>;
}

export interface LabelsRepo {
  listForTeam(teamId: string): Promise<Label[]>;
}

export interface CommentsRepo {
  /** Oldest first. */
  listForTask(taskId: string): Promise<Comment[]>;
  get(id: string): Promise<Comment | null>;
  create(input: CreateCommentInput & { author: CommentAuthor }): Promise<Comment>;
  delete(id: string): Promise<void>;
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
  labels: LabelsRepo;
  comments: CommentsRepo;
}
