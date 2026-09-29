import { z } from "zod";
import { LABEL_COLORS, MAX_INVITES_PER_BATCH, RESERVED_SLUGS, THEMES } from "./constants";

export const ROLES = ["owner", "admin", "member"] as const;
export const PRIORITIES = ["none", "low", "medium", "high", "urgent"] as const;
export const PLANS = ["free", "lite", "pro"] as const;

export const idSchema = z.string().min(1);
export const roleSchema = z.enum(ROLES);
export const inviteRoleSchema = roleSchema.exclude(["owner"]);
export const themeSchema = z.enum(THEMES);
export const prioritySchema = z.enum(PRIORITIES);
export const planSchema = z.enum(PLANS);

export const slugSchema = z
  .string()
  .min(2)
  .max(40)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and single dashes")
  .refine((slug) => !RESERVED_SLUGS.includes(slug), "This name is reserved");

export const keyPrefixSchema = z
  .string()
  .regex(/^[A-Z][A-Z0-9]{1,4}$/, "Use 2–5 uppercase letters or digits, starting with a letter");

const timestampSchema = z.iso.datetime();

// Trim and lowercase before checking the format, so " Ann@X.test " is valid.
export const emailSchema = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email"));
export const passwordSchema = z.string().min(8, "Use at least 8 characters").max(72);

export const userSchema = z.object({
  id: idSchema,
  email: z.email(),
  name: z.string().trim().min(1).max(80),
  // http(s) only: javascript:/data: URLs would be unsafe anywhere this ends up as a link or in an email.
  avatarUrl: z.url({ protocol: /^https?$/, error: "Enter a full URL, like https://…" }).nullable(),
  /** Absent for users created before M3; the app then uses the dark default. */
  theme: themeSchema.optional(),
  createdAt: timestampSchema,
});

export const teamSchema = z.object({
  id: idSchema,
  name: z.string().trim().min(1).max(60),
  slug: slugSchema,
  plan: planSchema,
  createdAt: timestampSchema,
});

export const membershipSchema = z.object({
  teamId: idSchema,
  userId: idSchema,
  role: roleSchema,
  joinedAt: timestampSchema,
});

export const workspaceSchema = z.object({
  id: idSchema,
  teamId: idSchema,
  name: z.string().trim().min(1).max(60),
  keyPrefix: keyPrefixSchema,
  nextTaskNumber: z.number().int().positive(),
  createdAt: timestampSchema,
});

export const boardSchema = z.object({
  id: idSchema,
  workspaceId: idSchema,
  name: z.string().trim().min(1).max(60),
  description: z.string().max(500).nullable(),
  createdAt: timestampSchema,
});

export const columnSchema = z.object({
  id: idSchema,
  boardId: idSchema,
  name: z.string().trim().min(1).max(40),
  position: z.string().min(1),
});

export const assigneeSchema = z
  .discriminatedUnion("kind", [
    z.object({ kind: z.literal("user"), userId: idSchema }),
    z.object({ kind: z.literal("agent"), agentId: idSchema }),
  ])
  .nullable();

export const taskSchema = z.object({
  id: idSchema,
  boardId: idSchema,
  columnId: idSchema,
  number: z.number().int().positive(),
  key: z.string().min(1),
  title: z.string().trim().min(1).max(200),
  description: z.string().max(20_000),
  priority: prioritySchema,
  assignee: assigneeSchema,
  labelIds: z.array(idSchema),
  dueDate: z.iso.date().nullable(),
  position: z.string().min(1),
  parentId: idSchema.nullable(),
  createdBy: idSchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const labelColorSchema = z.enum(LABEL_COLORS);

export const labelSchema = z.object({
  id: idSchema,
  teamId: idSchema,
  name: z.string().trim().min(1).max(30),
  color: labelColorSchema,
});

export const commentAuthorSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("user"), userId: idSchema }),
  z.object({ kind: z.literal("agent"), agentId: idSchema }),
]);

export const commentSchema = z.object({
  id: idSchema,
  taskId: idSchema,
  author: commentAuthorSchema,
  body: z.string().trim().min(1, "Write something first").max(10_000),
  createdAt: timestampSchema,
});

export const inviteSchema = z.object({
  id: idSchema,
  teamId: idSchema,
  email: z.email(),
  role: inviteRoleSchema,
  token: z.string().min(16),
  invitedBy: idSchema,
  expiresAt: timestampSchema,
  acceptedAt: timestampSchema.nullable(),
  createdAt: timestampSchema,
});

