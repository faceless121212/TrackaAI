"use client";

import { Ellipsis } from "lucide-react";
import { startTransition, useState } from "react";
import { FormError, TextField } from "@/components/forms/fields";
import { useFormAction } from "@/components/forms/use-form-action";
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
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import type { Board } from "@/lib/domain";
import { deleteBoardAction, updateBoardAction } from "@/server/actions/boards";

export function BoardHeader({
  board,
  workspaceName,
  canManage,
}: {
  board: Board;
  workspaceName: string;
  canManage: boolean;
}) {
  const [dialog, setDialog] = useState<"edit" | "delete" | null>(null);

  return (
    <div className="flex items-start gap-2">
      <div className="min-w-0">
        <p className="text-muted-foreground text-sm">{workspaceName}</p>
        <h1 className="text-xl font-semibold">{board.name}</h1>
        {board.description && <p className="text-muted-foreground text-sm">{board.description}</p>}
      </div>
      {canManage && (
        <>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8" aria-label="Board actions">
                <Ellipsis />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onSelect={() => setDialog("edit")}>Edit board</DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onSelect={() => setDialog("delete")}>
                Delete board
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Dialog open={dialog === "edit"} onOpenChange={(open) => setDialog(open ? "edit" : null)}>
            <DialogContent>
              {dialog === "edit" && <EditBoardForm board={board} onDone={() => setDialog(null)} />}
            </DialogContent>
          </Dialog>

          <AlertDialog open={dialog === "delete"} onOpenChange={(open) => setDialog(open ? "delete" : null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete {board.name}?</AlertDialogTitle>
                <AlertDialogDescription>
                  All of its columns, tasks and comments are deleted too. This can&apos;t be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  onClick={() => startTransition(() => deleteBoardAction(board.id))}
                >
                  Delete board
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </div>
  );
}

function EditBoardForm({ board, onDone }: { board: Board; onDone: () => void }) {
  const [state, action, pending] = useFormAction(updateBoardAction, onDone);
  return (
    <form action={action} className="space-y-6">
      <DialogHeader>
        <DialogTitle>Edit board</DialogTitle>
      </DialogHeader>
      <input type="hidden" name="boardId" value={board.id} />
      <FieldGroup>
        <TextField
          name="name"
          label="Board name"
          required
          defaultValue={state.values?.name ?? board.name}
          errors={state.fieldErrors?.name}
        />
        <Field>
          <FieldLabel htmlFor="description">Description</FieldLabel>
          <Textarea
            id="description"
            name="description"
            rows={3}
            defaultValue={state.values?.description ?? board.description ?? ""}
          />
        </Field>
      </FieldGroup>
      <FormError message={state.fieldErrors?.description?.[0]} />
      <DialogFooter>
        <Button type="submit" disabled={pending}>
          Save
        </Button>
      </DialogFooter>
    </form>
  );
}
