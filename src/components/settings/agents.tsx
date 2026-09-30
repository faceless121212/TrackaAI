"use client";

import { Bot } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { FormError, TextField } from "@/components/forms/fields";
import { useFormAction } from "@/components/forms/use-form-action";
import type { AgentOption } from "@/components/tasks/member-avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import type { FormState } from "@/lib/forms";
import { createAgentAction, deleteAgentAction, updateAgentAction } from "@/server/actions/agents";

function AgentFields({ state, agent }: { state: FormState; agent?: AgentOption }) {
  return (
    <FieldGroup>
      <TextField
        name="name"
        label="Name"
        placeholder="Spec writer"
        required
        maxLength={40}
        defaultValue={state.values?.name ?? agent?.name}
        errors={state.fieldErrors?.name}
      />
      <Field>
        <FieldLabel htmlFor={agent ? `specialty-${agent.id}` : "specialty"}>Specialty</FieldLabel>
        <Textarea
          id={agent ? `specialty-${agent.id}` : "specialty"}
          name="specialty"
          rows={3}
          maxLength={500}
          placeholder="Turns rough tasks into short specs with acceptance criteria."
          defaultValue={state.values?.specialty ?? agent?.specialty}
        />
        <FieldDescription>What it&apos;s good at. It shapes every result it writes.</FieldDescription>
      </Field>
    </FieldGroup>
  );
}

export function AddAgentForm({ teamSlug }: { teamSlug: string }) {
  // Bumped on success: remounting the form clears its fields.
  const [added, setAdded] = useState(0);
  const [state, action, pending] = useFormAction(createAgentAction, () => {
    toast.success("AI teammate added");
    setAdded((n) => n + 1);
  });
  return (
    <form key={added} action={action} className="space-y-4">
      <input type="hidden" name="teamSlug" value={teamSlug} />
      <AgentFields state={state.ok ? {} : state} />
      <FormError message={state.formError} upgradeHref={state.upgradeHref} />
      <Button type="submit" disabled={pending}>
        Add AI teammate
      </Button>
    </form>
  );
}

export function AgentList({ teamSlug, agents, canManage }: { teamSlug: string; agents: AgentOption[]; canManage: boolean }) {
  if (agents.length === 0) return <p className="text-muted-foreground text-sm">No AI teammates yet.</p>;
  return (
    <ul className="divide-y rounded-md border">
      {agents.map((agent) => (
        <li key={agent.id} className="flex items-start gap-3 px-3 py-2.5">
          <Bot className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{agent.name}</p>
            {agent.specialty && <p className="text-muted-foreground text-sm">{agent.specialty}</p>}
          </div>
          {canManage && (
            <div className="flex shrink-0 gap-1">
              <EditAgentButton teamSlug={teamSlug} agent={agent} />
              <DeleteAgentButton teamSlug={teamSlug} agent={agent} />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

function EditAgentButton({ teamSlug, agent }: { teamSlug: string; agent: AgentOption }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useFormAction(updateAgentAction, () => setOpen(false));
  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)} aria-label={`Edit ${agent.name}`}>
        Edit
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <form action={action} className="space-y-6">
            <DialogHeader>
              <DialogTitle>Edit {agent.name}</DialogTitle>
            </DialogHeader>
            <input type="hidden" name="teamSlug" value={teamSlug} />
            <input type="hidden" name="agentId" value={agent.id} />
            <AgentFields state={state} agent={agent} />
            <FormError message={state.formError} />
            <DialogFooter>
              <Button type="submit" disabled={pending}>
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function DeleteAgentButton({ teamSlug, agent }: { teamSlug: string; agent: AgentOption }) {
  const [pending, startTransition] = useTransition();
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm" disabled={pending} aria-label={`Remove ${agent.name}`}>
          Remove
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove {agent.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            Its tasks become unassigned and its run history is deleted. The comments it wrote stay.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() =>
              startTransition(async () => {
                const result = await deleteAgentAction(teamSlug, agent.id);
                if (!result.ok) toast.error(result.error);
              })
            }
          >
            Remove
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