export const signUpInputSchema = z.object({
  name: userSchema.shape.name,
  email: emailSchema,
  password: passwordSchema,
});

export const signInInputSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password"),
});

export const createInvitesInputSchema = z.object({
  teamId: idSchema,
  emails: z
    .array(emailSchema)
    .min(1, "Add at least one email")
    .max(MAX_INVITES_PER_BATCH, `Invite at most ${MAX_INVITES_PER_BATCH} people at a time`),
  role: inviteRoleSchema.default("member"),
});

export const createTeamInputSchema = teamSchema.pick({ name: true, slug: true });

export const createWorkspaceInputSchema = workspaceSchema.pick({
  teamId: true,
  name: true,
  keyPrefix: true,
});

export const createBoardInputSchema = boardSchema
  .pick({ workspaceId: true, name: true })
  .extend({ description: z.string().max(500).nullable().default(null) });

export const createTaskInputSchema = z.object({
  boardId: idSchema,
  columnId: idSchema,
  title: taskSchema.shape.title,
  description: taskSchema.shape.description.default(""),
  priority: prioritySchema.default("none"),
  assignee: assigneeSchema.default(null),
  labelIds: z.array(idSchema).default([]),
  dueDate: taskSchema.shape.dueDate.default(null),
  parentId: taskSchema.shape.parentId.default(null),
});

export const updateTeamInputSchema = teamSchema.pick({ name: true });

export const updateProfileInputSchema = z.object({
  name: userSchema.shape.name,
  avatarUrl: userSchema.shape.avatarUrl,
  theme: themeSchema,
});

export const labelInputSchema = labelSchema.pick({ name: true, color: true });
export const updateLabelInputSchema = labelInputSchema.partial();

export const updateWorkspaceInputSchema = workspaceSchema.pick({ name: true });

export const updateBoardInputSchema = boardSchema.pick({ name: true, description: true }).partial();

export const columnNameSchema = columnSchema.shape.name;

export const createCommentInputSchema = commentSchema.pick({ taskId: true, body: true });

// No defaults here: an update only touches the fields it names.
export const updateTaskInputSchema = taskSchema
  .pick({
    title: true,
    description: true,
    priority: true,
    assignee: true,
    labelIds: true,
    dueDate: true,
    parentId: true,
  })
  .partial();

export type Role = z.infer<typeof roleSchema>;
export type Priority = z.infer<typeof prioritySchema>;
export type Plan = z.infer<typeof planSchema>;
export type User = z.infer<typeof userSchema>;
export type Team = z.infer<typeof teamSchema>;
export type Membership = z.infer<typeof membershipSchema>;
export type Workspace = z.infer<typeof workspaceSchema>;
export type Board = z.infer<typeof boardSchema>;
export type Column = z.infer<typeof columnSchema>;
export type Assignee = z.infer<typeof assigneeSchema>;
export type Task = z.infer<typeof taskSchema>;
export type Theme = z.infer<typeof themeSchema>;
export type InviteRole = z.infer<typeof inviteRoleSchema>;
export type UpdateTeamInput = z.infer<typeof updateTeamInputSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileInputSchema>;
export type LabelInput = z.infer<typeof labelInputSchema>;
export type UpdateLabelInput = z.infer<typeof updateLabelInputSchema>;
export type LabelColor = z.infer<typeof labelColorSchema>;
export type Label = z.infer<typeof labelSchema>;
export type CommentAuthor = z.infer<typeof commentAuthorSchema>;
export type Comment = z.infer<typeof commentSchema>;
export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceInputSchema>;
export type UpdateBoardInput = z.infer<typeof updateBoardInputSchema>;
export type CreateCommentInput = z.infer<typeof createCommentInputSchema>;
export type Invite = z.infer<typeof inviteSchema>;
export type SignUpInput = z.infer<typeof signUpInputSchema>;
export type SignInInput = z.infer<typeof signInInputSchema>;
export type CreateInvitesInput = z.infer<typeof createInvitesInputSchema>;
export type CreateTeamInput = z.infer<typeof createTeamInputSchema>;
export type CreateWorkspaceInput = z.infer<typeof createWorkspaceInputSchema>;
export type CreateBoardInput = z.infer<typeof createBoardInputSchema>;
export type CreateTaskInput = z.infer<typeof createTaskInputSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskInputSchema>;
