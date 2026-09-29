"use client";

import { Ellipsis, Plus } from "lucide-react";
import { startTransition, useState } from "react";
import { TextField } from "@/components/forms/fields";
import { useFormAction } from "@/components/forms/use-form-action";
import { CreateWorkspaceForm } from "@/components/onboarding/create-workspace-form";
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FieldGroup } from "@/components/ui/field";
import { SidebarGroupAction, SidebarMenuAction } from "@/components/ui/sidebar";
import type { Workspace } from "@/lib/domain";
import { createBoardAction } from "@/server/actions/boards";
import { createWorkspaceAction, deleteWorkspaceAction, renameWorkspaceAction } from "@/server/actions/workspaces";

export function NewWorkspaceButton({ teamSlug }: { teamSlug: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <SidebarGroupAction title="New workspace" aria-label="New workspace" onClick={() => setOpen(true)}>
        <Plus />
      </SidebarGroupAction>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New workspace</DialogTitle>
            <DialogDescription>It starts with a default board.</DialogDescription>
          </DialogHeader>
          {open && (
            <CreateWorkspaceForm teamSlug={teamSlug} action={createWorkspaceAction} submitLabel="Create workspace" />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export function WorkspaceMenu({ workspace }: { workspace: Pick<Workspace, "id" | "name"> }) {
  const [dialog, setDialog] = useState<"board" | "rename" | "delete" | null>(null);
  const close = () => setDialog(null);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuAction aria-label={`Workspace actions for ${workspace.name}`}>
            <Ellipsis />
          </SidebarMenuAction>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="start">
          <DropdownMenuItem onSelect={() => setDialog("board")}>New board</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setDialog("rename")}>Rename workspace</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setDialog("delete")}>
            Delete workspace
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={dialog === "board" || dialog === "rename"} onOpenChange={(open) => !open && close()}>
        <DialogContent>
          {dialog === "board" && <NewBoardForm workspaceId={workspace.id} />}
          {dialog === "rename" && <RenameWorkspaceForm workspace={workspace} onDone={close} />}
        </DialogContent>
      </Dialog>

      <AlertDialog open={dialog === "delete"} onOpenChange={(open) => !open && close()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {workspace.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Every board, task and comment in this workspace is deleted too. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => startTransition(() => deleteWorkspaceAction(workspace.id))}
            >
              Delete workspace
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function NewBoardForm({ workspaceId }: { workspaceId: string }) {
  const [state, action, pending] = useFormAction(createBoardAction);
  return (
    <form action={action} className="space-y-6">
      <DialogHeader>
        <DialogTitle>New board</DialogTitle>
        <DialogDescription>Starts with Backlog, Todo, In Progress, In Review and Done.</DialogDescription>
      </DialogHeader>
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <FieldGroup>
        <TextField
          name="name"
          label="Board name"
          required
          autoFocus
          defaultValue={state.values?.name}
          errors={state.fieldErrors?.name}
        />
      </FieldGroup>
      <DialogFooter>
        <Button type="submit" disabled={pending}>
          Create board
        </Button>
      </DialogFooter>
    </form>
  );
}

function RenameWorkspaceForm({ workspace, onDone }: { workspace: Pick<Workspace, "id" | "name">; onDone: () => void }) {
  const [state, action, pending] = useFormAction(renameWorkspaceAction, onDone);
  return (
    <form action={action} className="space-y-6">
      <DialogHeader>
        <DialogTitle>Rename workspace</DialogTitle>
        <DialogDescription>Task keys keep their prefix.</DialogDescription>
      </DialogHeader>
      <input type="hidden" name="workspaceId" value={workspace.id} />
      <FieldGroup>
        <TextField
          name="name"
          label="Workspace name"
          required
          autoFocus
          defaultValue={state.values?.name ?? workspace.name}
          errors={state.fieldErrors?.name}
        />
      </FieldGroup>
      <DialogFooter>
        <Button type="submit" disabled={pending}>
          Save
        </Button>
      </DialogFooter>
    </form>
  );
}
