"use client";

import { toast } from "sonner";
import { FormError, SelectField, TextField } from "@/components/forms/fields";
import { useFormAction } from "@/components/forms/use-form-action";
import type { MemberOption } from "@/components/tasks/member-avatar";
import { PRIORITY_META } from "@/components/tasks/priority";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { PRIORITIES, type Column } from "@/lib/domain";
import { createTaskAction } from "@/server/actions/tasks";

type CreateTaskDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  boardId: string;
  columns: Column[];
  members: MemberOption[];
  defaultColumnId: string;
};

export function CreateTaskDialog({ open, onOpenChange, ...props }: CreateTaskDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {open && <CreateTaskForm {...props} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function CreateTaskForm({
  boardId,
  columns,
  members,
  defaultColumnId,
  onDone,
}: Omit<CreateTaskDialogProps, "open" | "onOpenChange"> & { onDone: () => void }) {
  const [state, action, pending] = useFormAction(createTaskAction, () => {
    onDone();
    toast.success("Task created");
  });

  return (
    <form action={action} className="space-y-6">
      <DialogHeader>
        <DialogTitle>New task</DialogTitle>
        <DialogDescription>Press C on the board to open this anytime.</DialogDescription>
      </DialogHeader>
      <input type="hidden" name="boardId" value={boardId} />
      <FieldGroup>
        <TextField
          name="title"
          label="Title"
          required
          autoFocus
          defaultValue={state.values?.title}
          errors={state.fieldErrors?.title}
        />
        <Field>
          <FieldLabel htmlFor="description">Description</FieldLabel>
          <Textarea
            id="description"
            name="description"
            rows={4}
            placeholder="Markdown supported"
            defaultValue={state.values?.description}
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
            name="priority"
            label="Priority"
            defaultValue={state.values?.priority || "none"}
            options={PRIORITIES.map((priority) => ({ value: priority, label: PRIORITY_META[priority].label }))}
          />
          <SelectField
            name="assignee"
            label="Assignee"
            defaultValue={state.values?.assignee || "none"}
            options={[
              { value: "none", label: "Unassigned" },
              ...members.map((member) => ({ value: member.id, label: member.name })),
            ]}
          />
        </div>
      </FieldGroup>
      <FormError message={state.fieldErrors?.assignee?.[0] ?? state.formError} />
      <DialogFooter>
        <Button type="submit" disabled={pending}>
          Create task
        </Button>
      </DialogFooter>
    </form>
  );
}
