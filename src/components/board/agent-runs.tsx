"use client";

import { Bot, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import type { AgentOption } from "@/components/tasks/member-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { isActiveRun, type AgentRun, type AgentRunStatus } from "@/lib/domain";
import { retryAgentRunAction } from "@/server/actions/agents";

const STATUS: Record<AgentRunStatus, string> = {
  queued: "Queued",
  running: "Working…",
  succeeded: "Done",
  failed: "Failed",
};

const POLL_MS = 3000;
/** Runs older than this have timed out on the server (start_agent_run), so stop waiting. */
const STALE_MS = 10 * 60_000;

/** The task's AI teammate runs: live status while working, history, and Retry. */
export function AgentRuns({
  taskId,
  assignedAgent,
  runs,
  agents,
}: {
  taskId: string;
  /** The AI teammate the task is assigned to, if any. */
  assignedAgent: AgentOption | undefined;
  runs: AgentRun[];
  agents: AgentOption[];
}) {
  const router = useRouter();
  const [retrying, startRetry] = useTransition();
  // Active and created in the last 10 minutes, so worth waiting for.
  const [mountedAt] = useState(() => Date.now());
  const waiting = runs.some((run) => isActiveRun(run) && mountedAt - new Date(run.createdAt).getTime() < STALE_MS);

  // Refresh while a run is in progress, so its comment and the move to review
  // show up without a reload.
  useEffect(() => {
    if (!waiting) return;
    const timer = setInterval(() => router.refresh(), POLL_MS);
    const stop = setTimeout(() => clearInterval(timer), STALE_MS);
    return () => {
      clearInterval(timer);
      clearTimeout(stop);
    };
  }, [waiting, router]);

  if (!assignedAgent && runs.length === 0) return null;
  const agentName = (id: string) => agents.find((a) => a.id === id)?.name ?? "AI teammate";

  return (
    <section aria-labelledby="agent-runs-heading" className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 id="agent-runs-heading" className="flex items-center gap-1.5 text-sm font-medium">
          <Bot className="size-4" aria-hidden />
          AI teammate
        </h3>
        {/* A stale active run doesn't block: starting a new one times it out. */}
        {assignedAgent && !waiting && (
          <Button
            variant="outline"
            size="sm"
            disabled={retrying}
            onClick={() =>
              startRetry(async () => {
                const result = await retryAgentRunAction(taskId);
                if (!result.ok) toast.error(result.error);
              })
            }
          >
            <RotateCcw aria-hidden />
            {runs.length ? "Run again" : "Run"}
          </Button>
        )}
      </div>
      {runs.length === 0 ? (
        <p className="text-muted-foreground text-sm">{assignedAgent?.name} hasn&apos;t run on this task yet.</p>
      ) : (
        <ul aria-live="polite" className="divide-y rounded-md border">
          {runs.map((run) => (
            <li key={run.id} className="space-y-1 px-3 py-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span>{agentName(run.agentId)}</span>
                <Badge variant={run.status === "failed" ? "destructive" : run.status === "succeeded" ? "secondary" : "outline"}>
                  {STATUS[run.status]}
                </Badge>
              </div>
              <p className="text-muted-foreground text-xs">
                {new Date(run.createdAt).toLocaleString()}
                {run.status === "succeeded" && " · result posted in the comments"}
              </p>
              {run.error && <p className="text-destructive text-xs">{run.error}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
