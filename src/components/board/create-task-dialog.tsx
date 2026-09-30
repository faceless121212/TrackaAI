"use client";

import { useObject } from "@ai-sdk/react";
import { Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AiError, INCOMPLETE } from "@/components/ai/ai-error";
import { FormError, SelectField } from "@/components/forms/fields";
import { useFormAction } from "@/components/forms/use-form-action";
import { LabelChip } from "@/components/tasks/label-chip";
import type { AgentOption, MemberOption } from "@/components/tasks/member-avatar";
import { PRIORITY_META } from "@/components/tasks/priority";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PRIORITIES, matchLabelIds, taskDraftSchema, type Column, type Label, type Priority } from "@/lib/domain";
import { cn } from "@/lib/utils";
import { createTaskAction } from "@/server/actions/tasks";

type CreateTaskDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  boardId: string;
  columns: Column[];
  members: MemberOption[];
  labels: Label[];
  agents: AgentOption[];
  defaultColumnId: string;
  /** Whether the AI task writer is available on this server. */
  aiEnabled: boolean;
};

export function CreateTaskDialog({ open, onOpenChange, ...props }: CreateTaskDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        {open && <CreateTaskForm {...props} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function CreateTaskForm({
  boardId,
  columns,
  members,
  labels,
  agents,
  defaultColumnId,
  aiEnabled,
  onDone,
}: Omit<CreateTaskDialogProps, "open" | "onOpenChange"> & { onDone: () => void }) {
  const [state, action, pending] = useFormAction(createTaskAction, () => {
    onDone();
    toast.success("Task created");
  });
  const [title, setTitle] = useState(state.values?.title ?? "");
  const [description, setDescription] = useState(state.values?.description ?? "");
  const [priority, setPriority] = useState<Priority>("none");
  const [labelIds, setLabelIds] = useState<string[]>([]);
  // Remounts the priority select so it shows a drafted value.
  const [draftVersion, setDraftVersion] = useState(0);

  const [request, setRequest] = useState("");
  // A stream that ended early or with an invalid draft (useObject only reports HTTP errors).
  const [incomplete, setIncomplete] = useState<Error>();
  const writer = useObject({
    api: "/api/ai/task-writer",
    schema: taskDraftSchema,
    onFinish: ({ object }) => {
      if (!object) {
        setIncomplete(new Error(INCOMPLETE));
        return;
      }
      setTitle(object.title);
      setDescription(object.description);
      setPriority(object.priority);
      setLabelIds(matchLabelIds(object.labels, labels));
      setDraftVersion((v) => v + 1);
    },
  });
  const writing = writer.isLoading;
  const write = () => {
    if (writing || !request.trim()) return;
    setIncomplete(undefined);
    void writer.submit({ boardId, prompt: request });
  };

  return (
    <form action={action} className="space-y-6">
      <DialogHeader>
        <DialogTitle>New task</DialogTitle>
        <DialogDescription>Press C on the board to open this anytime.</DialogDescription>
      </DialogHeader>
      <input type="hidden" name="boardId" value={boardId} />

      {aiEnabled && (
        <Field>
          <FieldLabel htmlFor="ai-request">Write with AI</FieldLabel>
          <div className="flex gap-2">
            <Input
              id="ai-request"
              placeholder="e.g. let users export the board as CSV"
              value={request}
              maxLength={500}
              onChange={(event) => setRequest(event.target.value)}
              onKeyDown={(event) => {
                // Enter drafts the task instead of submitting the form.
                if (event.key === "Enter" && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  write();
                }
              }}
            />
            <Button type="button" variant="secondary" onClick={write} disabled={writing || !request.trim()}>
              <Sparkles aria-hidden />
              {writing ? "Writing…" : "Write"}
            </Button>
          </div>
          <AiError error={writer.error ?? incomplete} />
        </Field>
      )}

      <FieldGroup aria-busy={writing}>
        <Field data-invalid={Boolean(state.fieldErrors?.title)}>
          <FieldLabel htmlFor="title">Title</FieldLabel>
          <Input
            id="title"
            name="title"
            required
            autoFocus={!aiEnabled}
            readOnly={writing}
            value={writing ? (writer.object?.title ?? "") : title}
            onChange={(event) => setTitle(event.target.value)}
            aria-invalid={Boolean(state.fieldErrors?.title)}
          />
          <FieldError>{state.fieldErrors?.title?.[0]}</FieldError>
        </Field>
        <Field>
          <FieldLabel htmlFor="description">Description</FieldLabel>
          <Textarea
            id="description"
            name="description"
            rows={writing || description.length > 200 ? 8 : 4}
            placeholder="Markdown supported"
            readOnly={writing}
            value={writing ? (writer.object?.description ?? "") : description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <SelectField
            name="columnId"
            label="Status"
            defaultValue={state.values?.columnId || defaultColumnId}
            options={columns.map((column) => ({ value: column.id, label: column.name }))}
          />
          <SelectField
            key={draftVersion}
            name="priority"
            label="Priority"
            // A draft wins over the value echoed back by a failed submit.
            defaultValue={draftVersion > 0 ? priority : state.values?.priority || priority}
            options={PRIORITIES.map((p) => ({ value: p, label: PRIORITY_META[p].label }))}
          />
          <SelectField
            name="assignee"
            label="Assignee"
            defaultValue={state.values?.assignee || "none"}
            options={[
              { value: "none", label: "Unassigned" },
              ...members.map((member) => ({ value: member.id, label: member.name })),
              ...agents.map((agent) => ({ value: `agent:${agent.id}`, label: `${agent.name} (AI)` })),
            ]}
          />
        </div>
        {labels.length > 0 && (
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Labels</legend>
            <div className="flex flex-wrap gap-1.5">
              {labels.map((label) => {
                const selected = labelIds.includes(label.id);
                return (
                  <button
                    key={label.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() =>
                      setLabelIds((ids) => (selected ? ids.filter((id) => id !== label.id) : [...ids, label.id]))
                    }
                    className={cn(
                      "rounded-full transition-opacity focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                      !selected && "opacity-50 hover:opacity-80",
                    )}
                  >
                    <LabelChip label={label} />
                  </button>
                );
              })}
            </div>
            {labelIds.map((id) => (
              <input key={id} type="hidden" name="labelIds" value={id} />
            ))}
          </fieldset>
        )}
      </FieldGroup>
      <FormError message={state.fieldErrors?.assignee?.[0] ?? state.fieldErrors?.labelIds?.[0] ?? state.formError} />
      <DialogFooter>
        <Button type="submit" disabled={pending || writing}>
          Create task
        </Button>
      </DialogFooter>
    </form>
  );
}
