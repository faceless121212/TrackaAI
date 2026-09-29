import { z } from "zod";

export const ROLES = ["owner", "admin", "member"] as const;
export const PRIORITIES = ["none", "low", "medium", "high", "urgent"] as const;
export const PLANS = ["lite", "pro"] as const;

export const idSchema = z.string().min(1);
export const roleSchema = z.enum(ROLES);
export const prioritySchema = z.enum(PRIORITIES);
export const planSchema = z.enum(PLANS);

export const slugSchema = z
  .string()
  .min(2)
  .max(40)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and single dashes");

export const keyPrefixSchema = z
  .string()
  .regex(/^[A-Z][A-Z0-9]{1,4}$/, "Use 2–5 uppercase letters or digits, starting with a letter");

const timestampSchema = z.iso.datetime();

export const userSchema = z.object({
  id: idSchema,
  email: z.email(),
  name: z.string().trim().min(1).max(80),
  avatarUrl: z.url().nullable(),
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
export type CreateTeamInput = z.infer<typeof createTeamInputSchema>;
export type CreateWorkspaceInput = z.infer<typeof createWorkspaceInputSchema>;
export type CreateBoardInput = z.infer<typeof createBoardInputSchema>;
export type CreateTaskInput = z.infer<typeof createTaskInputSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskInputSchema>;
