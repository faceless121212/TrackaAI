"use client";

import { useObject } from "@ai-sdk/react";
import { Sparkles } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { AiError } from "@/components/ai/ai-error";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { breakdownSchema, type Task } from "@/lib/domain";
import { createSubtasksAction } from "@/server/actions/tasks";

/** "Break down with AI": streams suggested sub-tasks; the user picks which to create. */
export function BreakdownButton({ task }: { task: Pick<Task, "id" | "key" | "title"> }) {
  const [open, setOpen] = useState(false);
  const [unchecked, setUnchecked] = useState<Set<number>>(new Set());
  const [creating, startCreating] = useTransition();
  const breakdown = useObject({ api: "/api/ai/breakdown", schema: breakdownSchema });
  const run = () => {
    setUnchecked(new Set());
    void breakdown.submit({ taskId: task.id });
  };

  const suggestions = (breakdown.object?.subtasks ?? []).filter((s) => s?.title);
  const picked = breakdown.isLoading ? [] : suggestions.filter((_, i) => !unchecked.has(i));

  const create = () =>
    startCreating(async () => {
      const result = await createSubtasksAction(
        task.id,
        picked.map((s) => ({ title: s!.title!, description: s!.description ?? "" })),
      );
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Created ${picked.length} sub-task${picked.length === 1 ? "" : "s"}`);
      setOpen(false);
    });

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          setOpen(true);
          run();
        }}
      >
        <Sparkles aria-hidden />
        Break down with AI
      </Button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) breakdown.stop();
          setOpen(next);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Break down {task.key}</DialogTitle>
            <DialogDescription>
              Pick the sub-tasks to create. They go in the same column as {task.key}.
            </DialogDescription>
          </DialogHeader>
          <ul aria-label="Suggested sub-tasks" aria-busy={breakdown.isLoading} className="space-y-1">
            {suggestions.map((subtask, i) => (
              <li key={i}>
                <label className="hover:bg-muted/50 flex items-start gap-3 rounded-md p-2 text-sm">
                  <input
                    type="checkbox"
                    className="accent-primary mt-0.5 size-4"
                    checked={!unchecked.has(i)}
                    disabled={breakdown.isLoading}
                    onChange={(event) =>
                      setUnchecked((set) => {
                        const next = new Set(set);
                        if (event.target.checked) next.delete(i);
                        else next.add(i);
                        return next;
                      })
                    }
                  />
                  <span className="space-y-0.5">
                    <span className="block font-medium">{subtask!.title}</span>
                    {subtask!.description && (
                      <span className="text-muted-foreground block">{subtask!.description}</span>
                    )}
                  </span>
                </label>
              </li>
            ))}
            {breakdown.isLoading && <li className="text-muted-foreground p-2 text-sm">Thinking…</li>}
          </ul>
          <AiError error={breakdown.error} />
          <DialogFooter>
            <Button variant="ghost" onClick={run} disabled={breakdown.isLoading || creating}>
              Try again
            </Button>
            <Button onClick={create} disabled={picked.length === 0 || creating}>
              Create {picked.length || ""} sub-task{picked.length === 1 ? "" : "s"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
