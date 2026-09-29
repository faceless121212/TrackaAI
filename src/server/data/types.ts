import type {
  AiFeature,
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
  InviteRole,
  Label,
  LabelInput,
  Membership,
  Plan,
  Role,
  SignInInput,
  SignUpInput,
  Task,
  Team,
  UpdateBoardInput,
  UpdateLabelInput,
  UpdateProfileInput,
  UpdateTaskInput,
  UpdateTeamInput,
  UpdateWorkspaceInput,
  User,
  Workspace,
} from "@/lib/domain";

export type TeamMember = Membership & { user: User };

/** What counts toward plan limits. Pending invites hold a seat until they expire. */
export type TeamUsage = { members: number; pendingInvites: number; workspaces: number };

export type InvitePreview = { invite: Invite; teamName: string; teamSlug: string; inviterName: string | null };

// Every backend (mock in M1, Supabase in M4) implements these. UI and server
// actions depend only on this file, never on a concrete backend.
// Methods throw NotFoundError / ConflictError from ./errors.

export interface AuthRepo {
  /**
   * Creates the user. The mock signs them in at once; Supabase (with "Confirm
   * email" on) emails a link that lands on `redirectTo` and returns
   * needsConfirmation. Throws ConflictError("email") if the address is taken.
   */
  signUp(input: SignUpInput & { redirectTo?: string }): Promise<{ user: User; needsConfirmation: boolean }>;
  /**
   * Signs in and returns the user, or null for an unknown email or wrong
   * password. Throws ConflictError("email") if the email isn't confirmed yet.
   */
  signIn(input: SignInInput): Promise<User | null>;
  signOut(): Promise<void>;
  /** The signed-in user's id, or null. */
  currentUserId(): Promise<string | null>;
  /** Completes an email-confirmation link and starts the session; false if it's invalid or expired. */
  confirmEmail(params: { code?: string | null; tokenHash?: string | null; type?: string | null }): Promise<boolean>;
}

export interface UsersRepo {
  getById(id: string): Promise<User | null>;
  getByEmail(email: string): Promise<User | null>;
  update(id: string, patch: Partial<UpdateProfileInput>): Promise<User>;
}

export interface TeamsRepo {
  /** Creates the team, makes `ownerId` its owner and seeds DEFAULT_LABELS. */
  create(input: CreateTeamInput & { ownerId: string }): Promise<Team>;
  get(id: string): Promise<Team | null>;
  getBySlug(slug: string): Promise<Team | null>;
  listForUser(userId: string): Promise<Team[]>;
  update(id: string, patch: UpdateTeamInput): Promise<Team>;
  /**
   * Changes the team's plan. Billing is simulated: this is what a completed
   * checkout does. Callers check that the actor owns the team.
   */
  setPlan(id: string, plan: Plan): Promise<Team>;
  /** Seats and projects in use. Readable by members and by someone holding a pending invite. */
  usage(id: string): Promise<TeamUsage>;
  /** Deletes the team with its memberships, invites, labels and every workspace. */
  delete(id: string): Promise<void>;
}

export interface MembershipsRepo {
  list(teamId: string): Promise<Membership[]>;
  get(teamId: string, userId: string): Promise<Membership | null>;
  /** Memberships joined with their users, ordered by name. */
  listMembers(teamId: string): Promise<TeamMember[]>;
  setRole(teamId: string, userId: string, role: Role): Promise<Membership>;
  remove(teamId: string, userId: string): Promise<void>;
  /** Makes `toUserId` (a member) the owner and demotes the current owner to admin, atomically. */
  transferOwnership(teamId: string, fromUserId: string, toUserId: string): Promise<void>;
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
  get(id: string): Promise<Label | null>;
  /** Names are unique per team, ignoring case: ConflictError("name"). */
  create(teamId: string, input: LabelInput): Promise<Label>;
  update(id: string, patch: UpdateLabelInput): Promise<Label>;
  /** Deletes the label and removes it from every task. */
  delete(id: string): Promise<void>;
}

export interface CommentsRepo {
  /** Oldest first. */
  listForTask(taskId: string): Promise<Comment[]>;
  get(id: string): Promise<Comment | null>;
  create(input: CreateCommentInput & { author: CommentAuthor }): Promise<Comment>;
  delete(id: string): Promise<void>;
}

export interface InvitesRepo {
  /** Creates invites (default role: member) valid for INVITE_TTL_DAYS, skipping members and pending invites. */
  create(input: Omit<CreateInvitesInput, "role"> & { role?: InviteRole; invitedBy: string }): Promise<Invite[]>;
  listPending(teamId: string): Promise<Invite[]>;
  get(id: string): Promise<Invite | null>;
  getByToken(token: string): Promise<Invite | null>;
  /** What an invitee may see before joining (they can't read the team's tables yet). */
  preview(token: string): Promise<InvitePreview | null>;
  /** Issues a new token and expiry (the old link stops working). */
  resend(id: string): Promise<Invite>;
  revoke(id: string): Promise<void>;
  /**
   * Adds the user to the team with the invite's role. ConflictError("token")
   * if the invite was already used or has expired, ConflictError("email") if
   * it was sent to a different address.
   */
  accept(token: string, userId: string): Promise<Membership>;
}

export type AiUsageInput = {
  teamId: string;
  userId: string;
  feature: AiFeature;
  model: string;
  inputTokens: number;
  outputTokens: number;
};

export interface AiUsageRepo {
  /** Logs one AI run (as the signed-in user). */
  record(input: AiUsageInput): Promise<void>;
  /** The team's runs since `since` (plan limits count the calendar month). */
  countSince(teamId: string, since: Date): Promise<number>;
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
  aiUsage: AiUsageRepo;
}
