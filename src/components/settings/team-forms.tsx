"use client";

import { startTransition } from "react";
import { toast } from "sonner";
import { TextField } from "@/components/forms/fields";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { deleteTeamAction, updateTeamAction } from "@/server/actions/team";

export function TeamNameForm({ teamSlug, name }: { teamSlug: string; name: string }) {
  const [state, action, pending] = useFormAction(updateTeamAction, () => toast.success("Team renamed"));
  return (
    <form action={action} className="flex max-w-md items-end gap-2">
      <input type="hidden" name="teamSlug" value={teamSlug} />
      <div className="flex-1">
        <TextField
          name="name"
          label="Team name"
          required
          defaultValue={state.values?.name ?? name}
          errors={state.fieldErrors?.name}
        />
      </div>
      <Button type="submit" disabled={pending}>
        Save
      </Button>
    </form>
  );
}

export function DeleteTeamButton({ teamSlug, name }: { teamSlug: string; name: string }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">Delete team</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {name}?</AlertDialogTitle>
          <AlertDialogDescription>
            Every workspace, board, task, comment, label and invite in this team is deleted, and all members lose
            access. This can&apos;t be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={() => startTransition(() => deleteTeamAction(teamSlug))}>
            Delete team
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
