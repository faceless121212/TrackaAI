"use client";

import { Copy, Ellipsis } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { FormError, SelectField } from "@/components/forms/fields";
import { useFormAction } from "@/components/forms/use-form-action";
import { MemberAvatar } from "@/components/tasks/member-avatar";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MAX_INVITES_PER_BATCH, type InviteRole, type Role } from "@/lib/domain";
import type { ActionResult } from "@/lib/forms";
import {
  changeRoleAction,
  inviteMembersAction,
  leaveTeamAction,
  removeMemberAction,
  resendInviteAction,
  revokeInviteAction,
  transferOwnershipAction,
} from "@/server/actions/members";

const ROLE_LABEL: Record<Role, string> = { owner: "Owner", admin: "Admin", member: "Member" };

export type MemberRow = {
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: Role;
  /** Whether the viewer may change this member's role or remove them. */
  manageable: boolean;
};

function useResultAction() {
  const [pending, startTransition] = useTransition();
  function run(action: () => Promise<ActionResult>, success?: string) {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) toast.error(result.error);
      else if (success) toast.success(success);
    });
  }
  return { pending, run };
}

export function MemberList({
  teamSlug,
  members,
  currentUserId,
  assignableRoles,
  canTransfer,
}: {
  teamSlug: string;
  members: MemberRow[];
  currentUserId: string;
  assignableRoles: InviteRole[];
  canTransfer: boolean;
}) {
  const { pending, run } = useResultAction();
  const [confirm, setConfirm] = useState<{ kind: "remove" | "transfer"; member: MemberRow } | null>(null);

  return (
    <>
      <ul aria-busy={pending} className="divide-y rounded-md border">
        {members.map((member) => (
          <li key={member.userId} aria-label={member.name} className="flex items-center gap-3 px-4 py-3 text-sm">
            <MemberAvatar member={member} className="size-8" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">
                {member.name}
                {member.userId === currentUserId && (
                  <span className="text-muted-foreground font-normal"> (you)</span>
                )}
              </p>
              <p className="text-muted-foreground truncate text-xs">{member.email}</p>
            </div>
            {member.manageable ? (
              <Select
                value={member.role}
                onValueChange={(role) =>
                  run(() => changeRoleAction(teamSlug, member.userId, role), `${member.name} is now ${ROLE_LABEL[role as Role].toLowerCase()}`)
                }
              >
                <SelectTrigger size="sm" className="w-28" aria-label={`Role for ${member.name}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {assignableRoles.map((role) => (
                    <SelectItem key={role} value={role}>
                      {ROLE_LABEL[role]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Badge variant="secondary">{ROLE_LABEL[member.role]}</Badge>
            )}
            {(member.manageable || (canTransfer && member.role !== "owner")) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-8" aria-label={`Actions for ${member.name}`}>
                    <Ellipsis />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {canTransfer && member.role !== "owner" && (
                    <DropdownMenuItem onSelect={() => setConfirm({ kind: "transfer", member })}>
                      Make owner
                    </DropdownMenuItem>
                  )}
                  {member.manageable && (
                    <DropdownMenuItem variant="destructive" onSelect={() => setConfirm({ kind: "remove", member })}>
                      Remove from team
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </li>
        ))}
      </ul>

      <AlertDialog open={confirm !== null} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent>
          {confirm?.kind === "remove" && (
            <AlertDialogHeader>
              <AlertDialogTitle>Remove {confirm.member.name}?</AlertDialogTitle>
              <AlertDialogDescription>
                They lose access to this team immediately. Their tasks and comments stay.
              </AlertDialogDescription>
            </AlertDialogHeader>
          )}
          {confirm?.kind === "transfer" && (
            <AlertDialogHeader>
              <AlertDialogTitle>Make {confirm.member.name} the owner?</AlertDialogTitle>
              <AlertDialogDescription>
                A team has exactly one owner. You&apos;ll become an admin, and only the new owner can delete the team or
                transfer it again.
              </AlertDialogDescription>
            </AlertDialogHeader>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant={confirm?.kind === "remove" ? "destructive" : "default"}
              onClick={() => {
                if (!confirm) return;
                const { kind, member } = confirm;
                if (kind === "remove") run(() => removeMemberAction(teamSlug, member.userId), `Removed ${member.name}`);
                else run(() => transferOwnershipAction(teamSlug, member.userId), `${member.name} is now the owner`);
              }}
            >
              {confirm?.kind === "remove" ? "Remove" : "Make owner"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function InviteMembersForm({ teamSlug }: { teamSlug: string }) {
  const [state, action, pending] = useFormAction(inviteMembersAction, () => toast.success("Invites sent"));
  const errors = state.fieldErrors?.emails;
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="teamSlug" value={teamSlug} />
      <Field data-invalid={Boolean(errors)}>
        <FieldLabel htmlFor="emails">Email addresses</FieldLabel>
        <Textarea
          id="emails"
          name="emails"
          rows={3}
          placeholder="ann@example.com, bob@example.com"
          defaultValue={state.ok ? undefined : state.values?.emails}
          aria-invalid={Boolean(errors)}
        />
        <FieldDescription>
          Separate with commas or new lines. Up to {MAX_INVITES_PER_BATCH} at a time.
        </FieldDescription>
        <FieldError>{errors?.[0]}</FieldError>
      </Field>
      <div className="flex items-end gap-2">
        <div className="w-40">
          <SelectField
            name="role"
            label="Role"
            defaultValue={state.ok ? "member" : state.values?.role || "member"}
            options={[
              { value: "member", label: "Member" },
              { value: "admin", label: "Admin" },
            ]}
          />
        </div>
        <Button type="submit" disabled={pending}>
          Send invites
        </Button>
      </div>
      <FormError message={state.formError} />
    </form>
  );
}

export type InviteRow = { id: string; email: string; role: InviteRole; expiresAt: string; link: string };

export function PendingInvites({ invites }: { invites: InviteRow[] }) {
  const { pending, run } = useResultAction();
  if (invites.length === 0) return <p className="text-muted-foreground text-sm">No pending invites.</p>;

  return (
    <ul aria-busy={pending} className="divide-y rounded-md border">
      {invites.map((invite) => (
        <li key={invite.id} aria-label={`Invite for ${invite.email}`} className="flex items-center gap-3 px-4 py-3 text-sm">
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{invite.email}</p>
            <p className="text-muted-foreground text-xs">
              {ROLE_LABEL[invite.role]} · expires{" "}
              <time dateTime={invite.expiresAt} suppressHydrationWarning>
                {new Date(invite.expiresAt).toLocaleDateString()}
              </time>
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            data-invite-link={invite.link}
            onClick={async () => {
              await navigator.clipboard.writeText(invite.link);
              toast.success("Invite link copied");
            }}
          >
            <Copy />
            Copy link
          </Button>
          <Button variant="ghost" size="sm" onClick={() => run(() => resendInviteAction(invite.id), "Invite resent")}>
            Resend
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive"
            onClick={() => run(() => revokeInviteAction(invite.id), "Invite revoked")}
          >
            Revoke
          </Button>
        </li>
      ))}
    </ul>
  );
}

export function LeaveTeamButton({ teamSlug, teamName }: { teamSlug: string; teamName: string }) {
  const { pending, run } = useResultAction();
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" disabled={pending}>
          Leave team
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Leave {teamName}?</AlertDialogTitle>
          <AlertDialogDescription>You&apos;ll need a new invite to come back.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={() => run(() => leaveTeamAction(teamSlug))}>
            Leave team
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
