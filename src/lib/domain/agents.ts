import { z } from "zod";

// AI teammates (M9): team members that are AI agents, and their runs.

export const agentInputSchema = z.object({
  name: z.string().trim().min(1, "Give it a name").max(40),
  specialty: z.string().trim().max(500).default(""),
});

export type AgentInput = z.infer<typeof agentInputSchema>;

export type Agent = AgentInput & { id: string; teamId: string; createdAt: string };

export const AGENT_RUN_STATUSES = ["queued", "running", "succeeded", "failed"] as const;
export type AgentRunStatus = (typeof AGENT_RUN_STATUSES)[number];

export type AgentRun = {
  id: string;
  teamId: string;
  taskId: string;
  agentId: string;
  requestedBy: string | null;
  status: AgentRunStatus;
  error: string | null;
  commentId: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
};

export const isActiveRun = (run: Pick<AgentRun, "status">) => run.status === "queued" || run.status === "running";

/** The column an AI teammate hands finished work to, if the board has it. */
export const REVIEW_COLUMN = "In Review";
