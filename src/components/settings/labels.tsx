"use client";

import { Trash2 } from "lucide-react";
import { useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import { SelectField, TextField } from "@/components/forms/fields";
import { useFormAction } from "@/components/forms/use-form-action";
import { InlineInput } from "@/components/board/inline-input";
import { LabelDot } from "@/components/tasks/label-chip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LABEL_COLORS, type Label, type LabelColor, type UpdateLabelInput } from "@/lib/domain";
import type { ActionResult } from "@/lib/forms";
import { createLabelAction, deleteLabelAction, updateLabelAction } from "@/server/actions/labels";

type LabelAction = { type: "update"; id: string; patch: UpdateLabelInput } | { type: "delete"; id: string };

function labelReducer(labels: Label[], action: LabelAction): Label[] {
  return action.type === "delete"
    ? labels.filter((l) => l.id !== action.id)
    : labels.map((l) => (l.id === action.id ? { ...l, ...action.patch } : l));
}

const colorName = (color: LabelColor) => color[0].toUpperCase() + color.slice(1);

function ColorOption({ color }: { color: LabelColor }) {
  return (
    <>
      <LabelDot color={color} />
      {colorName(color)}
    </>
  );
}

export function LabelList({ labels: initial, canManage }: { labels: Label[]; canManage: boolean }) {
  const [labels, apply] = useOptimistic(initial, labelReducer);
  const [pending, startTransition] = useTransition();
  const [renaming, setRenaming] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Label | null>(null);

  function mutate(action: LabelAction, run: () => Promise<ActionResult>) {
    startTransition(async () => {
      apply(action);
      const result = await run();
      if (!result.ok) toast.error(result.error);
    });
  }

  if (labels.length === 0) return <p className="text-muted-foreground text-sm">No labels yet.</p>;

  return (
    <>
      <ul aria-label="Labels" aria-busy={pending} className="divide-y rounded-md border">
        {labels.map((label) => (
          <li key={label.id} aria-label={label.name} className="flex items-center gap-3 px-4 py-2.5 text-sm">
            <LabelDot color={label.color} />
            {renaming === label.id ? (
              <InlineInput
                aria-label="Label name"
                className="h-8 max-w-60"
                initialValue={label.name}
                submitOnBlur
                onSubmit={(name) => {
                  setRenaming(null);
                  if (name !== label.name) {
                    mutate({ type: "update", id: label.id, patch: { name } }, () => updateLabelAction(label.id, { name }));
                  }
                }}
                onCancel={() => setRenaming(null)}
              />
            ) : (
              <button
                type="button"
                disabled={!canManage}
                className="font-medium enabled:hover:underline"
                onClick={() => setRenaming(label.id)}
              >
                {label.name}
              </button>
            )}
            {canManage && (
              <div className="ml-auto flex items-center gap-1">
                <Select
                  value={label.color}
                  onValueChange={(value) => {
                    const color = value as LabelColor;
                    mutate({ type: "update", id: label.id, patch: { color } }, () => updateLabelAction(label.id, { color }));
                  }}
                >
                  <SelectTrigger size="sm" className="w-32" aria-label={`Colour for ${label.name}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LABEL_COLORS.map((color) => (
                      <SelectItem key={color} value={color}>
                        <ColorOption color={color} />
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  aria-label={`Delete ${label.name}`}
                  onClick={() => setDeleting(label)}
                >
                  <Trash2 />
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>

      <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete the {deleting?.name} label?</AlertDialogTitle>
            <AlertDialogDescription>It&apos;s removed from every task that uses it. This can&apos;t be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (!deleting) return;
                const { id } = deleting;
                mutate({ type: "delete", id }, () => deleteLabelAction(id));
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function CreateLabelForm({ teamSlug }: { teamSlug: string }) {
  // Remount the fields after each successful create so they clear.
  const [formKey, setFormKey] = useState(0);
  const [state, action, pending] = useFormAction(createLabelAction, () => setFormKey((key) => key + 1));
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="teamSlug" value={teamSlug} />
      <div key={formKey} className="contents">
        <div className="w-56">
          <TextField
            name="name"
            label="New label"
            placeholder="e.g. Design"
            required
            defaultValue={state.ok ? undefined : state.values?.name}
            errors={state.fieldErrors?.name}
          />
        </div>
        <div className="w-36">
          <SelectField
            name="color"
            label="Colour"
            defaultValue={state.ok ? "blue" : state.values?.color || "blue"}
            options={LABEL_COLORS.map((color) => ({ value: color, label: colorName(color) }))}
          />
        </div>
      </div>
      <Button type="submit" disabled={pending}>
        Add label
      </Button>
    </form>
  );
}
